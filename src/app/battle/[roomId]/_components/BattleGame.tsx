"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getPusherClient, sendPusherEvent } from "~/lib/pusher-client";
import { fetchQuestionsByType } from "~/lib/load-questions";
import { getGameMode } from "~/lib/game-mode";
import { getTimelineBounds } from "~/lib/question-utils";
import {
  calcSpeedMultiplier,
  scoreRound,
} from "~/lib/scoring";
import {
  type BattlePhase,
  type BattlePlayer,
  type BattleSettings,
  type PlayerGuess,
  type BattleRoundResult,
  type PusherPlayerJoined,
  type PusherGameStarted,
  type PusherRoundStarted,
  type PusherGuessSubmitted,
  type PusherRoundResults,
  type PusherGameOver,
} from "~/types/battle";
import {
  type GameQuestion,
  getQuestionYearEnd,
  isFunfactQuestion,
  requiresMap,
  requiresQuizAnswer,
} from "~/types/question";
import { GameMap } from "~/app/game/_components/GameMap";
import { EventCard } from "~/app/game/_components/EventCard";
import { TimelineSlider } from "~/app/game/_components/TimelineSlider";
import { QuizPanel } from "~/app/game/_components/QuizPanel";
import { type PlayerAvatar } from "~/types/player";
import { type CharacterConfig } from "~/types/character";
import { api } from "~/trpc/react";
import { playCountdownTick } from "~/lib/countdown-audio";
import { HPBar } from "./HPBar";
import { BattleRoundResultView } from "./BattleRoundResult";
import { GameOverView } from "./GameOver";

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcPlayerGuess(
  question: GameQuestion,
  raw: PusherGuessSubmitted | undefined,
  roundStartTime: number,
  timePerRound: number,
): PlayerGuess {
  const submittedAt = raw?.submittedAt ?? roundStartTime + timePerRound * 1000;
  const speedMult = calcSpeedMultiplier(
    roundStartTime,
    submittedAt,
    timePerRound,
  );

  const needsMap = requiresMap(question);
  const needsQuiz = requiresQuizAnswer(question);

  const score = scoreRound({
    questionType: question.type,
    actualYear: question.year,
    guessedYear: raw?.year ?? 0,
    yearEnd: getQuestionYearEnd(question),
    actualLat: question.type === "historical" ? question.lat : undefined,
    actualLng: question.type === "historical" ? question.lng : undefined,
    guessLat: needsMap ? (raw?.lat ?? 0) : undefined,
    guessLng: needsMap ? (raw?.lng ?? 0) : undefined,
    correctIndex:
      question.type === "funfact" ? question.correctIndex : undefined,
    guessedIndex: needsQuiz ? (raw?.guessIndex ?? undefined) : undefined,
  });

  return {
    lat: raw?.lat ?? 0,
    lng: raw?.lng ?? 0,
    year: raw?.year ?? 0,
    guessIndex: raw?.guessIndex ?? null,
    locationPts: score.locationPts,
    yearPts: score.yearPts,
    quizPts: score.quizPts,
    speedMultiplier: speedMult,
    total: Math.round(score.total * speedMult),
    distanceKm: score.distanceKm ?? 0,
    isCorrect: score.isCorrect,
  };
}

function calcDamage(scoreA: number, scoreB: number): number {
  return Math.floor(Math.abs(scoreA - scoreB) / 500);
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  roomId: string;
  isHost: boolean;
  playerName: string;
  playerUserId?: string;
  playerAvatar: PlayerAvatar;
  playerCharacter?: CharacterConfig;
  hostSettings: BattleSettings | null;
}

const MY_ID_KEY = "histoguessr_player_id";

function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(MY_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(MY_ID_KEY, id);
  }
  return id;
}

