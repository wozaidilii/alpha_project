"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getPusherClient, sendPusherEvent } from "~/lib/pusher-client";
import {
  fetchQuestionsByType,
  fetchQuestionsByIds,
} from "~/lib/load-questions";
import { getGameMode, isQuestionType } from "~/lib/game-mode";
import { getTimelineBounds } from "~/lib/question-utils";
import {
  calcSpeedMultiplier,
  haversineDistance,
  locationRoundScore,
  scoreRound,
} from "~/lib/scoring";
import { generateRandomTuxunLocations } from "~/lib/baidu-panorama";
import { generateRandomForeignLocations } from "~/lib/google-street-view";
import { DEFAULT_FOREIGN_COUNTRY } from "~/lib/foreign-map";
import {
  isBaiduStreetViewTuxunLocation,
  isGoogleStreetViewTuxunLocation,
  type TuxunLocation,
} from "~/lib/tuxun-locations";
import {
  buildHistoryTuxunPlayState,
  findHistoryTuxunScene,
  getCachedHistoryTuxunScene,
  HISTORY_TUXUN_CLUE_INTERVAL_SECONDS,
  type HistoryTuxunPlayState,
} from "~/lib/history-tuxun-puzzle";
import {
  getBattleAnswerPoint,
  isForeignBattleQuestion,
  isHistoryTuxunBattleQuestion,
  isLocationOnlyBattleQuestion,
  isStandardBattleQuestion,
  isTuxunBattleQuestion,
} from "~/lib/battle-question";
import {
  type BattlePhase,
  type BattleForeignQuestion,
  type BattlePlayer,
  type BattleQuestion,
  type BattleRoomSnapshot,
  type BattleSettings,
  type BattleTuxunQuestion,
  type BattleHistoryTuxunQuestion,
  type PlayerGuess,
  type BattleRoundResult,
  type PusherPlayerJoined,
  type PusherRoomSettings,
  type PusherRequestRoomSettings,
  type PusherGameStarting,
  type PusherGameStarted,
  type PusherRoundStarted,
  type PusherGuessSubmitted,
  type PusherRoundResults,
  type PusherRoundReady,
  type PusherGameOver,
} from "~/types/battle";
import {
  type GameQuestion,
  getQuestionYearEnd,
  isFunfactQuestion,
  type QuestionType,
} from "~/types/question";
import { GameMap } from "~/app/game/_components/GameMap";
import { EventCard } from "~/app/game/_components/EventCard";
import { TimelineSlider } from "~/app/game/_components/TimelineSlider";
import { QuizPanel } from "~/app/game/_components/QuizPanel";
import { FloatingGuessMap } from "~/app/game/_components/FloatingGuessMap";
import { BaiduPanorama } from "~/app/game/tuxun/_components/BaiduPanorama";
import { BaiduPanoramaView } from "~/app/game/_components/BaiduPanoramaView";
import { GoogleStreetView } from "~/app/game/foreign/_components/GoogleStreetView";
import { type PlayerAvatar } from "~/types/player";
import { type CharacterConfig } from "~/types/character";
import { api } from "~/trpc/react";
import { playCountdownTick } from "~/lib/countdown-audio";
import { HPBar } from "./HPBar";
import { BattleRoundResultView } from "./BattleRoundResult";
import { GameOverView } from "./GameOver";

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildBattleTuxunQuestion(
  location: TuxunLocation,
): BattleTuxunQuestion {
  return {
    id: `tuxun:${location.id}`,
    type: "tuxun",
    title: location.title,
    location,
  };
}

function buildBattleForeignQuestion(
  location: TuxunLocation,
): BattleForeignQuestion {
  return {
    id: `foreign:${location.id}`,
    type: "foreign",
    title: location.title,
    location,
  };
}

function buildBattleHistoryTuxunQuestion(
  playState: HistoryTuxunPlayState,
): BattleHistoryTuxunQuestion {
  return {
    id: `history-tuxun:${playState.puzzleId}`,
    type: "history-tuxun",
    title: playState.answerName,
    playState,
  };
}

