import "server-only";

import {
  areBattlePlayersReady,
  hasRoundEliminations,
} from "~/lib/battle-flow";
import {
  BATTLE_MAX_PLAYERS,
  type BattlePlayer,
  type BattleQuestion,
  type BattleRoundResult,
  type BattleRoomSnapshot,
  type BattleSettings,
  type PusherGuessSubmitted,
} from "~/types/battle";

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export const DEFAULT_BATTLE_SETTINGS: BattleSettings = {
  rounds: 5,
  timePerRound: 120,
  startingHp: 100,
  questionType: "anime",
};

const globalForBattleRooms = globalThis as typeof globalThis & {
  __aniguessrBattleRooms?: Map<string, BattleRoomSnapshot>;
};

const rooms =
  globalForBattleRooms.__aniguessrBattleRooms ??
  new Map<string, BattleRoomSnapshot>();

globalForBattleRooms.__aniguessrBattleRooms = rooms;

function now() {
  return Date.now();
}

function clonePlayers(players: Record<string, BattlePlayer>) {
  return Object.fromEntries(
    Object.entries(players).map(([id, player]) => [id, { ...player }]),
  );
}

function cloneSnapshot(snapshot: BattleRoomSnapshot): BattleRoomSnapshot {
  return {
    ...snapshot,
    settings: { ...snapshot.settings },
    players: clonePlayers(snapshot.players),
    questionIds: snapshot.questionIds ? [...snapshot.questionIds] : undefined,
    questions: snapshot.questions
      ? snapshot.questions.map((question) =>
          structuredClone(question),
        )
      : undefined,
    guesses: snapshot.guesses ? { ...snapshot.guesses } : undefined,
    results: snapshot.results ? cloneResults(snapshot.results) : undefined,
    roundReady: snapshot.roundReady ? { ...snapshot.roundReady } : undefined,
    finalHp: snapshot.finalHp ? { ...snapshot.finalHp } : undefined,
  };
}

function cloneResults(results: BattleRoundResult[]) {
  return results.map((result) => ({
    ...result,
    guesses: { ...result.guesses },
    hpAfter: { ...result.hpAfter },
    damage: { ...result.damage },
  }));
}

function upsertRoundResult(
  results: BattleRoundResult[] | undefined,
  result: BattleRoundResult,
) {
  const next = results ? cloneResults(results) : [];
  const existingIndex = next.findIndex(
    (entry) => entry.roundIndex === result.roundIndex,
  );
  if (existingIndex >= 0) {
    next[existingIndex] = result;
  } else {
    next.push(result);
  }
  return next.sort((a, b) => a.roundIndex - b.roundIndex);
}

function pruneExpiredRooms(timestamp = now()) {
  for (const [roomId, snapshot] of rooms.entries()) {
    if (timestamp - snapshot.updatedAt > ROOM_TTL_MS) {
      rooms.delete(roomId);
    }
  }
}

function createRoom(roomId: string, settings?: BattleSettings) {
  const snapshot: BattleRoomSnapshot = {
    roomId,
    phase: "lobby",
    settings: settings ?? DEFAULT_BATTLE_SETTINGS,
    players: {},
    updatedAt: now(),
  };
  rooms.set(roomId, snapshot);
  return snapshot;
}

function getOrCreateRoom(roomId: string, settings?: BattleSettings) {
  pruneExpiredRooms();
  const existing = rooms.get(roomId);
  if (existing && existing.phase !== "closed") return existing;
  return createRoom(roomId, settings);
}

export function resetBattleRoomStoreForTests() {
  rooms.clear();
}

export function getBattleRoomSnapshot(
  roomId: string,
): BattleRoomSnapshot | null {
  pruneExpiredRooms();
  const snapshot = rooms.get(roomId);
  return snapshot ? cloneSnapshot(snapshot) : null;
}

export function joinBattleRoom(input: {
  roomId: string;
  player: BattlePlayer;
  settings?: BattleSettings;
}): BattleRoomSnapshot {
  const snapshot = getOrCreateRoom(input.roomId, input.settings);

  if (input.player.isHost && snapshot.phase === "lobby" && input.settings) {
    snapshot.settings = input.settings;
  }

  const existing = snapshot.players[input.player.id];
  if (!existing && Object.keys(snapshot.players).length >= BATTLE_MAX_PLAYERS) {
    throw new Error("房间已满");
  }

  snapshot.players[input.player.id] = {
    ...input.player,
    hp:
      snapshot.phase === "lobby"
        ? snapshot.settings.startingHp
        : (existing?.hp ?? input.player.hp),
  };
  snapshot.updatedAt = now();

  return cloneSnapshot(snapshot);
}