export function BattleGame({
  roomId,
  isHost,
  playerName,
  playerUserId,
  playerAvatar,
  playerCharacter,
  hostSettings,
}: Props) {
  const utils = api.useUtils();
  const channel = `game-${roomId}`;
  const myId = useRef(getOrCreatePlayerId());

  const [phase, setPhase] = useState<BattlePhase>("lobby");
  const [players, setPlayers] = useState<Record<string, BattlePlayer>>(() => ({
    [myId.current]: {
      id: myId.current,
      userId: playerUserId,
      name: playerName,
      avatar: playerAvatar,
      character: playerCharacter,
      hp: hostSettings?.startingHp ?? 100,
      isHost,
    },
  }));
  const [settings, setSettings] = useState<BattleSettings>(
    hostSettings ?? {
      rounds: 5,
      timePerRound: 60,
      startingHp: 100,
      questionType: "historical",
    },
  );
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  const [guessLat, setGuessLat] = useState<number | null>(null);
  const [guessLng, setGuessLng] = useState<number | null>(null);
  const [guessYear, setGuessYear] = useState(1900);
  const [guessIndex, setGuessIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);

  const [results, setResults] = useState<BattleRoundResult[]>([]);
  const [lobbyError, setLobbyError] = useState("");

  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const questionsRef = useRef(questions);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const currentRoundRef = useRef(currentRound);
  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  const roundStartTimeRef = useRef(roundStartTime);
  useEffect(() => {
    roundStartTimeRef.current = roundStartTime;
  }, [roundStartTime]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const collectedGuesses = useRef<Record<string, PusherGuessSubmitted>>({});
  const resolvedRef = useRef(false);
  const lastCountdownTickRef = useRef<number | null>(null);

  const gameMode = getGameMode(settings.questionType);
  const currentQuestion = questions[currentRound];
  const needsMap = currentQuestion ? requiresMap(currentQuestion) : false;
  const needsQuiz = currentQuestion ? requiresQuizAnswer(currentQuestion) : false;
  const timelineBounds = currentQuestion
    ? getTimelineBounds(currentQuestion)
    : { minYear: -3000, maxYear: 2026, defaultYear: 1900 };

  function resolveRound() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;

    const roundIdx = currentRoundRef.current;
    const question = questionsRef.current[roundIdx];
    if (!question) return;

    const currentPlayers = playersRef.current;
    const startTime = roundStartTimeRef.current ?? Date.now();
    const tpr = settingsRef.current.timePerRound;

    const guesses: Record<string, PlayerGuess> = {};
    for (const pid of Object.keys(currentPlayers)) {
      guesses[pid] = calcPlayerGuess(
        question,
        collectedGuesses.current[pid],
        startTime,
        tpr,
      );
    }

    const playerIds = Object.keys(currentPlayers);
    const hpAfter: Record<string, number> = {};
    const damage: Record<string, number> = {};
    for (const id of playerIds) {
      hpAfter[id] = currentPlayers[id]!.hp;
      damage[id] = 0;
    }

    if (playerIds.length === 2) {
      const [a, b] = playerIds as [string, string];
      const scoreA = guesses[a]?.total ?? 0;
      const scoreB = guesses[b]?.total ?? 0;
      const dmg = calcDamage(scoreA, scoreB);
      if (scoreA < scoreB) {
        damage[a] = dmg;
        hpAfter[a] = Math.max(0, (hpAfter[a] ?? 0) - dmg);
      } else if (scoreB < scoreA) {
        damage[b] = dmg;
        hpAfter[b] = Math.max(0, (hpAfter[b] ?? 0) - dmg);
      }
    }

    const result: BattleRoundResult = {
      roundIndex: roundIdx,
      question,
      guesses,
      hpAfter,
      damage,
    };
    void sendPusherEvent(channel, "round-results", {
      result,
    } satisfies PusherRoundResults);

    const someOneDead = Object.values(hpAfter).some((hp) => hp <= 0);
    const lastRound = roundIdx >= settingsRef.current.rounds - 1;
    if (someOneDead || lastRound) {
      void sendPusherEvent(channel, "game-over", {
        results: [],
        finalHp: hpAfter,
      } satisfies PusherGameOver);
    }
  }

  useEffect(() => {
    const pusher = getPusherClient();
    const ch = pusher.subscribe(channel);

    ch.bind("player-joined", (data: PusherPlayerJoined) => {
      if (data.playerId === myId.current) return;
      setPlayers((prev) => ({
        ...prev,
        [data.playerId]: {
          id: data.playerId,
          userId: data.userId,
          name: data.name,
          avatar: data.avatar,
          character: data.character,
          hp: hostSettings?.startingHp ?? settingsRef.current.startingHp,
          isHost: false,
        },
      }));
    });

    ch.bind("game-started", (data: PusherGameStarted) => {
      setSettings(data.settings);
      setQuestions(data.questions);
      setPlayers(data.players);
    });

    ch.bind("round-started", (data: PusherRoundStarted) => {
      resolvedRef.current = false;
      collectedGuesses.current = {};
      setCurrentRound(data.roundIndex);
      setRoundStartTime(data.startTime);
      setTimeLeft(settingsRef.current.timePerRound);

      const question = questionsRef.current[data.roundIndex];
      const bounds = question
        ? getTimelineBounds(question)
        : { defaultYear: 1900 };

      setGuessLat(null);
      setGuessLng(null);
      setGuessYear(bounds.defaultYear);
      setGuessIndex(null);
      setSubmitted(false);
      setOpponentSubmitted(false);
      setPhase("playing");
    });

    ch.bind("guess-submitted", (data: PusherGuessSubmitted) => {
      if (data.playerId !== myId.current) setOpponentSubmitted(true);
      collectedGuesses.current[data.playerId] = data;

      if (isHost) {
        const allIn = Object.keys(playersRef.current).every(
          (id) => collectedGuesses.current[id],
        );
        if (allIn) resolveRound();
      }
    });

    ch.bind("round-results", (data: PusherRoundResults) => {
      setResults((prev) => [...prev, data.result]);
      setPlayers((prev) => {
        const next = { ...prev };
        for (const [pid, hp] of Object.entries(data.result.hpAfter)) {
          const existing = next[pid];
          if (existing) next[pid] = { ...existing, hp };
        }
        return next;
      });
      setPhase("round-result");
    });

    ch.bind("game-over", (data: PusherGameOver) => {
      setPlayers((prev) => {
        const next = { ...prev };
        for (const [pid, hp] of Object.entries(data.finalHp)) {
          const existing = next[pid];
          if (existing) next[pid] = { ...existing, hp };
        }
        return next;
      });
      setPhase("game-over");
    });

    return () => {
      ch.unbind_all();
      pusher.unsubscribe(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isHost) return;
    void sendPusherEvent(channel, "player-joined", {
      playerId: myId.current,
      userId: playerUserId,
      name: playerName,
      avatar: playerAvatar,
      character: playerCharacter,
    } satisfies PusherPlayerJoined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "playing" || !roundStartTime) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - roundStartTime) / 1000;
      const remaining = Math.max(0, settingsRef.current.timePerRound - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0 && isHost) {
        clearInterval(interval);
        resolveRound();
      }
    }, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundStartTime]);

  useEffect(() => {
    if (phase !== "playing") {
      lastCountdownTickRef.current = null;
      return;
    }
    if (timeLeft > 10 || timeLeft <= 0) {
      if (timeLeft > 10) lastCountdownTickRef.current = null;
      return;
    }
    if (lastCountdownTickRef.current === timeLeft) return;

    lastCountdownTickRef.current = timeLeft;
    playCountdownTick(timeLeft);
  }, [phase, timeLeft]);

  async function handleStartGame() {
    try {
      setLobbyError("");
      const loaded = await fetchQuestionsByType(
        settings.questionType,
        settings.rounds,
        {
          fetchHistorical: (count) => utils.event.random.fetch({ count }),
          fetchFunfact: (count) => utils.funfact.random.fetch({ count }),
        },
      );
      if (loaded.error || loaded.questions.length < settings.rounds) {
        setLobbyError(loaded.error ?? "题库题目不足");
        return;
      }

      const initialPlayers: Record<string, BattlePlayer> = {};
      for (const [pid, p] of Object.entries(players)) {
        initialPlayers[pid] = { ...p, hp: settings.startingHp };
      }
      void sendPusherEvent(channel, "game-started", {
        settings,
        questions: loaded.questions,
        players: initialPlayers,
      } satisfies PusherGameStarted);

      setTimeout(() => {
        void sendPusherEvent(channel, "round-started", {
          roundIndex: 0,
          startTime: Date.now(),
        } satisfies PusherRoundStarted);
      }, 300);
    } catch {
      setLobbyError("题库加载失败，请检查数据库连接");
    }
  }

  function handleSubmitGuess() {
    if (submitted) return;
    if (needsMap && (guessLat === null || guessLng === null)) return;
    if (needsQuiz && guessIndex === null) return;

    setSubmitted(true);
    void sendPusherEvent(channel, "guess-submitted", {
      playerId: myId.current,
      lat: guessLat ?? 0,
      lng: guessLng ?? 0,
      year: needsQuiz ? 0 : guessYear,
      guessIndex: needsQuiz ? guessIndex : undefined,
      submittedAt: Date.now(),
    } satisfies PusherGuessSubmitted);
  }

  function handleNextRound() {
    if (!isHost) return;
    const next = currentRound + 1;
    if (next >= settings.rounds) return;
    void sendPusherEvent(channel, "round-started", {
      roundIndex: next,
      startTime: Date.now(),
    } satisfies PusherRoundStarted);
  }

  function handleViewResults() {
    setPhase("game-over");
  }

  const me = players[myId.current];
  const opponent = Object.values(players).find((p) => p.id !== myId.current);
  const lastResult = results[results.length - 1];
  const playerList = Object.values(players);

  const speedPreview =
    roundStartTime && phase === "playing"
      ? Math.max(
          1,
          2 - (Date.now() - roundStartTime) / 1000 / settings.timePerRound,
        )
      : null;

  const canSubmit = needsQuiz
    ? guessIndex !== null
    : needsMap
      ? guessLat !== null
      : true;

  const submitLabel = submitted
    ? "✓ 已提交，等待结算…"
    : needsQuiz
      ? guessIndex === null
        ? "请先选择答案"
        : "提交答案"
      : needsMap && guessLat === null
        ? "先在地图上选地点"
        : "提交猜测";

  if (phase === "lobby") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-white">
        <div className="w-full max-w-sm px-4">
          <Link
            href="/battle"
            className="mb-6 inline-block text-sm text-stone-400 hover:text-white"
          >
            ← 返回大厅
          </Link>
          <div className="mb-6 rounded-2xl bg-stone-800 p-6 text-center">
            <div className="mb-1 text-sm text-stone-400">房间号</div>
            <div className="mb-3 font-mono text-5xl font-extrabold tracking-widest text-amber-400">
              {roomId}
            </div>
            <button
              onClick={() => void navigator.clipboard.writeText(roomId)}
              className="text-xs text-stone-500 hover:text-stone-300"
            >
              点击复制
            </button>
          </div>

          <div className="mb-6 space-y-2">
            <div className="text-sm text-stone-400">
              房间人数 ({playerList.length}/2)
            </div>
            {playerList.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-stone-800 px-4 py-2.5"
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-full text-lg"
                  style={{ backgroundColor: p.avatar.color }}
                >
                  {p.avatar.icon}
                </span>
                <span className="font-medium">{p.name}</span>
                {p.isHost && (
                  <span className="ml-auto text-xs text-stone-500">房主</span>
                )}
              </div>
            ))}
            {playerList.length < 2 && (
              <div className="rounded-lg border border-dashed border-stone-700 px-4 py-2.5 text-center text-sm text-stone-500">
                等待对手加入…
              </div>
            )}
          </div>

          {isHost && (
            <div className="mb-4 space-y-1 rounded-xl bg-stone-800 p-4 text-sm text-stone-400">
              <div className="flex justify-between">
                <span>游戏类型</span>
                <span className="text-white">
                  {gameMode?.emoji} {gameMode?.title ?? settings.questionType}
                </span>
              </div>
              <div className="flex justify-between">
                <span>轮数</span>
                <span className="text-white">{settings.rounds}</span>
              </div>
              <div className="flex justify-between">
                <span>每轮时间</span>
                <span className="text-white">{settings.timePerRound}s</span>
              </div>
              <div className="flex justify-between">
                <span>初始血量</span>
                <span className="text-white">{settings.startingHp}</span>
              </div>
            </div>
          )}

          {!isHost && settings.questionType && (
            <div className="mb-4 rounded-xl bg-stone-800 p-4 text-center text-sm text-stone-400">
              等待房主开始 ·{" "}
              <span className="text-white">
                {gameMode?.emoji} {gameMode?.title}
              </span>
            </div>
          )}

          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={playerList.length < 2}
              className="w-full rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {playerList.length < 2 ? "等待对手…" : "开始游戏 ⚔️"}
            </button>
          ) : (
            <p className="text-center text-stone-400">等待房主开始游戏…</p>
          )}
          {lobbyError && (
            <p className="mt-3 text-center text-sm text-red-400">
              {lobbyError}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "round-result" && lastResult) {
    const isLastRound =
      lastResult.roundIndex >= settings.rounds - 1 ||
      Object.values(lastResult.hpAfter).some((hp) => hp <= 0);
    return (
      <BattleRoundResultView
        result={lastResult}
        players={players}
        myId={myId.current}
        isLastRound={isLastRound}
        isHost={isHost}
        onNext={handleNextRound}
        onViewResults={handleViewResults}
      />
    );
  }

  if (phase === "game-over") {
    return (
      <GameOverView
        roomId={roomId}
        players={players}
        results={results}
        myId={myId.current}
      />
    );
  }

  const timerPct = (timeLeft / settings.timePerRound) * 100;
  const timerColor =
    timerPct > 50
      ? "bg-green-500"
      : timerPct > 20
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      <div className="flex items-center justify-between border-b border-stone-700 px-4 py-2">
        <span className="font-bold text-red-400">
          ⚔️ 对战 · {gameMode?.emoji} {gameMode?.title}
        </span>
        <span className="text-sm text-stone-400">
          第 {currentRound + 1} / {settings.rounds} 轮
        </span>
        <div className="flex items-center gap-3">
          {me && <HPBar player={me} flipped={false} />}
          <span className="text-stone-500">VS</span>
          {opponent && <HPBar player={opponent} flipped={true} />}
        </div>
      </div>

      <div className="h-1.5 w-full bg-stone-700">
        <div
          className={`h-full transition-all ${timerColor}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      <div
        className={`grid flex-1 overflow-hidden ${
          needsMap
            ? "grid-cols-[minmax(280px,320px)_minmax(0,1fr)]"
            : "grid-cols-1"
        }`}
      >
        <div
          className={`flex flex-col gap-3 overflow-y-auto border-r border-stone-700 p-3 ${
            needsMap ? "" : "mx-auto w-full max-w-2xl"
          }`}
        >
          <div className="flex items-center justify-between rounded-lg bg-stone-800 px-4 py-2">
            <div>
              <div className="text-sm text-stone-400">剩余时间</div>
              {!submitted && speedPreview && (
                <div className="text-xs text-amber-400">
                  现在提交 ×{speedPreview.toFixed(2)}
                </div>
              )}
            </div>
            <span
              className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}
            >
              {timeLeft}s
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2">
            <span className="text-sm text-stone-400">对手：</span>
            {opponentSubmitted ? (
              <span className="text-sm font-medium text-green-400">
                ✓ 已提交
              </span>
            ) : (
              <span className="text-sm text-stone-500">思考中…</span>
            )}
          </div>

          {currentQuestion && (
            <EventCard key={currentQuestion.id} question={currentQuestion} />
          )}

          {currentQuestion && isFunfactQuestion(currentQuestion) && (
            <QuizPanel
              question={currentQuestion}
              selectedIndex={guessIndex}
              onSelect={(index) => {
                if (!submitted) setGuessIndex(index);
              }}
            />
          )}

          {!needsQuiz && (
            <TimelineSlider
              value={guessYear}
              onChange={(y) => {
                if (!submitted) setGuessYear(y);
              }}
              minYear={timelineBounds.minYear}
              maxYear={timelineBounds.maxYear}
            />
          )}

          <button
            onClick={handleSubmitGuess}
            disabled={!canSubmit || submitted}
            className={`rounded-lg py-2.5 font-bold transition ${
              submitted
                ? "bg-green-700 text-green-300"
                : !canSubmit
                  ? "cursor-not-allowed bg-stone-700 text-stone-500"
                  : "bg-red-500 text-white hover:bg-red-400"
            }`}
          >
            {submitLabel}
          </button>
        </div>

        {needsMap && (
          <div className="relative min-h-0">
            <GameMap
              guessLat={guessLat}
              guessLng={guessLng}
              onGuess={(lat, lng) => {
                if (!submitted) {
                  setGuessLat(lat);
                  setGuessLng(lng);
                }
              }}
            />
            {submitted && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
                <div className="rounded-xl bg-green-800/80 px-6 py-3 text-center backdrop-blur-sm">
                  <div className="text-lg font-bold text-green-300">
                    ✓ 已锁定
                  </div>
                  <div className="text-sm text-green-400">
                    等待对手或计时结束…
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