function calcStandardPlayerGuess(
  question: GameQuestion,
  modeType: QuestionType,
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

  const needsMap = modeType === "historical";
  const needsQuiz = modeType === "funfact";

  const score = scoreRound({
    questionType: modeType,
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
    elapsedSeconds: Math.max(0, (submittedAt - roundStartTime) / 1000),
    submitted: raw !== undefined,
  };
}

function calcLocationOnlyPlayerGuess(
  question: BattleQuestion,
  raw: PusherGuessSubmitted | undefined,
  roundStartTime: number,
  timePerRound: number,
): PlayerGuess {
  const submittedAt = raw?.submittedAt ?? roundStartTime + timePerRound * 1000;
  const elapsedSeconds = Math.max(0, (submittedAt - roundStartTime) / 1000);
  const answer = getBattleAnswerPoint(question);

  if (!answer || raw === undefined) {
    return {
      lat: raw?.lat ?? 0,
      lng: raw?.lng ?? 0,
      year: 0,
      guessIndex: null,
      locationPts: 0,
      yearPts: 0,
      quizPts: 0,
      speedMultiplier: 1,
      speedCompensationPts: 0,
      elapsedSeconds,
      total: 0,
      distanceKm: 0,
      submitted: false,
    };
  }

  const distanceKm = haversineDistance(
    answer.lat,
    answer.lng,
    raw.lat,
    raw.lng,
  );
  const score = locationRoundScore({
    distanceKm,
    elapsedSeconds,
    speedCompensationWindowSeconds: timePerRound,
  });

  return {
    lat: raw.lat,
    lng: raw.lng,
    year: 0,
    guessIndex: null,
    locationPts: score.distancePts,
    yearPts: 0,
    quizPts: 0,
    speedMultiplier: 1,
    speedCompensationPts: score.speedCompensationPts,
    elapsedSeconds,
    total: score.total,
    distanceKm,
    submitted: true,
  };
}

function calcBattlePlayerGuess(
  question: BattleQuestion,
  modeType: BattleSettings["questionType"],
  raw: PusherGuessSubmitted | undefined,
  roundStartTime: number,
  timePerRound: number,
): PlayerGuess {
  if (isLocationOnlyBattleQuestion(question)) {
    return calcLocationOnlyPlayerGuess(
      question,
      raw,
      roundStartTime,
      timePerRound,
    );
  }
  if (isStandardBattleQuestion(question) && isQuestionType(modeType)) {
    return calcStandardPlayerGuess(
      question,
      modeType,
      raw,
      roundStartTime,
      timePerRound,
    );
  }

  return calcLocationOnlyPlayerGuess(
    question,
    raw,
    roundStartTime,
    timePerRound,
  );
}

function calcDamage(
  scoreA: number,
  scoreB: number,
  modeType: BattleSettings["questionType"],
): number {
  const diff = Math.abs(scoreA - scoreB);
  return modeType === "tuxun" ||
    modeType === "foreign" ||
    modeType === "history-tuxun"
    ? Math.floor(diff / 5)
    : Math.floor(diff / 500);
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
const HISTORY_TUXUN_MAX_MATCH_ATTEMPTS_PER_ROUND = 8;

interface BattleQuestionLoadResult {
  questions: BattleQuestion[];
  questionIds?: string[];
  error?: string;
}

type BattleRoomApiResponse = {
  room?: BattleRoomSnapshot;
  error?: string;
};

function battleRoomUrl(roomId: string) {
  return `/api/battle/rooms/${encodeURIComponent(roomId)}`;
}

async function postBattleRoomAction(
  roomId: string,
  body: Record<string, unknown>,
): Promise<BattleRoomSnapshot | null> {
  const response = await fetch(battleRoomUrl(roomId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as
    | BattleRoomApiResponse
    | { closed?: boolean; snapshot?: BattleRoomSnapshot | null };
  if (!response.ok) {
    const message =
      "error" in payload && payload.error ? payload.error : "房间状态同步失败";
    throw new Error(message);
  }
  if ("room" in payload) return payload.room ?? null;
  if ("snapshot" in payload) return payload.snapshot ?? null;
  return null;
}

async function fetchBattleRoomSnapshot(
  roomId: string,
): Promise<BattleRoomSnapshot | null> {
  const response = await fetch(battleRoomUrl(roomId), { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("房间状态同步失败");
  const payload = (await response.json()) as BattleRoomApiResponse;
  return payload.room ?? null;
}

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
  const { mutateAsync: saveStreetViewScene } =
    api.locationTuxun.saveStreetViewScene.useMutation();
  const { mutateAsync: markStreetViewUnavailable } =
    api.locationTuxun.markStreetViewUnavailable.useMutation();
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
  const [questions, setQuestions] = useState<BattleQuestion[]>([]);
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
  const [streetViewError, setStreetViewError] = useState("");
  const [lobbySynced, setLobbySynced] = useState(isHost);
  const [gameSyncing, setGameSyncing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [roundReady, setRoundReady] = useState<Record<string, boolean>>({});

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
  const roundReadyRef = useRef<Record<string, boolean>>({});
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const gameMode = getGameMode(settings.questionType);
  const currentQuestion = questions[currentRound];
  // 与个人模式一致：整局题型由房间设置决定，而非单题字段
  const needsMap = settings.questionType === "historical";
  const needsQuiz = settings.questionType === "funfact";
  const needsLocationOnlyGuess =
    currentQuestion !== undefined &&
    isLocationOnlyBattleQuestion(currentQuestion);
  const currentStandardQuestion =
    currentQuestion && isStandardBattleQuestion(currentQuestion)
      ? currentQuestion
      : null;
  const timelineBounds = currentStandardQuestion
    ? getTimelineBounds(currentStandardQuestion)
    : { minYear: -3000, maxYear: 2026, defaultYear: 1900 };

  function applyRoomSettings(next: BattleSettings) {
    setSettings(next);
    settingsRef.current = next;
    setLobbySynced(true);
    // 仅在等待大厅中同步初始血量，游戏中不可重置
    if (phaseRef.current !== "lobby") return;

    setPlayers((prev) => {
      const nextPlayers = { ...prev };
      for (const id of Object.keys(nextPlayers)) {
        const player = nextPlayers[id];
        if (player) nextPlayers[id] = { ...player, hp: next.startingHp };
      }
      playersRef.current = nextPlayers;
      return nextPlayers;
    });
  }

  function broadcastRoomSettings() {
    if (!isHost) return;
    void sendPusherEvent(channel, "room-settings", {
      settings: settingsRef.current,
    } satisfies PusherRoomSettings);
  }

  function announcePresence() {
    void sendPusherEvent(channel, "player-joined", {
      playerId: myId.current,
      userId: playerUserId,
      name: playerName,
      avatar: playerAvatar,
      character: playerCharacter,
      isHost,
    } satisfies PusherPlayerJoined);
  }

  function upsertPlayer(data: PusherPlayerJoined) {
    if (data.playerId === myId.current) return;
    setPlayers((prev) => {
      const existing = prev[data.playerId];
      const nextPlayers = {
        ...prev,
        [data.playerId]: {
          id: data.playerId,
          userId: data.userId,
          name: data.name,
          avatar: data.avatar,
          character: data.character,
          hp: existing?.hp ?? settingsRef.current.startingHp,
          isHost: data.isHost ?? false,
        },
      };
      playersRef.current = nextPlayers;
      return nextPlayers;
    });
  }

  function getLocalPlayer(): BattlePlayer {
    const existing = playersRef.current[myId.current];
    return {
      id: myId.current,
      userId: playerUserId,
      name: playerName,
      avatar: playerAvatar,
      character: playerCharacter,
      hp: existing?.hp ?? settingsRef.current.startingHp,
      isHost,
    };
  }

  function applyRoomLobbyState(snapshot: BattleRoomSnapshot) {
    setSettings(snapshot.settings);
    settingsRef.current = snapshot.settings;
    setPlayers(snapshot.players);
    playersRef.current = snapshot.players;
    setLobbySynced(true);
  }

  function applyGameStarted(
    settings: BattleSettings,
    players: Record<string, BattlePlayer>,
    questions: BattleQuestion[],
  ) {
    setSettings(settings);
    setQuestions(questions);
    setPlayers(players);
    settingsRef.current = settings;
    questionsRef.current = questions;
    playersRef.current = players;
  }

  async function handleRemoteGameStarted(data: PusherGameStarted) {
    setLobbyError("");
    setGameSyncing(true);
    try {
      if (data.questions?.length) {
        applyGameStarted(data.settings, data.players, data.questions);
        beginRound(data.roundIndex, data.startTime);
        return;
      }

      if (!isQuestionType(data.settings.questionType) || !data.questionIds) {
        setLobbyError("同步题目失败，请让房主重新开始");
        return;
      }

      const loaded = await fetchQuestionsByIds(
        data.settings.questionType,
        data.questionIds,
        {
          fetchHistoricalByIds: (ids) => utils.event.byIds.fetch({ ids }),
          fetchFunfactByIds: (ids) => utils.funfact.byIds.fetch({ ids }),
        },
      );
      if (loaded.error || loaded.questions.length < data.questionIds.length) {
        setLobbyError(loaded.error ?? "同步题目失败，请让房主重新开始");
        return;
      }

      applyGameStarted(data.settings, data.players, loaded.questions);
      beginRound(data.roundIndex, data.startTime);
    } catch {
      setLobbyError("同步题目失败，请检查网络连接");
    } finally {
      setGameSyncing(false);
    }
  }

  async function applyRoomSnapshot(snapshot: BattleRoomSnapshot) {
    if (snapshot.phase === "closed") return;

    if (snapshot.phase === "lobby" || snapshot.phase === "starting") {
      applyRoomLobbyState(snapshot);
      setGameSyncing(snapshot.phase === "starting");
      if (snapshot.phase === "lobby") setIsStarting(false);
      return;
    }

    if (snapshot.phase !== "playing") return;
    if (phaseRef.current !== "lobby" && questionsRef.current.length > 0) {
      return;
    }

    if (snapshot.roundIndex == null || snapshot.startTime == null) {
      setLobbyError("房间已开局，但题目状态不完整，请重新创建房间");
      return;
    }

    await handleRemoteGameStarted({
      settings: snapshot.settings,
      players: snapshot.players,
      questionIds: snapshot.questionIds,
      questions: snapshot.questions,
      roundIndex: snapshot.roundIndex,
      startTime: snapshot.startTime,
    });
  }

  function beginRound(roundIndex: number, startTime: number) {
    resolvedRef.current = false;
    collectedGuesses.current = {};
    setCurrentRound(roundIndex);
    currentRoundRef.current = roundIndex;
    setRoundStartTime(startTime);
    roundStartTimeRef.current = startTime;
    setTimeLeft(settingsRef.current.timePerRound);

    const question = questionsRef.current[roundIndex];
    const bounds =
      question && isStandardBattleQuestion(question)
        ? getTimelineBounds(question)
        : { defaultYear: 1900 };

    setGuessLat(null);
    setGuessLng(null);
    setGuessYear(bounds.defaultYear);
    setGuessIndex(null);
    setSubmitted(false);
    setOpponentSubmitted(false);
    setStreetViewError("");
    roundReadyRef.current = {};
    setRoundReady({});
    setPhase("playing");
  }

  function handleNextRoundInternal() {
    const next = currentRoundRef.current + 1;
    if (next >= settingsRef.current.rounds) return;
    const startTime = Date.now();
    beginRound(next, startTime);
    void sendPusherEvent(channel, "round-started", {
      roundIndex: next,
      startTime,
    } satisfies PusherRoundStarted);
  }

  function checkAllReadyAndProceed() {
    if (!isHost) return;

    const ids = Object.keys(playersRef.current);
    if (ids.length < 2) return;
    if (!ids.every((id) => roundReadyRef.current[id])) return;

    roundReadyRef.current = {};
    setRoundReady({});

    const roundIdx = currentRoundRef.current;
    const isLastRound =
      roundIdx >= settingsRef.current.rounds - 1 ||
      ids.some((id) => (playersRef.current[id]?.hp ?? 0) <= 0);

    if (isLastRound) {
      const finalHp: Record<string, number> = {};
      for (const id of ids) {
        finalHp[id] = playersRef.current[id]?.hp ?? 0;
      }
      void sendPusherEvent(channel, "game-over", {
        results: [],
        finalHp,
      } satisfies PusherGameOver);
      setPhase("game-over");
      return;
    }

    handleNextRoundInternal();
  }

  function handleRoundReady() {
    const roundIdx = currentRoundRef.current;
    if (roundReadyRef.current[myId.current]) return;

    roundReadyRef.current[myId.current] = true;
    setRoundReady({ ...roundReadyRef.current });
    void sendPusherEvent(channel, "round-ready", {
      playerId: myId.current,
      roundIndex: roundIdx,
    } satisfies PusherRoundReady);

    if (isHost) checkAllReadyAndProceed();
  }

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
    const modeType = settingsRef.current.questionType;
    for (const pid of Object.keys(currentPlayers)) {
      guesses[pid] = calcBattlePlayerGuess(
        question,
        modeType,
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
      const dmg = calcDamage(scoreA, scoreB, modeType);
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
    applyRoundResult(result);
    void sendPusherEvent(channel, "round-results", {
      result,
    } satisfies PusherRoundResults);
  }

  function applyRoundResult(result: BattleRoundResult) {
    setResults((prev) => [...prev, result]);
    setPlayers((prev) => {
      const next = { ...prev };
      for (const [pid, hp] of Object.entries(result.hpAfter)) {
        const existing = next[pid];
        if (existing) next[pid] = { ...existing, hp };
      }
      playersRef.current = next;
      return next;
    });
    roundReadyRef.current = {};
    setRoundReady({});
    setPhase("round-result");
  }

  useEffect(() => {
    const pusher = getPusherClient();
    const ch = pusher.subscribe(channel);

    ch.bind("player-joined", (data: PusherPlayerJoined) => {
      if (phaseRef.current !== "lobby") return;
      if (data.playerId === myId.current) return;
      upsertPlayer(data);
      if (isHost) {
        broadcastRoomSettings();
        announcePresence();
      }
    });

    ch.bind("room-settings", (data: PusherRoomSettings) => {
      applyRoomSettings(data.settings);
    });

    ch.bind("request-room-settings", (data: PusherRequestRoomSettings) => {
      if (!isHost || data.playerId === myId.current) return;
      if (phaseRef.current !== "lobby") return;
      broadcastRoomSettings();
    });

    ch.bind("game-starting", (data: PusherGameStarting) => {
      if (isHost) return;
      applyRoomLobbyState({
        roomId,
        phase: "starting",
        settings: data.settings,
        players: data.players,
        updatedAt: Date.now(),
      });
      setGameSyncing(true);
    });

    ch.bind("game-started", (data: PusherGameStarted) => {
      // 房主已在本地开局，忽略 Pusher 回传
      if (isHost) return;
      void handleRemoteGameStarted(data);
    });

    ch.bind("round-started", (data: PusherRoundStarted) => {
      if (questionsRef.current.length === 0) return;
      beginRound(data.roundIndex, data.startTime);
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
      if (isHost) return;
      const localQuestion =
        questionsRef.current[data.result.roundIndex] ?? data.result.question;
      applyRoundResult({
        ...data.result,
        question: localQuestion,
      });
    });

    ch.bind("round-ready", (data: PusherRoundReady) => {
      if (data.roundIndex !== currentRoundRef.current) return;
      roundReadyRef.current[data.playerId] = true;
      setRoundReady({ ...roundReadyRef.current });
      if (isHost) checkAllReadyAndProceed();
    });

    ch.bind("game-over", (data: PusherGameOver) => {
      setPlayers((prev) => {
        const next = { ...prev };
        for (const [pid, hp] of Object.entries(data.finalHp)) {
          const existing = next[pid];
          if (existing) next[pid] = { ...existing, hp };
        }
        playersRef.current = next;
        return next;
      });
      if (!isHost) setPhase("game-over");
    });

    return () => {
      ch.unbind_all();
      pusher.unsubscribe(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;

    async function joinRoom() {
      try {
        const snapshot = await postBattleRoomAction(roomId, {
          action: "join",
          player: getLocalPlayer(),
          settings: isHost ? settingsRef.current : undefined,
        });
        if (active && snapshot) await applyRoomSnapshot(snapshot);
      } catch (error) {
        if (!active) return;
        setLobbyError(
          error instanceof Error ? error.message : "加入房间状态同步失败",
        );
      }
    }

    void joinRoom();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "lobby") return;
    let active = true;

    async function syncRoom() {
      try {
        const snapshot = await fetchBattleRoomSnapshot(roomId);
        if (active && snapshot) await applyRoomSnapshot(snapshot);
      } catch {
        // Pusher remains the primary live channel; polling is a recovery path.
      }
    }

    void syncRoom();
    const interval = window.setInterval(() => {
      void syncRoom();
    }, 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roomId]);

  useEffect(() => {
    const url = battleRoomUrl(roomId);

    function leaveRoom() {
      const body = JSON.stringify({
        action: "leave",
        playerId: myId.current,
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          url,
          new Blob([body], { type: "application/json" }),
        );
        return;
      }

      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }

    window.addEventListener("pagehide", leaveRoom);
    return () => {
      window.removeEventListener("pagehide", leaveRoom);
      leaveRoom();
    };
  }, [roomId]);

  useEffect(() => {
    if (phase !== "lobby") return;
    if (isHost) broadcastRoomSettings();
    announcePresence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (isHost) return;
    announcePresence();
    void sendPusherEvent(channel, "request-room-settings", {
      playerId: myId.current,
    } satisfies PusherRequestRoomSettings);
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

  async function loadTuxunBattleQuestions(
    count: number,
  ): Promise<BattleQuestionLoadResult> {
    const result = await generateRandomTuxunLocations(count);
    const streetViewLocations = result.locations.filter(
      isBaiduStreetViewTuxunLocation,
    );

    if (streetViewLocations.length < count) {
      return {
        questions: [],
        error:
          result.message ??
          `只匹配到 ${streetViewLocations.length} / ${count} 个百度 JS 街景点，未开始本局；请重新生成。`,
      };
    }

    return {
      questions: streetViewLocations
        .slice(0, count)
        .map(buildBattleTuxunQuestion),
    };
  }

  async function loadForeignBattleQuestions(
    count: number,
  ): Promise<BattleQuestionLoadResult> {
    const result = await generateRandomForeignLocations(
      count,
      DEFAULT_FOREIGN_COUNTRY,
    );
    const streetViewLocations = result.locations.filter(
      isGoogleStreetViewTuxunLocation,
    );

    if (streetViewLocations.length < count) {
      return {
        questions: [],
        error:
          result.message ??
          `只匹配到 ${streetViewLocations.length} / ${count} 个 Google 日本街景点，未开始本局；请重新生成。`,
      };
    }

    return {
      questions: streetViewLocations
        .slice(0, count)
        .map(buildBattleForeignQuestion),
    };
  }

  async function loadHistoryTuxunBattleQuestions(
    count: number,
  ): Promise<BattleQuestionLoadResult> {
    const questions: BattleHistoryTuxunQuestion[] = [];
    const usedLocations = new Set<string>();
    let excludeLocation: string | undefined;
    const maxAttempts = Math.max(
      count * HISTORY_TUXUN_MAX_MATCH_ATTEMPTS_PER_ROUND,
      HISTORY_TUXUN_MAX_MATCH_ATTEMPTS_PER_ROUND,
    );

    for (
      let attempts = 0;
      attempts < maxAttempts && questions.length < count;
      attempts += 1
    ) {
      const puzzle = await utils.locationTuxun.random.fetch({
        excludeLocation,
      });
      if (!puzzle) break;

      excludeLocation = puzzle.location;
      if (usedLocations.has(puzzle.location)) continue;

      const cachedScene = getCachedHistoryTuxunScene(puzzle);
      const scene = cachedScene ?? (await findHistoryTuxunScene(puzzle));
      if (!scene) {
        await markStreetViewUnavailable({ location: puzzle.location }).catch(
          () => undefined,
        );
        continue;
      }

      if (!cachedScene) {
        await saveStreetViewScene({
          location: puzzle.location,
          lat: scene.lat,
          lng: scene.lng,
          ...(scene.panoId ? { panoId: scene.panoId } : {}),
        }).catch(() => undefined);
      }

      usedLocations.add(puzzle.location);
      questions.push(
        buildBattleHistoryTuxunQuestion(
          buildHistoryTuxunPlayState(puzzle, scene),
        ),
      );
    }

    if (questions.length < count) {
      return {
        questions: [],
        error: `只匹配到 ${questions.length} / ${count} 道有百度街景的历史图寻题，未开始本局；请重新开始。`,
      };
    }

    return { questions };
  }

  async function loadBattleQuestions(
    nextSettings: BattleSettings,
  ): Promise<BattleQuestionLoadResult> {
    if (nextSettings.questionType === "tuxun") {
      return loadTuxunBattleQuestions(nextSettings.rounds);
    }

    if (nextSettings.questionType === "foreign") {
      return loadForeignBattleQuestions(nextSettings.rounds);
    }

    if (nextSettings.questionType === "history-tuxun") {
      return loadHistoryTuxunBattleQuestions(nextSettings.rounds);
    }

    if (!isQuestionType(nextSettings.questionType)) {
      return { questions: [], error: "暂不支持该对战模式" };
    }

    const loaded = await fetchQuestionsByType(
      nextSettings.questionType,
      nextSettings.rounds,
      {
        fetchHistorical: (count) => utils.event.random.fetch({ count }),
        fetchFunfact: (count) => utils.funfact.random.fetch({ count }),
      },
    );

    return {
      questions: loaded.questions,
      questionIds: loaded.questions.map((q) => q.id),
      error: loaded.error,
    };
  }

  async function handleStartGame() {
    if (isStarting || playerList.length < 2) return;

    const nextSettings = settingsRef.current;
    const initialPlayers: Record<string, BattlePlayer> = {};
    for (const [pid, p] of Object.entries(playersRef.current)) {
      initialPlayers[pid] = { ...p, hp: nextSettings.startingHp };
    }

    try {
      setIsStarting(true);
      setGameSyncing(true);
      setLobbyError("");

      await postBattleRoomAction(roomId, {
        action: "starting",
        settings: nextSettings,
        players: initialPlayers,
      });
      void sendPusherEvent(channel, "game-starting", {
        settings: nextSettings,
        players: initialPlayers,
      } satisfies PusherGameStarting).catch(() => undefined);

      const loaded = await loadBattleQuestions(nextSettings);
      if (loaded.error || loaded.questions.length < nextSettings.rounds) {
        setLobbyError(loaded.error ?? "题库题目不足");
        setGameSyncing(false);
        setIsStarting(false);
        await postBattleRoomAction(roomId, { action: "cancel-start" }).catch(
          () => undefined,
        );
        return;
      }

      const startTime = Date.now();
      const payload = {
        settings: nextSettings,
        players: initialPlayers,
        questionIds: loaded.questionIds,
        questions: loaded.questionIds ? undefined : loaded.questions,
        roundIndex: 0,
        startTime,
      } satisfies PusherGameStarted;

      await postBattleRoomAction(roomId, {
        action: "started",
        ...payload,
      });
      await sendPusherEvent(channel, "game-started", payload).catch(
        () => undefined,
      );
      applyGameStarted(nextSettings, initialPlayers, loaded.questions);
      beginRound(0, startTime);
    } catch (error) {
      setGameSyncing(false);
      setIsStarting(false);
      await postBattleRoomAction(roomId, { action: "cancel-start" }).catch(
        () => undefined,
      );
      setLobbyError(
        error instanceof Error
          ? error.message
          : "题库加载失败，请检查数据库连接",
      );
    }
  }

  function handleSubmitGuess() {
    if (submitted) return;
    if (
      (needsMap || needsLocationOnlyGuess) &&
      (guessLat === null || guessLng === null)
    ) {
      return;
    }
    if (needsQuiz && guessIndex === null) return;

    setSubmitted(true);
    void sendPusherEvent(channel, "guess-submitted", {
      playerId: myId.current,
      lat: guessLat ?? 0,
      lng: guessLng ?? 0,
      year: needsQuiz || needsLocationOnlyGuess ? 0 : guessYear,
      guessIndex: needsQuiz ? guessIndex : undefined,
      submittedAt: Date.now(),
    } satisfies PusherGuessSubmitted);
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
    : needsMap || needsLocationOnlyGuess
      ? guessLat !== null && guessLng !== null
      : true;

  const submitLabel = submitted
    ? "✓ 已提交，等待结算…"
    : needsQuiz
      ? guessIndex === null
        ? "请先选择答案"
        : "提交答案"
      : (needsMap || needsLocationOnlyGuess) && guessLat === null
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

          {(isHost || lobbySynced) && (
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

          {!isHost && !lobbySynced && (
            <div className="mb-4 rounded-xl bg-stone-800 p-4 text-center text-sm text-stone-400">
              正在同步房间设置…
            </div>
          )}

          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={playerList.length < 2 || isStarting}
              className="w-full rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {playerList.length < 2
                ? "等待对手…"
                : isStarting
                  ? "正在生成题目…"
                  : "开始游戏 ⚔️"}
            </button>
          ) : (
            <p className="text-center text-stone-400">
              {gameSyncing ? "房主正在生成题目，请稍候…" : "等待房主开始游戏…"}
            </p>
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
        questionType={settings.questionType}
        roundReady={roundReady}
        isLastRound={isLastRound}
        onReady={handleRoundReady}
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
  const roundElapsedSeconds = Math.max(0, settings.timePerRound - timeLeft);

  if (
    phase === "playing" &&
    currentQuestion &&
    isLocationOnlyBattleQuestion(currentQuestion)
  ) {
    const visibleHistoryClues = isHistoryTuxunBattleQuestion(currentQuestion)
      ? currentQuestion.playState.clues.slice(
          0,
          Math.min(
            currentQuestion.playState.clues.length,
            Math.floor(
              roundElapsedSeconds / HISTORY_TUXUN_CLUE_INTERVAL_SECONDS,
            ) + 1,
          ),
        )
      : [];
    const nextClueIn =
      isHistoryTuxunBattleQuestion(currentQuestion) &&
      visibleHistoryClues.length < currentQuestion.playState.clues.length
        ? HISTORY_TUXUN_CLUE_INTERVAL_SECONDS -
          (roundElapsedSeconds % HISTORY_TUXUN_CLUE_INTERVAL_SECONDS)
        : null;
    const isForeignQuestion = isForeignBattleQuestion(currentQuestion);

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

        <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
          {isTuxunBattleQuestion(currentQuestion) ? (
            <BaiduPanorama
              key={currentQuestion.id}
              location={currentQuestion.location}
              onUnavailable={() =>
                setStreetViewError("当前百度全景渲染失败，请返回大厅重新开局。")
              }
            />
          ) : isForeignQuestion ? (
            <GoogleStreetView
              key={currentQuestion.id}
              location={currentQuestion.location}
              onUnavailable={() =>
                setStreetViewError(
                  "当前 Google 街景渲染失败，请返回大厅重新开局。",
                )
              }
            />
          ) : (
            <BaiduPanoramaView
              key={currentQuestion.id}
              point={{
                lat: currentQuestion.playState.sceneLat,
                lng: currentQuestion.playState.sceneLng,
              }}
              panoId={currentQuestion.playState.scenePanoId}
              heading={currentQuestion.playState.heading}
              pitch={currentQuestion.playState.pitch}
              onUnavailable={() =>
                setStreetViewError("当前百度全景渲染失败，请返回大厅重新开局。")
              }
            />
          )}

          <aside className="absolute top-4 left-4 z-20 flex w-[min(calc(100vw-2rem),380px)] flex-col gap-3 rounded-xl border border-stone-700 bg-stone-950/85 p-4 shadow-lg shadow-black/30">
            <div className="flex items-center justify-between rounded-lg bg-stone-900 px-3 py-2">
              <div>
                <div className="text-xs text-stone-500">剩余时间</div>
                <div className="text-sm text-amber-300">
                  提交越快，速度补偿越高
                </div>
              </div>
              <span
                className={`text-2xl font-bold ${
                  timeLeft <= 10 ? "text-red-400" : "text-white"
                }`}
              >
                {timeLeft}s
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-stone-900 px-3 py-2">
              <span className="text-sm text-stone-400">对手：</span>
              {opponentSubmitted ? (
                <span className="text-sm font-medium text-green-400">
                  ✓ 已提交
                </span>
              ) : (
                <span className="text-sm text-stone-500">思考中…</span>
              )}
            </div>

            {streetViewError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {streetViewError}
              </div>
            )}

            {isTuxunBattleQuestion(currentQuestion) ? (
              <div className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2">
                <div className="text-sm font-semibold text-sky-200">
                  观察全景，猜它在中国哪里
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-300">
                  从道路、建筑、招牌和地形里找线索，在右下角百度地图中点选位置。
                </p>
              </div>
            ) : isForeignQuestion ? (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
                <div className="text-sm font-semibold text-emerald-200">
                  观察街景，猜它在日本哪里
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-300">
                  从道路、建筑、招牌和地形里找线索，在右下角 Google
                  地图中点选位置。
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-amber-200">
                  <span>历史线索</span>
                  {nextClueIn ? (
                    <span className="text-xs text-amber-100/70">
                      下一条 {nextClueIn}s
                    </span>
                  ) : (
                    <span className="text-xs text-amber-100/70">
                      已全部给出
                    </span>
                  )}
                </div>
                <ol className="mt-3 space-y-2">
                  {visibleHistoryClues.map((clue, index) => (
                    <li
                      key={`${currentQuestion.id}-${index}`}
                      className="text-sm leading-6 text-stone-200"
                    >
                      <span className="mr-2 font-mono text-amber-300">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {clue}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>

          <FloatingGuessMap
            guessLat={guessLat}
            guessLng={guessLng}
            onGuess={(lat, lng) => {
              if (!submitted) {
                setGuessLat(lat);
                setGuessLng(lng);
              }
            }}
            onSubmit={handleSubmitGuess}
            disabled={!canSubmit || submitted}
            submitLabel={submitLabel}
            title={
              isTuxunBattleQuestion(currentQuestion)
                ? "图寻猜点"
                : isForeignQuestion
                  ? "日本地图猜点"
                  : "历史图寻猜点"
            }
            mapProvider={isForeignQuestion ? "google" : "baidu"}
            country={DEFAULT_FOREIGN_COUNTRY}
          />

          {submitted && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/20">
              <div className="rounded-xl bg-green-800/85 px-6 py-3 text-center shadow-lg shadow-black/30 backdrop-blur-sm">
                <div className="text-lg font-bold text-green-200">✓ 已锁定</div>
                <div className="text-sm text-green-100/80">
                  等待对手或计时结束…
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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

          {currentStandardQuestion && (
            <EventCard
              key={currentStandardQuestion.id}
              question={currentStandardQuestion}
            />
          )}

          {needsQuiz &&
            currentStandardQuestion &&
            isFunfactQuestion(currentStandardQuestion) && (
              <QuizPanel
                question={currentStandardQuestion}
                selectedIndex={guessIndex}
                onSelect={(index) => {
                  if (!submitted) setGuessIndex(index);
                }}
              />
            )}

          {needsMap && (
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
