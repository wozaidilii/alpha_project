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
import { generateRandomForeignLocations } from "~/lib/google-street-view";
import { DEFAULT_FOREIGN_COUNTRY } from "~/lib/foreign-map";
import {
  isGoogleStreetViewTuxunLocation,
  type TuxunLocation,
} from "~/lib/tuxun-locations";
import {
  ANIME_TUXUN_CLUE_INTERVAL_SECONDS,
  buildAnimeTuxunPlayState,
  findAnimeTuxunScene,
  getCachedAnimeTuxunScene,
  type AnimeTuxunPlayState,
} from "~/lib/anime-tuxun-puzzle";
import {
  ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER,
  ANIME_GUESSR_PLACEHOLDER_IMAGE_URL,
  buildAnimeGuessrImageUrl,
  fetchAnimeGuessrQuestions,
  getAnimeGuessrQuestionText,
  pickAnimeGuessrQuestions,
  toAnimeStreetViewLocation,
  type AnimeGuessrQuestion,
} from "~/lib/anime-guessr";
import {
  getBattleAnswerPoint,
  isAnimeBattleQuestion,
  isAnimeTuxunBattleQuestion,
  isForeignBattleQuestion,
  isLocationOnlyBattleQuestion,
  isStandardBattleQuestion,
} from "~/lib/battle-question";
import {
  BATTLE_MAX_PLAYERS,
  type BattlePhase,
  type BattleRoundStatus,
  type BattleAnimeQuestion,
  type BattleForeignQuestion,
  type BattleAnimeTuxunQuestion,
  type BattlePlayer,
  type BattleQuestion,
  type BattleRoomSnapshot,
  type BattleSettings,
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
import { GoogleStreetView } from "~/app/game/foreign/_components/GoogleStreetView";
import { redactAnswerTerms } from "~/lib/anime-clue-redaction";
import { type PlayerAvatar } from "~/types/player";
import { type CharacterConfig } from "~/types/character";
import { api } from "~/trpc/react";
import { playCountdownTick } from "~/lib/countdown-audio";
import { HPBar } from "./HPBar";
import { BattleRoundResultView } from "./BattleRoundResult";
import { GameOverView } from "./GameOver";
import { type AnimeLocale, withAnimeLocale } from "~/lib/anime-locale";
import { getBattleCopy, getBattleModeText } from "~/lib/battle-copy";
import {
  getBattleSubmittedPlayers,
  mergeBattleSubmittedGuesses,
} from "~/lib/battle-room-sync";
import { getGoogleGuessMapLabels } from "~/lib/google-guess-map-labels";
import { calcBattleDamage } from "~/lib/battle-scoring";
import {
  areBattlePlayersReady,
  isBattleFinalRound,
  shouldFinishBattleFromResult,
} from "~/lib/battle-flow";

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function buildBattleAnimeTuxunQuestion(
  playState: AnimeTuxunPlayState,
): BattleAnimeTuxunQuestion {
  return {
    id: `anime-tuxun:${playState.puzzleId}`,
    type: "anime-tuxun",
    title: playState.answerName,
    playState,
  };
}

function buildBattleAnimeQuestion(
  question: AnimeGuessrQuestion,
): BattleAnimeQuestion {
  return {
    id: `anime:${question.id}`,
    type: "anime",
    title: question.answerName,
    question,
  };
}

function toAnimeTuxunBattleStreetViewLocation(
  question: BattleAnimeTuxunQuestion,
): TuxunLocation {
  const { playState } = question;
  return {
    id: `${playState.puzzleId}:${playState.scenePanoId ?? `${playState.sceneLat}-${playState.sceneLng}`}`,
    title: playState.answerName,
    province: "日本",
    city: playState.answerName,
    lat: playState.sceneLat,
    lng: playState.sceneLng,
    panoId: playState.scenePanoId,
    heading: playState.heading,
    pitch: playState.pitch,
    source: "google-random",
    hint: playState.answerContext,
  };
}

function BattleAnimeClueImage({
  question,
  alt,
}: {
  question: AnimeGuessrQuestion;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = buildAnimeGuessrImageUrl(question.imagePath);
  const displayImageUrl =
    !imageUrl || failed ? ANIME_GUESSR_PLACEHOLDER_IMAGE_URL : imageUrl;

  useEffect(() => {
    setFailed(false);
  }, [question.id]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displayImageUrl}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
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

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  roomId: string;
  isHost: boolean;
  playerName: string;
  playerUserId?: string;
  playerAvatar: PlayerAvatar;
  playerCharacter?: CharacterConfig;
  hostSettings: BattleSettings | null;
  locale: AnimeLocale;
}

const MY_ID_KEY = "histoguessr_player_id";
const ANIME_TUXUN_MAX_MATCH_ATTEMPTS_PER_ROUND = 12;
const ROUND_STATUS_ORDER: Record<BattleRoundStatus, number> = {
  playing: 1,
  "round-result": 2,
  "game-over": 3,
};

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
      "error" in payload && payload.error
        ? payload.error
        : getBattleCopy("en").roomSyncFailed;
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
  if (!response.ok) throw new Error(getBattleCopy("en").roomSyncFailed);
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
  locale,
}: Props) {
  const utils = api.useUtils();
  const { mutateAsync: saveAnimeStreetViewScene } =
    api.animeTuxun.saveStreetViewScene.useMutation();
  const { mutateAsync: markAnimeStreetViewUnavailable } =
    api.animeTuxun.markStreetViewUnavailable.useMutation();
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
      timePerRound: 120,
      startingHp: 100,
      questionType: "anime",
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
  const [submittedPlayers, setSubmittedPlayers] = useState<
    Record<string, boolean>
  >({});

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
  const resultsRef = useRef<BattleRoundResult[]>([]);
  const resolvedRef = useRef(false);
  const gameOverRequestedRef = useRef(false);
  const lastCountdownTickRef = useRef<number | null>(null);
  const roundReadyRef = useRef<Record<string, boolean>>({});
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const copy = getBattleCopy(locale);
  const googleMapLabels = getGoogleGuessMapLabels(locale);
  const gameMode = getGameMode(settings.questionType);
  const gameModeText = gameMode ? getBattleModeText(gameMode, locale) : null;
  const battleLobbyUrl = withAnimeLocale("/battle", locale);
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

  function syncSubmittedPlayers(
    guesses: Record<string, PusherGuessSubmitted> | undefined,
  ) {
    const mergedGuesses = mergeBattleSubmittedGuesses(
      collectedGuesses.current,
      guesses,
      currentRoundRef.current,
    );
    collectedGuesses.current = mergedGuesses;
    setSubmittedPlayers(getBattleSubmittedPlayers(mergedGuesses));
    setSubmitted(Boolean(mergedGuesses[myId.current]));
  }

  function replaceResults(nextResults: BattleRoundResult[] | undefined) {
    const safeResults = nextResults ?? [];
    resultsRef.current = safeResults;
    setResults(safeResults);
  }

  function upsertLocalRoundResult(result: BattleRoundResult) {
    const nextResults = [...resultsRef.current];
    const existingIndex = nextResults.findIndex(
      (entry) => entry.roundIndex === result.roundIndex,
    );
    if (existingIndex >= 0) {
      nextResults[existingIndex] = result;
    } else {
      nextResults.push(result);
    }
    nextResults.sort((a, b) => a.roundIndex - b.roundIndex);
    replaceResults(nextResults);
  }

  function syncRoomPlayState(snapshot: BattleRoomSnapshot) {
    setSettings(snapshot.settings);
    settingsRef.current = snapshot.settings;
    setPlayers(snapshot.players);
    playersRef.current = snapshot.players;
    replaceResults(snapshot.results);
    roundReadyRef.current = snapshot.roundReady ?? {};
    setRoundReady({ ...roundReadyRef.current });
    syncSubmittedPlayers(snapshot.guesses);

    if (snapshot.finalHp) {
      setPlayers((prev) => {
        const next = { ...prev };
        for (const [pid, hp] of Object.entries(snapshot.finalHp ?? {})) {
          const existing = next[pid];
          if (existing) next[pid] = { ...existing, hp };
        }
        playersRef.current = next;
        return next;
      });
    }
  }

  function getLocalRoundStatus(): BattleRoundStatus | null {
    if (phaseRef.current === "playing") return "playing";
    if (phaseRef.current === "round-result") return "round-result";
    if (phaseRef.current === "game-over") return "game-over";
    return null;
  }

  function isStaleRoomSnapshot(snapshot: BattleRoomSnapshot) {
    if (snapshot.phase !== "playing" || snapshot.roundIndex == null) {
      return false;
    }
    if (phaseRef.current === "lobby" && questionsRef.current.length === 0) {
      return false;
    }

    const currentRoundIndex = currentRoundRef.current;
    if (snapshot.roundIndex < currentRoundIndex) return true;
    if (snapshot.roundIndex > currentRoundIndex) return false;

    const localStatus = getLocalRoundStatus();
    if (!localStatus) return false;
    const snapshotStatus = snapshot.roundStatus ?? "playing";
    return ROUND_STATUS_ORDER[snapshotStatus] < ROUND_STATUS_ORDER[localStatus];
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
        setLobbyError(copy.syncQuestionFailedRestart);
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
        setLobbyError(loaded.error ?? copy.syncQuestionFailedRestart);
        return;
      }

      applyGameStarted(data.settings, data.players, loaded.questions);
      beginRound(data.roundIndex, data.startTime);
    } catch {
      setLobbyError(copy.syncQuestionFailedNetwork);
    } finally {
      setGameSyncing(false);
    }
  }

  async function applyRoomSnapshot(snapshot: BattleRoomSnapshot) {
    if (snapshot.phase === "closed") return;
    if (isStaleRoomSnapshot(snapshot)) return;

    if (snapshot.phase === "lobby" || snapshot.phase === "starting") {
      applyRoomLobbyState(snapshot);
      setGameSyncing(snapshot.phase === "starting");
      if (snapshot.phase === "lobby") setIsStarting(false);
      return;
    }

    if (snapshot.phase !== "playing") return;

    if (snapshot.roundIndex == null || snapshot.startTime == null) {
      setLobbyError(copy.incompleteRoomState);
      return;
    }

    if (questionsRef.current.length === 0) {
      await handleRemoteGameStarted({
        settings: snapshot.settings,
        players: snapshot.players,
        questionIds: snapshot.questionIds,
        questions: snapshot.questions,
        roundIndex: snapshot.roundIndex,
        startTime: snapshot.startTime,
      });
    }

    syncRoomPlayState(snapshot);

    if (snapshot.roundStatus === "game-over") {
      gameOverRequestedRef.current = true;
      setPhase("game-over");
      return;
    }

    if (snapshot.roundStatus === "round-result") {
      const result = snapshot.results?.find(
        (entry) => entry.roundIndex === snapshot.roundIndex,
      );
      if (result) {
        upsertLocalRoundResult(result);
        setPhase("round-result");
        checkAllReadyAndProceed();
      }
      return;
    }

    if (
      phaseRef.current !== "playing" ||
      currentRoundRef.current !== snapshot.roundIndex
    ) {
      beginRound(snapshot.roundIndex, snapshot.startTime);
      syncSubmittedPlayers(snapshot.guesses);
      return;
    }

    setRoundStartTime(snapshot.startTime);
    roundStartTimeRef.current = snapshot.startTime;
  }

  function beginRound(roundIndex: number, startTime: number) {
    resolvedRef.current = false;
    gameOverRequestedRef.current = false;
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
    setSubmittedPlayers({});
    setStreetViewError("");
    roundReadyRef.current = {};
    setRoundReady({});
    setPhase("playing");
  }

  async function handleNextRoundInternal() {
    const next = currentRoundRef.current + 1;
    if (next >= settingsRef.current.rounds) return;
    const startTime = Date.now();
    const snapshot = await postBattleRoomAction(roomId, {
      action: "round-started",
      roundIndex: next,
      startTime,
    }).catch(() => null);
    if (snapshot) {
      await applyRoomSnapshot(snapshot);
    } else {
      beginRound(next, startTime);
    }
    void sendPusherEvent(channel, "round-started", {
      roundIndex: next,
      startTime,
    } satisfies PusherRoundStarted);
  }

  function requestGameOver() {
    if (gameOverRequestedRef.current) return;
    gameOverRequestedRef.current = true;

    const ids = Object.keys(playersRef.current);
    const finalHp: Record<string, number> = {};
    for (const id of ids) {
      finalHp[id] = playersRef.current[id]?.hp ?? 0;
    }

    const finalResults = resultsRef.current;
    void postBattleRoomAction(roomId, {
      action: "game-over",
      results: finalResults,
      finalHp,
    })
      .then((snapshot) => {
        if (snapshot) void applyRoomSnapshot(snapshot);
      })
      .catch(() => undefined);
    void sendPusherEvent(channel, "game-over", {
      results: finalResults,
      finalHp,
    } satisfies PusherGameOver);
    setPhase("game-over");
  }

  function checkAllReadyAndProceed() {
    if (
      shouldFinishBattleFromResult({
        roundIndex: currentRoundRef.current,
        settings: settingsRef.current,
        players: playersRef.current,
        roundReady: roundReadyRef.current,
      })
    ) {
      requestGameOver();
      return;
    }

    if (!areBattlePlayersReady(playersRef.current, roundReadyRef.current)) {
      return;
    }

    if (!isHost) return;

    roundReadyRef.current = {};
    setRoundReady({});

    void handleNextRoundInternal();
  }

  function handleRoundReady() {
    const roundIdx = currentRoundRef.current;
    if (roundReadyRef.current[myId.current]) return;

    roundReadyRef.current[myId.current] = true;
    setRoundReady({ ...roundReadyRef.current });
    void postBattleRoomAction(roomId, {
      action: "round-ready",
      playerId: myId.current,
      roundIndex: roundIdx,
    })
      .then((snapshot) => {
        if (snapshot) void applyRoomSnapshot(snapshot);
      })
      .catch(() => undefined);
    void sendPusherEvent(channel, "round-ready", {
      playerId: myId.current,
      roundIndex: roundIdx,
    } satisfies PusherRoundReady);

    checkAllReadyAndProceed();
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

    if (playerIds.length >= 2) {
      const topScore = Math.max(
        ...playerIds.map((id) => guesses[id]?.total ?? 0),
      );
      for (const id of playerIds) {
        const score = guesses[id]?.total ?? 0;
        if (score >= topScore) continue;
        const dmg = calcBattleDamage(topScore, score, modeType);
        damage[id] = dmg;
        hpAfter[id] = Math.max(0, (hpAfter[id] ?? 0) - dmg);
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
    checkAllReadyAndProceed();
    void postBattleRoomAction(roomId, {
      action: "round-result",
      result,
    })
      .then((snapshot) => {
        if (snapshot) void applyRoomSnapshot(snapshot);
      })
      .catch(() => undefined);
    void sendPusherEvent(channel, "round-results", {
      result,
    } satisfies PusherRoundResults);
  }

  function applyRoundResult(result: BattleRoundResult) {
    upsertLocalRoundResult(result);
    const nextPlayers = { ...playersRef.current };
    for (const [pid, hp] of Object.entries(result.hpAfter)) {
      const existing = nextPlayers[pid];
      if (existing) nextPlayers[pid] = { ...existing, hp };
    }
    playersRef.current = nextPlayers;
    setPlayers(nextPlayers);
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
      if (phaseRef.current !== "lobby") return;
      void handleRemoteGameStarted(data);
    });

    ch.bind("round-started", (data: PusherRoundStarted) => {
      if (questionsRef.current.length === 0) return;
      const currentRoundIndex = currentRoundRef.current;
      if (data.roundIndex <= currentRoundIndex) return;
      beginRound(data.roundIndex, data.startTime);
    });

    ch.bind("guess-submitted", (data: PusherGuessSubmitted) => {
      if (data.roundIndex !== currentRoundRef.current) return;
      setSubmittedPlayers((prev) => ({ ...prev, [data.playerId]: true }));
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
      if (data.result.roundIndex !== currentRoundRef.current) return;
      if (phaseRef.current !== "playing") return;
      const localQuestion =
        questionsRef.current[data.result.roundIndex] ?? data.result.question;
      applyRoundResult({
        ...data.result,
        question: localQuestion,
      });
      checkAllReadyAndProceed();
    });

    ch.bind("round-ready", (data: PusherRoundReady) => {
      if (data.roundIndex !== currentRoundRef.current) return;
      roundReadyRef.current[data.playerId] = true;
      setRoundReady({ ...roundReadyRef.current });
      checkAllReadyAndProceed();
    });

    ch.bind("game-over", (data: PusherGameOver) => {
      gameOverRequestedRef.current = true;
      if (data.results.length > 0) replaceResults(data.results);
      setPlayers((prev) => {
        const next = { ...prev };
        for (const [pid, hp] of Object.entries(data.finalHp)) {
          const existing = next[pid];
          if (existing) next[pid] = { ...existing, hp };
        }
        playersRef.current = next;
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
          error instanceof Error ? error.message : copy.joinRoomSyncFailed,
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
  }, [roomId]);

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
    if (!isHost || phase !== "playing") return;
    const ids = Object.keys(playersRef.current);
    if (ids.length < 2) return;
    if (ids.every((id) => collectedGuesses.current[id])) resolveRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, submittedPlayers]);

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
          copy.insufficientGoogleScenes(streetViewLocations.length, count),
      };
    }

    return {
      questions: streetViewLocations
        .slice(0, count)
        .map(buildBattleForeignQuestion),
    };
  }

  async function loadAnimeBattleQuestions(
    count: number,
  ): Promise<BattleQuestionLoadResult> {
    const questions = await fetchAnimeGuessrQuestions();
    const picked = pickAnimeGuessrQuestions(
      questions,
      count,
      ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER,
    );

    if (picked.length < count) {
      return {
        questions: [],
        error: copy.insufficientQuestions,
      };
    }

    return {
      questions: picked.map(buildBattleAnimeQuestion),
    };
  }

  async function loadAnimeTuxunBattleQuestions(
    count: number,
  ): Promise<BattleQuestionLoadResult> {
    const questions: BattleAnimeTuxunQuestion[] = [];
    const usedLocations = new Set<string>();
    let excludeLocation: string | undefined;
    const maxAttempts = Math.max(
      count * ANIME_TUXUN_MAX_MATCH_ATTEMPTS_PER_ROUND,
      ANIME_TUXUN_MAX_MATCH_ATTEMPTS_PER_ROUND,
    );

    for (
      let attempts = 0;
      attempts < maxAttempts && questions.length < count;
      attempts += 1
    ) {
      const puzzle = await utils.animeTuxun.random.fetch({
        excludeLocation,
      });
      if (!puzzle) break;

      excludeLocation = puzzle.location;
      if (usedLocations.has(puzzle.location)) continue;

      const cachedScene = getCachedAnimeTuxunScene(puzzle);
      const scene = cachedScene ?? (await findAnimeTuxunScene(puzzle));
      if (!scene) {
        await markAnimeStreetViewUnavailable({
          location: puzzle.location,
        }).catch(() => undefined);
        continue;
      }

      if (!cachedScene) {
        await saveAnimeStreetViewScene({
          location: puzzle.location,
          lat: scene.lat,
          lng: scene.lng,
          ...(scene.panoId ? { panoId: scene.panoId } : {}),
        }).catch(() => undefined);
      }

      usedLocations.add(puzzle.location);
      questions.push(
        buildBattleAnimeTuxunQuestion(buildAnimeTuxunPlayState(puzzle, scene)),
      );
    }

    if (questions.length < count) {
      return {
        questions: [],
        error: copy.insufficientAnimeScenes(questions.length, count),
      };
    }

    return { questions };
  }

  async function loadBattleQuestions(
    nextSettings: BattleSettings,
  ): Promise<BattleQuestionLoadResult> {
    if (nextSettings.questionType === "anime") {
      return loadAnimeBattleQuestions(nextSettings.rounds);
    }

    if (nextSettings.questionType === "foreign") {
      return loadForeignBattleQuestions(nextSettings.rounds);
    }

    if (nextSettings.questionType === "anime-tuxun") {
      return loadAnimeTuxunBattleQuestions(nextSettings.rounds);
    }

    if (!isQuestionType(nextSettings.questionType)) {
      return { questions: [], error: copy.unsupportedMode };
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
        setLobbyError(loaded.error ?? copy.insufficientQuestions);
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
        error instanceof Error ? error.message : copy.questionLoadFailed,
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

    const guess = {
      playerId: myId.current,
      roundIndex: currentRoundRef.current,
      lat: guessLat ?? 0,
      lng: guessLng ?? 0,
      year: needsQuiz || needsLocationOnlyGuess ? 0 : guessYear,
      guessIndex: needsQuiz ? guessIndex : undefined,
      submittedAt: Date.now(),
    } satisfies PusherGuessSubmitted;

    setSubmitted(true);
    collectedGuesses.current[myId.current] = guess;
    setSubmittedPlayers((prev) => ({ ...prev, [myId.current]: true }));
    void postBattleRoomAction(roomId, {
      action: "submit-guess",
      guess,
    })
      .then((snapshot) => {
        if (snapshot) void applyRoomSnapshot(snapshot);
      })
      .catch(() => undefined);
    void sendPusherEvent(channel, "guess-submitted", guess);

    if (isHost) {
      const allIn = Object.keys(playersRef.current).every(
        (id) => collectedGuesses.current[id],
      );
      if (allIn) resolveRound();
    }
  }

  const lastResult = results[results.length - 1];
  const playerList = Object.values(players);
  const submittedCount = Object.keys(submittedPlayers).length;
  const submittedSummary = copy.submittedSummary(
    submittedCount,
    playerList.length,
  );

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
    ? `✓ ${copy.submitted}`
    : needsQuiz
      ? guessIndex === null
        ? copy.selectAnswerFirst
        : copy.submitAnswer
      : (needsMap || needsLocationOnlyGuess) && guessLat === null
        ? copy.selectMapFirst
        : copy.submitGuess;

  function renderBattleHeader() {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0d081a]/90 px-4 py-3 backdrop-blur">
          <div>
            <div className="text-sm font-bold text-pink-100">
              {copy.battlePrefix} · {gameMode?.emoji} {gameModeText?.title}
            </div>
            <div className="text-xs text-pink-100/55">
              {copy.roundCount(currentRound + 1, settings.rounds)} ·{" "}
              {submittedSummary}
            </div>
          </div>
          <div className="flex max-w-full flex-wrap justify-end gap-2">
            {playerList.map((player) => (
              <HPBar
                key={player.id}
                player={player}
                flipped={false}
                isMe={player.id === myId.current}
                submitted={submittedPlayers[player.id] === true}
              />
            ))}
          </div>
        </div>

        <div className="h-1.5 w-full bg-white/10">
          <div
            className={`h-full transition-all ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      </>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="anime-shell flex min-h-screen flex-col items-center justify-center px-4 py-10 text-white">
        <div className="w-full max-w-2xl">
          <Link
            href={battleLobbyUrl}
            className="mb-6 inline-block text-sm text-pink-100/70 hover:text-pink-50"
          >
            ← {copy.backLobby}
          </Link>
          <div className="anime-panel mb-6 p-6 text-center">
            <div className="mb-1 text-sm text-pink-100/60">{copy.roomCode}</div>
            <div className="mb-3 font-mono text-5xl font-extrabold tracking-widest text-cyan-100">
              {roomId}
            </div>
            <button
              onClick={() => void navigator.clipboard.writeText(roomId)}
              className="text-xs text-pink-100/55 hover:text-pink-50"
            >
              {copy.copyRoom}
            </button>
          </div>

          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm text-pink-100/65">
              <span>{copy.players}</span>
              <span>
                {playerList.length} / {BATTLE_MAX_PLAYERS}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {playerList.map((p) => (
                <div
                  key={p.id}
                  className="anime-panel flex items-center gap-3 rounded-xl px-4 py-3"
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full text-lg"
                    style={{ backgroundColor: p.avatar.color }}
                  >
                    {p.avatar.icon}
                  </span>
                  <span className="font-medium text-pink-50">{p.name}</span>
                  {p.isHost && (
                    <span className="anime-chip ml-auto">{copy.host}</span>
                  )}
                </div>
              ))}
            </div>
            {playerList.length < 2 && (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-center text-sm text-pink-100/55">
                {copy.minPlayersHint}
              </div>
            )}
          </div>

          {(isHost || lobbySynced) && (
            <div className="anime-panel mb-4 space-y-1 p-4 text-sm text-pink-100/65">
              <div className="flex justify-between">
                <span>{copy.gameType}</span>
                <span className="text-pink-50">
                  {gameMode?.emoji}{" "}
                  {gameModeText?.title ?? settings.questionType}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{copy.rounds}</span>
                <span className="text-pink-50">{settings.rounds}</span>
              </div>
              <div className="flex justify-between">
                <span>{copy.timePerRound}</span>
                <span className="text-pink-50">{settings.timePerRound}s</span>
              </div>
              <div className="flex justify-between">
                <span>{copy.startingHp}</span>
                <span className="text-pink-50">{settings.startingHp}</span>
              </div>
            </div>
          )}

          {!isHost && !lobbySynced && (
            <div className="anime-panel mb-4 p-4 text-center text-sm text-pink-100/65">
              {copy.syncingSettings}
            </div>
          )}

          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={playerList.length < 2 || isStarting}
              className="anime-button w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {playerList.length < 2
                ? copy.waitPlayers
                : isStarting
                  ? copy.generatingQuestions
                  : copy.startBattle}
            </button>
          ) : (
            <p className="text-center text-pink-100/65">
              {gameSyncing ? copy.hostGenerating : copy.waitHostStart}
            </p>
          )}
          {lobbyError && (
            <p className="mt-3 text-center text-sm text-red-200">
              {lobbyError}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "round-result" && lastResult) {
    const isLastRound = isBattleFinalRound(
      lastResult.roundIndex,
      settings,
      players,
    );
    return (
      <BattleRoundResultView
        result={lastResult}
        players={players}
        myId={myId.current}
        questionType={settings.questionType}
        roundReady={roundReady}
        isLastRound={isLastRound}
        locale={locale}
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
        locale={locale}
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
    const isAnimeQuestion = isAnimeBattleQuestion(currentQuestion);
    const isLegacyAnimeQuestion = isAnimeTuxunBattleQuestion(currentQuestion);
    const timedClues = isLegacyAnimeQuestion
      ? currentQuestion.playState.clues.slice(
          0,
          Math.min(
            currentQuestion.playState.clues.length,
            Math.floor(
              roundElapsedSeconds / ANIME_TUXUN_CLUE_INTERVAL_SECONDS,
            ) + 1,
          ),
        )
      : [];
    const nextClueIn =
      isLegacyAnimeQuestion &&
      timedClues.length < currentQuestion.playState.clues.length
        ? ANIME_TUXUN_CLUE_INTERVAL_SECONDS -
          (roundElapsedSeconds % ANIME_TUXUN_CLUE_INTERVAL_SECONDS)
        : null;
    const isForeignQuestion = isForeignBattleQuestion(currentQuestion);
    const animeQuestionText = isAnimeQuestion
      ? getAnimeGuessrQuestionText(currentQuestion.question, locale)
      : null;

    return (
      <div className="flex h-screen flex-col bg-[#0a0612] text-white">
        {renderBattleHeader()}

        <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
          {isForeignQuestion ? (
            <GoogleStreetView
              key={currentQuestion.id}
              location={currentQuestion.location}
              onUnavailable={() =>
                setStreetViewError(copy.googleStreetViewFailed)
              }
            />
          ) : isAnimeQuestion ? (
            <GoogleStreetView
              key={currentQuestion.id}
              location={toAnimeStreetViewLocation(
                currentQuestion.question,
                locale,
              )}
              onUnavailable={() =>
                setStreetViewError(copy.googleStreetViewFailed)
              }
            />
          ) : isLegacyAnimeQuestion ? (
            <GoogleStreetView
              key={currentQuestion.id}
              location={toAnimeTuxunBattleStreetViewLocation(currentQuestion)}
              onUnavailable={() =>
                setStreetViewError(copy.googleStreetViewFailed)
              }
            />
          ) : (
            <div className="grid h-full place-items-center bg-stone-950 px-6 text-center">
              <div>
                <div className="text-lg font-bold text-pink-100">
                  {copy.unsupportedMode}
                </div>
                <p className="mt-2 text-sm leading-6 text-pink-100/60">
                  {copy.googleStreetViewFailed}
                </p>
              </div>
            </div>
          )}

          <aside className="anime-panel absolute top-4 left-4 z-20 flex w-[min(calc(100vw-2rem),380px)] flex-col gap-3 p-4">
            <div className="flex items-center justify-between rounded-lg bg-white/8 px-3 py-2">
              <div>
                <div className="text-xs text-pink-100/50">{copy.timeLeft}</div>
                <div className="text-sm text-cyan-100">
                  {copy.speedCompensationHint}
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

            <div className="flex items-center justify-between gap-2 rounded-lg bg-white/8 px-3 py-2">
              <span className="text-sm text-pink-100/60">
                {copy.submitProgress}
              </span>
              <span className="text-sm font-medium text-green-300">
                {submittedSummary}
              </span>
            </div>

            {streetViewError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {streetViewError}
              </div>
            )}

            {isForeignQuestion ? (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
                <div className="text-sm font-semibold text-emerald-200">
                  {copy.foreignInstructionTitle}
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-300">
                  {copy.foreignInstructionBody}
                </p>
              </div>
            ) : isAnimeQuestion && animeQuestionText ? (
              <div className="rounded-lg border border-pink-400/30 bg-pink-400/10 px-3 py-2">
                <BattleAnimeClueImage
                  question={currentQuestion.question}
                  alt={animeQuestionText.title}
                />
                <div className="mt-3 text-sm font-semibold text-pink-100">
                  {copy.animeClue}
                </div>
                <div className="mt-1 text-xl font-black text-pink-50">
                  {animeQuestionText.animeTitle}
                </div>
                {currentQuestion.question.year != null && (
                  <div className="mt-1 text-xs text-pink-100/60">
                    {currentQuestion.question.year}
                  </div>
                )}
                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-pink-50">
                  {redactAnswerTerms(animeQuestionText.description, [
                    animeQuestionText.location,
                    animeQuestionText.answerName,
                    currentQuestion.question.location,
                  ])}
                </div>
                {animeQuestionText.aspect && (
                  <div className="mt-2 text-xs leading-5 text-pink-100/70">
                    {redactAnswerTerms(animeQuestionText.aspect, [
                      animeQuestionText.location,
                      animeQuestionText.answerName,
                      currentQuestion.question.location,
                    ])}
                  </div>
                )}
              </div>
            ) : isLegacyAnimeQuestion ? (
              <div className="rounded-lg border border-pink-400/30 bg-pink-400/10 px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-pink-100">
                  <span>{copy.animeClue}</span>
                  {nextClueIn ? (
                    <span className="text-xs text-pink-100/70">
                      {copy.nextClueIn(nextClueIn)}
                    </span>
                  ) : (
                    <span className="text-xs text-pink-100/70">
                      {copy.allCluesShown}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs leading-5 text-pink-100/70">
                  {currentQuestion.playState.animeTitles.join(" / ")}
                </div>
                <ol className="mt-3 space-y-2">
                  {timedClues.map((clue, index) => (
                    <li
                      key={`${currentQuestion.id}-${index}`}
                      className="text-sm leading-6 text-stone-100"
                    >
                      <span className="mr-2 font-mono text-pink-200">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {redactAnswerTerms(clue, [
                        currentQuestion.playState.answerName,
                        currentQuestion.playState.location,
                        currentQuestion.playState.answerContext,
                      ])}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2">
                <div className="text-sm font-semibold text-amber-200">
                  {copy.unsupportedMode}
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-300">
                  {copy.googleStreetViewFailed}
                </p>
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
              isForeignQuestion
                ? copy.foreignGuessTitle
                : isAnimeQuestion || isLegacyAnimeQuestion
                  ? copy.animeGuessTitle
                  : copy.historyGuessTitle
            }
            mapProvider="google"
            country={DEFAULT_FOREIGN_COUNTRY}
            googleMapLabels={googleMapLabels}
          />

          {submitted && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/20">
              <div className="rounded-xl bg-green-800/85 px-6 py-3 text-center shadow-lg shadow-black/30 backdrop-blur-sm">
                <div className="text-lg font-bold text-green-200">
                  ✓ {copy.lockedTitle}
                </div>
                <div className="text-sm text-green-100/80">
                  {copy.lockedBody}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0612] text-white">
      {renderBattleHeader()}

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
          <div className="anime-panel flex items-center justify-between rounded-lg px-4 py-2">
            <div>
              <div className="text-sm text-pink-100/60">{copy.timeLeft}</div>
              {!submitted && speedPreview && (
                <div className="text-xs text-cyan-100">
                  {copy.submitNowMultiplier(speedPreview.toFixed(2))}
                </div>
              )}
            </div>
            <span
              className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}
            >
              {timeLeft}s
            </span>
          </div>

          <div className="anime-panel flex items-center justify-between gap-2 rounded-lg px-4 py-2">
            <span className="text-sm text-pink-100/60">
              {copy.submitProgress}
            </span>
            <span className="text-sm font-medium text-green-300">
              {submittedSummary}
            </span>
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
                  : "bg-pink-300 text-zinc-950 hover:bg-pink-200"
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
                    ✓ {copy.lockedTitle}
                  </div>
                  <div className="text-sm text-green-400">
                    {copy.lockedBody}
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