export function markBattleRoomStarting(input: {
  roomId: string;
  settings: BattleSettings;
  players: Record<string, BattlePlayer>;
}): BattleRoomSnapshot {
  const snapshot = getOrCreateRoom(input.roomId, input.settings);
  snapshot.phase = "starting";
  snapshot.settings = input.settings;
  snapshot.players = clonePlayers(input.players);
  snapshot.questionIds = undefined;
  snapshot.questions = undefined;
  snapshot.guesses = undefined;
  snapshot.results = undefined;
  snapshot.roundReady = undefined;
  snapshot.finalHp = undefined;
  snapshot.roundStatus = undefined;
  snapshot.roundIndex = undefined;
  snapshot.startTime = undefined;
  snapshot.updatedAt = now();

  return cloneSnapshot(snapshot);
}

export function cancelBattleRoomStart(input: {
  roomId: string;
}): BattleRoomSnapshot | null {
  const snapshot = rooms.get(input.roomId);
  if (!snapshot) return null;
  if (snapshot.phase === "starting") {
    snapshot.phase = "lobby";
    snapshot.questionIds = undefined;
    snapshot.questions = undefined;
    snapshot.guesses = undefined;
    snapshot.results = undefined;
    snapshot.roundReady = undefined;
    snapshot.finalHp = undefined;
    snapshot.roundStatus = undefined;
    snapshot.roundIndex = undefined;
    snapshot.startTime = undefined;
    snapshot.updatedAt = now();
  }

  return cloneSnapshot(snapshot);
}

export function startBattleRoom(input: {
  roomId: string;
  settings: BattleSettings;
  players: Record<string, BattlePlayer>;
  questionIds?: string[];
  questions?: BattleQuestion[];
  roundIndex: number;
  startTime: number;
}): BattleRoomSnapshot {
  const snapshot = getOrCreateRoom(input.roomId, input.settings);
  if (
    !input.questions?.length ||
    input.questions.length < input.settings.rounds
  ) {
    throw new Error("Battle question deck is incomplete");
  }

  snapshot.phase = "playing";
  snapshot.settings = input.settings;
  snapshot.players = clonePlayers(input.players);
  snapshot.questionIds = input.questionIds ? [...input.questionIds] : undefined;
  snapshot.questions = input.questions ? [...input.questions] : undefined;
  snapshot.guesses = {};
  snapshot.results = [];
  snapshot.roundReady = {};
  snapshot.finalHp = undefined;
  snapshot.roundStatus = "playing";
  snapshot.roundIndex = input.roundIndex;
  snapshot.startTime = input.startTime;
  snapshot.updatedAt = now();

  return cloneSnapshot(snapshot);
}

export function submitBattleRoomGuess(input: {
  roomId: string;
  guess: PusherGuessSubmitted;
}): BattleRoomSnapshot | null {
  const snapshot = rooms.get(input.roomId);
  if (snapshot?.phase !== "playing") return null;
  if (snapshot.roundStatus !== "playing") return cloneSnapshot(snapshot);
  if (!snapshot.players[input.guess.playerId]) return cloneSnapshot(snapshot);
  if (snapshot.roundIndex !== input.guess.roundIndex) {
    return cloneSnapshot(snapshot);
  }

  snapshot.guesses = {
    ...(snapshot.guesses ?? {}),
    [input.guess.playerId]: { ...input.guess },
  };
  snapshot.updatedAt = now();

  return cloneSnapshot(snapshot);
}

export function recordBattleRoomRoundResult(input: {
  roomId: string;
  result: BattleRoundResult;
}): BattleRoomSnapshot | null {
  const snapshot = rooms.get(input.roomId);
  if (snapshot?.phase !== "playing") return null;
  if (snapshot.roundStatus === "game-over") return cloneSnapshot(snapshot);
  if (
    snapshot.roundIndex != null &&
    input.result.roundIndex < snapshot.roundIndex
  ) {
    return cloneSnapshot(snapshot);
  }
  if (snapshot.roundIndex !== input.result.roundIndex) {
    return cloneSnapshot(snapshot);
  }

  snapshot.roundStatus = hasRoundEliminations(input.result)
    ? "elimination"
    : "round-result";
  snapshot.results = upsertRoundResult(snapshot.results, input.result);
  snapshot.roundReady = {};
  snapshot.guesses = snapshot.guesses ?? {};
  snapshot.roundIndex = input.result.roundIndex;
  for (const [pid, hp] of Object.entries(input.result.hpAfter)) {
    const existing = snapshot.players[pid];
    if (existing) snapshot.players[pid] = { ...existing, hp };
  }
  snapshot.updatedAt = now();

  return cloneSnapshot(snapshot);
}

