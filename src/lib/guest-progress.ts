import { type AnimeRoundResultSummary } from "~/types/player";

export const GUEST_DAILY_FREE_GAMES = 3;
export const GUEST_PROGRESS_KEY = "aniguessr_guest_progress";

export interface GuestHistoryEntry {
  id: string;
  score: number;
  maxScore: number;
  rounds: number;
  playedAt: string;
}

export interface GuestProgress {
  guestId: string;
  dateKey: string;
  startedToday: number;
  bestScore: number;
  history: GuestHistoryEntry[];
}

export interface GuestResultSave {
  progress: GuestProgress;
  isNewBest: boolean;
}

function createGuestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeHistory(value: unknown): GuestHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is Record<string, unknown> => {
      return typeof entry === "object" && entry !== null;
    })
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : createGuestId(),
      score: typeof entry.score === "number" ? entry.score : 0,
      maxScore: typeof entry.maxScore === "number" ? entry.maxScore : 0,
      rounds: typeof entry.rounds === "number" ? entry.rounds : 0,
      playedAt:
        typeof entry.playedAt === "string"
          ? entry.playedAt
          : new Date().toISOString(),
    }))
    .slice(0, 20);
}

export function normalizeGuestProgress(
  value: unknown,
  dateKey = getLocalDateKey(),
): GuestProgress {
  const base =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const storedDate = typeof base.dateKey === "string" ? base.dateKey : dateKey;
  const isToday = storedDate === dateKey;

  return {
    guestId: typeof base.guestId === "string" ? base.guestId : createGuestId(),
    dateKey,
    startedToday:
      isToday && typeof base.startedToday === "number"
        ? Math.max(0, Math.floor(base.startedToday))
        : 0,
    bestScore: typeof base.bestScore === "number" ? base.bestScore : 0,
    history: normalizeHistory(base.history),
  };
}

export function getGuestGamesRemaining(progress: GuestProgress) {
  return Math.max(0, GUEST_DAILY_FREE_GAMES - progress.startedToday);
}

export function canStartGuestGame(progress: GuestProgress) {
  return getGuestGamesRemaining(progress) > 0;
}

export function markGuestGameStarted(progress: GuestProgress): GuestProgress {
  return {
    ...progress,
    startedToday: progress.startedToday + 1,
  };
}

export function getGuestBestScoreForRounds(
  progress: GuestProgress,
  rounds: number,
) {
  return progress.history
    .filter((entry) => entry.rounds === rounds)
    .reduce((max, entry) => Math.max(max, entry.score), 0);
}

export function saveGuestGameResult(
  progress: GuestProgress,
  result: AnimeRoundResultSummary,
): GuestResultSave {
  const previousBest = getGuestBestScoreForRounds(progress, result.rounds);
  const isNewBest = result.score > previousBest;
  const entry: GuestHistoryEntry = {
    id: result.id,
    score: result.score,
    maxScore: result.maxScore,
    rounds: result.rounds,
    playedAt: result.playedAt,
  };

  return {
    isNewBest,
    progress: {
      ...progress,
      bestScore: Math.max(progress.bestScore, result.score),
      history: [entry, ...progress.history].slice(0, 20),
    },
  };
}

export function loadGuestProgress() {
  if (typeof window === "undefined") return normalizeGuestProgress(null);

  const raw = window.localStorage.getItem(GUEST_PROGRESS_KEY);
  if (!raw) return normalizeGuestProgress(null);

  try {
    return normalizeGuestProgress(JSON.parse(raw));
  } catch {
    return normalizeGuestProgress(null);
  }
}

export function storeGuestProgress(progress: GuestProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
}
