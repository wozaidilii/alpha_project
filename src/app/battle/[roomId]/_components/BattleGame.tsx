"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getPusherClient, sendPusherEvent } from "~/lib/pusher-client";
import { type HistoricalEvent } from "~/types/event";
import { toHistoricalQuestion } from "~/lib/event-adapters";
import {
  haversineDistance,
  locationScore,
  yearScore,
  calcSpeedMultiplier,
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
import { GameMap } from "~/app/game/_components/GameMap";
import { EventCard } from "~/app/game/_components/EventCard";
import { TimelineSlider } from "~/app/game/_components/TimelineSlider";
import { type PlayerAvatar } from "~/types/player";
import { type CharacterConfig } from "~/types/character";
import { api } from "~/trpc/react";
import { playCountdownTick } from "~/lib/countdown-audio";
import { HPBar } from "./HPBar";
import { BattleRoundResultView } from "./BattleRoundResult";
import { GameOverView } from "./GameOver";

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcGuess(
  event: HistoricalEvent,
  lat: number,
  lng: number,
  year: number,
  roundStartTime: number,
  submittedAt: number,
  timePerRound: number,
): PlayerGuess {
  const distanceKm = haversineDistance(event.lat, event.lng, lat, lng);
  const locPts = locationScore(distanceKm);
  const yrPts = yearScore(event.year, year);
  const speedMult = calcSpeedMultiplier(
    roundStartTime,
    submittedAt,
    timePerRound,
  );
  return {
    lat,
    lng,
    year,
    distanceKm,
    locationPts: locPts,
    yearPts: yrPts,
    speedMultiplier: speedMult,
    total: Math.round((locPts + yrPts) * speedMult),
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

  // ─── state ──────────────────────────────────────────────────────────────────
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
    hostSettings ?? { rounds: 5, timePerRound: 60, startingHp: 100 },
  );
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  // current round guess
  const [guessLat, setGuessLat] = useState<number | null>(null);
  const [guessLng, setGuessLng] = useState<number | null>(null);
  const [guessYear, setGuessYear] = useState(1900);
  const [submitted, setSubmitted] = useState(false);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);

  const [results, setResults] = useState<BattleRoundResult[]>([]);
  const [lobbyError, setLobbyError] = useState("");

  // ─── Refs for always-fresh values inside Pusher callbacks ───────────────────
  // Pusher handlers are set up once (empty deps), so we need refs for anything
  // that changes after mount.
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

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

  // collected guesses this round (host resolves)
  const collectedGuesses = useRef<Record<string, PusherGuessSubmitted>>({});

  // prevent resolveRound being called multiple times per round
  const resolvedRef = useRef(false);
  const lastCountdownTickRef = useRef<number | null>(null);

  // ─── resolve round (host only) ───────────────────────────────────────────────
  function resolveRound() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;

    const roundIdx = currentRoundRef.current;
    const event = eventsRef.current[roundIdx];
    if (!event) return;

    const currentPlayers = playersRef.current;
    const startTime = roundStartTimeRef.current ?? Date.now();
    const tpr = settingsRef.current.timePerRound;

    const guesses: Record<string, PlayerGuess> = {};
    for (const pid of Object.keys(currentPlayers)) {
      const raw = collectedGuesses.current[pid];
      if (raw) {
        guesses[pid] = calcGuess(
          event,
          raw.lat,
          raw.lng,
          raw.year,
          startTime,
          raw.submittedAt,
          tpr,
        );
      } else {
        // didn't submit — 0 pts (submitted at deadline)
        guesses[pid] = calcGuess(
          event,
          0,
          0,
          1900,
          startTime,
          startTime + tpr * 1000,
          tpr,
        );
      }
    }

    // HP
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
      event,
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

  // ─── Pusher subscribe ────────────────────────────────────────────────────────
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
      setEvents(data.events);
      setPlayers(data.players);
    });

    ch.bind("round-started", (data: PusherRoundStarted) => {
      resolvedRef.current = false;
      collectedGuesses.current = {};
      setCurrentRound(data.roundIndex);
      setRoundStartTime(data.startTime);
      setTimeLeft(settingsRef.current.timePerRound);
      setGuessLat(null);
      setGuessLng(null);
      setGuessYear(1900);
      setSubmitted(false);
      setOpponentSubmitted(false);
      setPhase("playing");
    });

    ch.bind("guess-submitted", (data: PusherGuessSubmitted) => {
      if (data.playerId !== myId.current) setOpponentSubmitted(true);
      collectedGuesses.current[data.playerId] = data;

      // host: if all players submitted, resolve immediately
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

  // ─── Announce join (guest only) ──────────────────────────────────────────────
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

  // ─── Timer ───────────────────────────────────────────────────────────────────
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

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async function handleStartGame() {
    try {
      setLobbyError("");
      const gameEvents = await utils.event.random.fetch({
        count: settings.rounds,
      });
      if (gameEvents.length < settings.rounds) {
        setLobbyError("题库题目不足，请先导入更多题目");
        return;
      }

      const initialPlayers: Record<string, BattlePlayer> = {};
      for (const [pid, p] of Object.entries(players)) {
        initialPlayers[pid] = { ...p, hp: settings.startingHp };
      }
      void sendPusherEvent(channel, "game-started", {
        settings,
        events: gameEvents,
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
    if (guessLat === null || guessLng === null || submitted) return;
    setSubmitted(true);
    void sendPusherEvent(channel, "guess-submitted", {
      playerId: myId.current,
      lat: guessLat,
      lng: guessLng,
      year: guessYear,
      submittedAt: Date.now(),
    } satisfies PusherGuessSubmitted);
  }

  function handleNextRound() {
    if (!isHost) return;
    const next = currentRound + 1;
    // Guard: don't start a round past the last one
    if (next >= settings.rounds) return;
    void sendPusherEvent(channel, "round-started", {
      roundIndex: next,
      startTime: Date.now(),
    } satisfies PusherRoundStarted);
  }

  // Called by host on the last round — no Pusher needed, just transition locally.
  // The guest transitions via the game-over Pusher event (already sent by resolveRound).
  function handleViewResults() {
    setPhase("game-over");
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const me = players[myId.current];
  const opponent = Object.values(players).find((p) => p.id !== myId.current);
  const currentEvent = events[currentRound];
  const lastResult = results[results.length - 1];
  const playerList = Object.values(players);

  // ─── Speed multiplier preview ─────────────────────────────────────────────────
  const speedPreview =
    roundStartTime && phase === "playing"
      ? Math.max(
          1,
          2 - (Date.now() - roundStartTime) / 1000 / settings.timePerRound,
        )
      : null;

  // ─── Lobby ───────────────────────────────────────────────────────────────────
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

  // ─── Round result ─────────────────────────────────────────────────────────────
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

  // ─── Game over ───────────────────────────────────────────────────────────────
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

  // ─── Playing ─────────────────────────────────────────────────────────────────
  const timerPct = (timeLeft / settings.timePerRound) * 100;
  const timerColor =
    timerPct > 50
      ? "bg-green-500"
      : timerPct > 20
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-700 px-4 py-2">
        <span className="font-bold text-red-400">⚔️ 对战</span>
        <span className="text-sm text-stone-400">
          第 {currentRound + 1} / {settings.rounds} 轮
        </span>
        <div className="flex items-center gap-3">
          {me && <HPBar player={me} flipped={false} />}
          <span className="text-stone-500">VS</span>
          {opponent && <HPBar player={opponent} flipped={true} />}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 w-full bg-stone-700">
        <div
          className={`h-full transition-all ${timerColor}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      <div className="grid flex-1 grid-cols-[minmax(280px,320px)_minmax(0,1fr)] overflow-hidden">
        {/* Left panel */}
        <div className="flex flex-col gap-3 overflow-y-auto border-r border-stone-700 p-3">
          {/* Timer + speed */}
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

          {/* Opponent status */}
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

          {currentEvent && (
            <EventCard question={toHistoricalQuestion(currentEvent)} />
          )}

          <TimelineSlider
            value={guessYear}
            onChange={(y) => {
              if (!submitted) setGuessYear(y);
            }}
          />

          <button
            onClick={handleSubmitGuess}
            disabled={guessLat === null || submitted}
            className={`rounded-lg py-2.5 font-bold transition ${
              submitted
                ? "bg-green-700 text-green-300"
                : guessLat === null
                  ? "cursor-not-allowed bg-stone-700 text-stone-500"
                  : "bg-red-500 text-white hover:bg-red-400"
            }`}
          >
            {submitted
              ? "✓ 已提交，等待结算…"
              : guessLat === null
                ? "先在地图上选地点"
                : "提交猜测"}
          </button>
        </div>

        {/* Map — pointer-events disabled after submit */}
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
                <div className="text-lg font-bold text-green-300">✓ 已锁定</div>
                <div className="text-sm text-green-400">
                  等待对手或计时结束…
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
