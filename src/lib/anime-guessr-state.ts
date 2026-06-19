import {
  isAnimeGuessrQuestion,
  type AnimeGuessrQuestion,
} from "~/lib/anime-guessr";

export const ANIME_GUESSR_TIME_LIMIT_SECONDS = 120;
export const PENDING_ANIME_FINAL_RESULT_KEY = "aniguessr_pending_final_result";

const PENDING_ANIME_FINAL_RESULT_TTL_MS = 30 * 60 * 1000;

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface AnimeRoundResult {
  question: AnimeGuessrQuestion;
  guess: { lat: number; lng: number };
  distanceKm: number;
  distancePts: number;
  speedCompensationPts: number;
  elapsedSeconds: number;
  score: number;
  scoreBreakthrough?: boolean;
}

export interface PendingAnimeFinalResult {
  schemaVersion: 1;
  savedAt: number;
  questions: AnimeGuessrQuestion[];
  results: AnimeRoundResult[];
  gameTimedOut: boolean;
}

function getBrowserStorage(storage?: StorageLike) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLatLng(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== "object") return false;
  const point = value as Record<string, unknown>;
  return isFiniteNumber(point.lat) && isFiniteNumber(point.lng);
}

export function isAnimeRoundResult(value: unknown): value is AnimeRoundResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;

  return (
    isAnimeGuessrQuestion(result.question) &&
    isLatLng(result.guess) &&
    isFiniteNumber(result.distanceKm) &&
    isFiniteNumber(result.distancePts) &&
    isFiniteNumber(result.speedCompensationPts) &&
    isFiniteNumber(result.elapsedSeconds) &&
    isFiniteNumber(result.score)
  );
}

export function normalizePendingAnimeFinalResult(
  value: unknown,
  now = Date.now(),
): PendingAnimeFinalResult | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  if (payload.schemaVersion !== 1) return null;
  if (!isFiniteNumber(payload.savedAt)) return null;
  if (now - payload.savedAt > PENDING_ANIME_FINAL_RESULT_TTL_MS) return null;
  if (!Array.isArray(payload.questions)) return null;
  if (!Array.isArray(payload.results)) return null;
  if (!payload.questions.every(isAnimeGuessrQuestion)) return null;
  if (!payload.results.every(isAnimeRoundResult)) return null;

  return {
    schemaVersion: 1,
    savedAt: payload.savedAt,
    questions: payload.questions,
    results: payload.results,
    gameTimedOut:
      typeof payload.gameTimedOut === "boolean" ? payload.gameTimedOut : false,
  };
}

export function loadPendingAnimeFinalResult(
  storage?: StorageLike,
): PendingAnimeFinalResult | null {
  const target = getBrowserStorage(storage);
  if (!target) return null;

  const raw = target.getItem(PENDING_ANIME_FINAL_RESULT_KEY);
  if (!raw) return null;

  try {
    return normalizePendingAnimeFinalResult(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePendingAnimeFinalResult(
  input: Omit<PendingAnimeFinalResult, "schemaVersion" | "savedAt">,
  storage?: StorageLike,
) {
  const target = getBrowserStorage(storage);
  if (!target) return;

  target.setItem(
    PENDING_ANIME_FINAL_RESULT_KEY,
    JSON.stringify({
      schemaVersion: 1,
      savedAt: Date.now(),
      questions: input.questions,
      results: input.results,
      gameTimedOut: input.gameTimedOut,
    } satisfies PendingAnimeFinalResult),
  );
}

export function clearPendingAnimeFinalResult(storage?: StorageLike) {
  const target = getBrowserStorage(storage);
  target?.removeItem(PENDING_ANIME_FINAL_RESULT_KEY);
}

export function formatAnimeGameCountdown(seconds: number) {
  const clamped = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clamped / 60);
  const rest = String(clamped % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}
