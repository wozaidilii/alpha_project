import "server-only";

import {
  type BattlePlayer,
  type BattleQuestion,
  type BattleRoomSnapshot,
  type BattleSettings,
} from "~/types/battle";

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_PLAYERS = 2;

export const DEFAULT_BATTLE_SETTINGS: BattleSettings = {
  rounds: 5,
  timePerRound: 60,
  startingHp: 100,
  questionType: "historical",
};

const rooms = new Map<string, BattleRoomSnapshot>();

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
    questions: snapshot.questions ? [...snapshot.questions] : undefined,
  };
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
  if (!existing && Object.keys(snapshot.players).length >= MAX_PLAYERS) {
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
  snapshot.phase = "playing";
  snapshot.settings = input.settings;
  snapshot.players = clonePlayers(input.players);
  snapshot.questionIds = input.questionIds ? [...input.questionIds] : undefined;
  snapshot.questions = input.questions ? [...input.questions] : undefined;
  snapshot.roundIndex = input.roundIndex;
  snapshot.startTime = input.startTime;
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