export function markBattleRoomEliminationReady(input: {
  roomId: string;
  playerId: string;
  roundIndex: number;
}): BattleRoomSnapshot | null {
  const snapshot = rooms.get(input.roomId);
  if (snapshot?.phase !== "playing") return null;
  if (snapshot.roundStatus !== "elimination") return cloneSnapshot(snapshot);
  if (!snapshot.players[input.playerId]) return cloneSnapshot(snapshot);
  if (snapshot.roundIndex !== input.roundIndex) return cloneSnapshot(snapshot);

  snapshot.roundReady = {
    ...(snapshot.roundReady ?? {}),
    [input.playerId]: true,
  };

  if (
    areBattlePlayersReady(
      snapshot.players,
      snapshot.roundReady ?? {},
    )
  ) {
    snapshot.roundStatus = "round-result";
    snapshot.roundReady = {};
  }

  snapshot.updatedAt = now();

  return cloneSnapshot(snapshot);
}

export function markBattleRoomRoundReady(input: {
  roomId: string;
  playerId: string;
  roundIndex: number;
}): BattleRoomSnapshot | null {
  const snapshot = rooms.get(input.roomId);
  if (snapshot?.phase !== "playing") return null;
  if (snapshot.roundStatus !== "round-result") return cloneSnapshot(snapshot);
  if (!snapshot.players[input.playerId]) return cloneSnapshot(snapshot);
  if (snapshot.roundIndex !== input.roundIndex) return cloneSnapshot(snapshot);

  snapshot.roundReady = {
    ...(snapshot.roundReady ?? {}),
    [input.playerId]: true,
  };
  snapshot.updatedAt = now();

  return cloneSnapshot(snapshot);
}

export function startBattleRoomRound(input: {
  roomId: string;
  roundIndex: number;
  startTime: number;
}): BattleRoomSnapshot | null {
  const snapshot = rooms.get(input.roomId);
  if (snapshot?.phase !== "playing") return null;
  if (snapshot.roundStatus === "game-over") return cloneSnapshot(snapshot);
  if (
    snapshot.roundIndex != null &&
    input.roundIndex <= snapshot.roundIndex
  ) {
    return cloneSnapshot(snapshot);
  }
  if (snapshot.roundStatus !== "round-result") return cloneSnapshot(snapshot);

  snapshot.roundStatus = "playing";
  snapshot.roundIndex = input.roundIndex;
  snapshot.startTime = input.startTime;
  snapshot.guesses = {};
  snapshot.roundReady = {};
  snapshot.updatedAt = now();

  return cloneSnapshot(snapshot);
}

export function finishBattleRoom(input: {
  roomId: string;
  results: BattleRoundResult[];
  finalHp: Record<string, number>;
}): BattleRoomSnapshot | null {
  const snapshot = rooms.get(input.roomId);
  if (snapshot?.phase !== "playing") return null;

  snapshot.roundStatus = "game-over";
  snapshot.results = cloneResults(input.results);
  snapshot.finalHp = Object.fromEntries(
    Object.entries(input.finalHp).filter(([pid]) => snapshot.players[pid]),
  );
  snapshot.roundReady = {};
  for (const [pid, hp] of Object.entries(input.finalHp)) {
    const existing = snapshot.players[pid];
    if (existing) snapshot.players[pid] = { ...existing, hp };
  }
  snapshot.updatedAt = now();

  return cloneSnapshot(snapshot);
}

export function leaveBattleRoom(input: { roomId: string; playerId: string }): {
  closed: boolean;
  snapshot: BattleRoomSnapshot | null;
} {
  pruneExpiredRooms();
  const snapshot = rooms.get(input.roomId);
  if (!snapshot) return { closed: true, snapshot: null };

  delete snapshot.players[input.playerId];
  snapshot.updatedAt = now();

  if (Object.keys(snapshot.players).length === 0) {
    rooms.delete(input.roomId);
    return { closed: true, snapshot: null };
  }

  return { closed: false, snapshot: cloneSnapshot(snapshot) };
}
