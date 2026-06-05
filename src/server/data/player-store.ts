import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  type BattleHistoryRecord,
  type BattleOutcome,
  type PlayerAvatar,
  type PlayerProfile,
  type PlayerSession,
  normalizeAvatar,
} from "~/types/player";

interface StoredPlayer extends PlayerProfile {
  sessions: string[];
  history: BattleHistoryRecord[];
}

interface PlayerStore {
  players: Record<string, StoredPlayer>;
}

interface RecordBattleInput {
  roomId: string;
  outcome: BattleOutcome;
  opponentName: string;
  opponentAvatar: PlayerAvatar;
  totalScore: number;
  opponentScore: number;
  remainingHp: number;
  opponentHp: number;
  roundsPlayed: number;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "players.json");
const MAX_HISTORY = 50;
const MAX_SESSIONS = 10;

let writeQueue = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isErrnoError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function emptyStore(): PlayerStore {
  return { players: {} };
}

function toPublicPlayer(player: StoredPlayer): PlayerProfile {
  return {
    id: player.id,
    name: player.name,
    avatar: normalizeAvatar(player.avatar),
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}

function normalizeName(name: string) {
  return name.trim().slice(0, 12) || "玩家";
}

function parseStore(raw: string): PlayerStore {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || !isRecord(parsed.players)) return emptyStore();

  return {
    players: parsed.players as Record<string, StoredPlayer>,
  };
}

async function readStore(): Promise<PlayerStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return parseStore(raw);
  } catch (error) {
    if (isErrnoError(error) && error.code === "ENOENT") return emptyStore();
    throw error;
  }
}

async function writeStore(store: PlayerStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function updateStore<T>(fn: (store: PlayerStore) => T): Promise<T> {
  const previous = writeQueue;
  let release: () => void = () => undefined;
  writeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    const store = await readStore();
    const result = fn(store);
    await writeStore(store);
    return result;
  } finally {
    release();
  }
}

function findPlayerByToken(store: PlayerStore, token: string) {
  return Object.values(store.players).find((player) =>
    player.sessions.includes(token),
  );
}

function requirePlayerByToken(store: PlayerStore, token: string) {
  const player = findPlayerByToken(store, token);
  if (!player) {
    throw new Error("Invalid player session");
  }
  return player;
}

export async function loginPlayer(input: {
  userId?: string;
  name: string;
  avatar?: PlayerAvatar;
}): Promise<PlayerSession> {
  return updateStore((store) => {
    const now = new Date().toISOString();
    const name = normalizeName(input.name);
    const avatar = normalizeAvatar(input.avatar);
    const existing =
      input.userId && store.players[input.userId]
        ? store.players[input.userId]
        : null;

    const player: StoredPlayer = existing ?? {
      id: randomUUID(),
      name,
      avatar,
      createdAt: now,
      updatedAt: now,
      sessions: [],
      history: [],
    };

    player.name = name;
    player.avatar = avatar;
    player.updatedAt = now;

    const token = randomUUID();
    player.sessions = [token, ...player.sessions].slice(0, MAX_SESSIONS);
    store.players[player.id] = player;

    return {
      token,
      user: toPublicPlayer(player),
    };
  });
}

export async function getPlayerProfile(token: string): Promise<PlayerProfile> {
  const store = await readStore();
  return toPublicPlayer(requirePlayerByToken(store, token));
}

export async function updatePlayerProfile(input: {
  token: string;
  name: string;
  avatar: PlayerAvatar;
}): Promise<PlayerProfile> {
  return updateStore((store) => {
    const player = requirePlayerByToken(store, input.token);
    player.name = normalizeName(input.name);
    player.avatar = normalizeAvatar(input.avatar);
    player.updatedAt = new Date().toISOString();
    return toPublicPlayer(player);
  });
}

export async function getBattleHistory(
  token: string,
): Promise<BattleHistoryRecord[]> {
  const store = await readStore();
  const player = requirePlayerByToken(store, token);
  return player.history;
}

export async function recordBattleHistory(input: {
  token: string;
  record: RecordBattleInput;
}): Promise<BattleHistoryRecord> {
  return updateStore((store) => {
    const player = requirePlayerByToken(store, input.token);
    const record: BattleHistoryRecord = {
      id: randomUUID(),
      roomId: input.record.roomId,
      playedAt: new Date().toISOString(),
      outcome: input.record.outcome,
      playerName: player.name,
      playerAvatar: normalizeAvatar(player.avatar),
      opponentName: normalizeName(input.record.opponentName),
      opponentAvatar: normalizeAvatar(input.record.opponentAvatar),
      totalScore: Math.max(0, Math.round(input.record.totalScore)),
      opponentScore: Math.max(0, Math.round(input.record.opponentScore)),
      remainingHp: Math.max(0, Math.round(input.record.remainingHp)),
      opponentHp: Math.max(0, Math.round(input.record.opponentHp)),
      roundsPlayed: Math.max(1, Math.round(input.record.roundsPlayed)),
    };

    player.history = [record, ...player.history].slice(0, MAX_HISTORY);
    return record;
  });
}
