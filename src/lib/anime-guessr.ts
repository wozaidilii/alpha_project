import { type TuxunLocation } from "~/lib/tuxun-locations";
import {
  DEFAULT_ANIME_LOCALE,
  isAnimeLocale,
  type AnimeLocale,
} from "~/lib/anime-locale";
import {
  ANIME_GUESSR_IMAGE_API_PREFIX as SHARED_ANIME_GUESSR_IMAGE_API_PREFIX,
  buildAnimeGuessrLocalImageApiUrl,
  buildAnimeGuessrRemoteImageUrl,
} from "~/lib/anime-guessr-image-url";

export const ANIME_GUESSR_ROUNDS = 5;
export const ANIME_GUESSR_ROUND_OPTIONS = [5, 10] as const;
export type AnimeGuessrRoundCount = (typeof ANIME_GUESSR_ROUND_OPTIONS)[number];
export const ANIME_GUESSR_ROUNDS_STORAGE_KEY = "aniguessr_round_count";
export const ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER = "beginner";
export const ANIME_GUESSR_DIFFICULTY_TIERS = [
  "beginner",
  "intermediate",
  "master",
  "miracle",
] as const;
export type AnimeGuessrDifficultyTier =
  (typeof ANIME_GUESSR_DIFFICULTY_TIERS)[number];
export const ANIME_GUESSR_DIFFICULTY_STORAGE_KEY = "aniguessr_difficulty_tier";
/** @deprecated migrated to ANIME_GUESSR_DIFFICULTY_STORAGE_KEY */
export const ANIME_GUESSR_LEGACY_MAX_DIFFICULTY_STORAGE_KEY =
  "aniguessr_max_difficulty";
/** Sessions before difficulty tier was persisted are stored as `beginner`. */
export const ANIME_GUESSR_LEGACY_DIFFICULTY_CUTOFF = "2026-06-20T09:29:28.000Z";
export const ANIME_GUESSR_UNKNOWN_DIFFICULTY = 5;

export const ANIME_GUESSR_TIER_MAX_DIFFICULTY: Record<
  AnimeGuessrDifficultyTier,
  number
> = {
  beginner: 1,
  intermediate: 2,
  master: 3,
  miracle: 5,
};
export const ANIME_GUESSR_DATA_URL = "/data/anime-guessr-questions.json";
export const ANIME_GUESSR_PLACEHOLDER_IMAGE_URL =
  "/images/anime-placeholder.jpg";

export const ANIME_GUESSR_IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL;

export function isAnimeGuessrLocalImagesEnabled() {
  return process.env.NEXT_PUBLIC_ANIME_GUESSR_USE_LOCAL_IMAGES === "true";
}

export const ANIME_GUESSR_IMAGE_API_PREFIX =
  SHARED_ANIME_GUESSR_IMAGE_API_PREFIX;

export interface AnimeGuessrQuestionText {
  title: string;
  description: string;
  animeTitle: string;
  aspect?: string;
  location: string;
  answerName: string;
  episodeContext?: string;
  funfact: string[];
  tags: string[];
}

export type AnimeGuessrQuestionLocales = Partial<
  Record<AnimeLocale, Partial<AnimeGuessrQuestionText>>
>;

export interface AnimeGuessrQuestion {
  id: string;
  title: string;
  description: string;
  animeTitle: string;
  aspect?: string;
  year?: number;
  lat: number;
  lng: number;
  location: string;
  answerName: string;
  episodeContext?: string;
  imagePath?: string;
  sourceUrl?: string;
  funfact: string[];
  difficulty?: number;
  confidence: string;
  tags: string[];
  locales?: AnimeGuessrQuestionLocales;
}

interface AnimeGuessrPayload {
  schemaVersion: number;
  questions: AnimeGuessrQuestion[];
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function isPartialQuestionText(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AnimeGuessrQuestionText>;
  return (
    (item.title === undefined || typeof item.title === "string") &&
    (item.description === undefined || typeof item.description === "string") &&
    (item.animeTitle === undefined || typeof item.animeTitle === "string") &&
    (item.aspect === undefined || typeof item.aspect === "string") &&
    (item.location === undefined || typeof item.location === "string") &&
    (item.answerName === undefined || typeof item.answerName === "string") &&
    (item.episodeContext === undefined ||
      typeof item.episodeContext === "string") &&
    (item.funfact === undefined || isStringArray(item.funfact)) &&
    (item.tags === undefined || isStringArray(item.tags))
  );
}

function isQuestionLocales(value: unknown) {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).every(
    ([locale, text]) => isAnimeLocale(locale) && isPartialQuestionText(text),
  );
}

export function isAnimeGuessrQuestion(
  value: unknown,
): value is AnimeGuessrQuestion {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AnimeGuessrQuestion>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.description === "string" &&
    typeof item.animeTitle === "string" &&
    (typeof item.year === "number" || item.year === undefined) &&
    typeof item.lat === "number" &&
    typeof item.lng === "number" &&
    typeof item.location === "string" &&
    typeof item.answerName === "string" &&
    typeof item.confidence === "string" &&
    isStringArray(item.funfact) &&
    isStringArray(item.tags) &&
    isValidLatLng(item.lat, item.lng) &&
    isQuestionLocales(item.locales)
  );
}

function isAnimeGuessrPayload(value: unknown): value is AnimeGuessrPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AnimeGuessrPayload>;
  return (
    payload.schemaVersion === 1 &&
    Array.isArray(payload.questions) &&
    payload.questions.every(isAnimeGuessrQuestion)
  );
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const result = [...items];
  let state = hashSeed(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    const swapIndex = state % (index + 1);
    const current = result[index];
    const swapValue = result[swapIndex];
    if (current === undefined || swapValue === undefined) continue;
    result[index] = swapValue;
    result[swapIndex] = current;
  }

  return result;
}

export function getAnimeGuessrQuestionDifficulty(
  question: AnimeGuessrQuestion,
): number {
  const difficulty = question.difficulty;
  if (
    typeof difficulty === "number" &&
    Number.isInteger(difficulty) &&
    difficulty >= 1 &&
    difficulty <= 5
  ) {
    return difficulty;
  }
  return ANIME_GUESSR_UNKNOWN_DIFFICULTY;
}

export function getAnimeGuessrTierMaxDifficulty(
  tier: AnimeGuessrDifficultyTier,
): number {
  return ANIME_GUESSR_TIER_MAX_DIFFICULTY[tier];
}

export function filterAnimeGuessrQuestionsByTier(
  questions: AnimeGuessrQuestion[],
  tier: AnimeGuessrDifficultyTier,
): AnimeGuessrQuestion[] {
  const maxDifficulty = getAnimeGuessrTierMaxDifficulty(tier);
  return questions.filter(
    (question) => getAnimeGuessrQuestionDifficulty(question) <= maxDifficulty,
  );
}

export function pickAnimeGuessrQuestions(
  questions: AnimeGuessrQuestion[],
  count = ANIME_GUESSR_ROUNDS,
  tier: AnimeGuessrDifficultyTier = ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER,
  seed?: string,
): AnimeGuessrQuestion[] {
  const pool = filterAnimeGuessrQuestionsByTier(questions, tier);
  const shuffled = seed ? seededShuffle(pool, seed) : shuffle(pool);
  return shuffled.slice(0, Math.min(count, pool.length));
}

export async function fetchAnimeGuessrQuestions(
  dataUrl = ANIME_GUESSR_DATA_URL,
): Promise<AnimeGuessrQuestion[]> {
  const response = await fetch(dataUrl, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`动漫题库加载失败：${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isAnimeGuessrPayload(payload)) {
    throw new Error("动漫题库格式不正确");
  }

  return payload.questions;
}

export function buildAnimeGuessrImageUrl(
  imagePath: string | undefined,
  baseUrl = ANIME_GUESSR_IMAGE_BASE_URL,
): string | undefined {
  if (!imagePath) return undefined;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  if (isAnimeGuessrLocalImagesEnabled()) {
    return buildAnimeGuessrLocalImageApiUrl(imagePath);
  }

  const remoteUrl = buildAnimeGuessrRemoteImageUrl(imagePath, baseUrl);
  if (remoteUrl) return remoteUrl;

  if (process.env.NODE_ENV === "development") {
    return buildAnimeGuessrLocalImageApiUrl(imagePath);
  }

  return undefined;
}

export function buildGoogleMapsStreetViewUrl(question: AnimeGuessrQuestion) {
  const url = new URL("https://www.google.com/maps/@");
  url.searchParams.set("api", "1");
  url.searchParams.set("map_action", "pano");
  url.searchParams.set("viewpoint", `${question.lat},${question.lng}`);
  url.searchParams.set("heading", String(stableHeadingFromId(question.id)));
  url.searchParams.set("pitch", "0");
  return url.toString();
}

export function getAnimeGuessrQuestionText(
  question: AnimeGuessrQuestion,
  locale: AnimeLocale = DEFAULT_ANIME_LOCALE,
): AnimeGuessrQuestionText {
  const base: AnimeGuessrQuestionText = {
    title: question.title,
    description: question.description,
    animeTitle: question.animeTitle,
    aspect: question.aspect,
    location: question.location,
    answerName: question.answerName,
    episodeContext: question.episodeContext,
    funfact: question.funfact,
    tags: question.tags,
  };
  const localized =
    question.locales?.[locale] ??
    (locale === "zh" ? undefined : question.locales?.[DEFAULT_ANIME_LOCALE]) ??
    {};

  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(localized).filter(([, value]) => value !== undefined),
    ),
  };
}

function stableHeadingFromId(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}

export function toAnimeStreetViewLocation(
  question: AnimeGuessrQuestion,
  locale: AnimeLocale = DEFAULT_ANIME_LOCALE,
): TuxunLocation {
  const text = getAnimeGuessrQuestionText(question, locale);
  return {
    id: `anime:${question.id}`,
    title: text.answerName,
    province: text.location,
    city: text.location,
    lat: question.lat,
    lng: question.lng,
    heading: stableHeadingFromId(question.id),
    pitch: 0,
    hint: text.description,
  };
}

export function normalizeAnimeGuessrRoundCount(
  value: unknown,
): AnimeGuessrRoundCount {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  return parsed === 10 ? 10 : ANIME_GUESSR_ROUNDS;
}

export function getStoredAnimeGuessrRoundCount(): AnimeGuessrRoundCount {
  if (typeof window === "undefined") return ANIME_GUESSR_ROUNDS;
  try {
    const raw = window.localStorage.getItem(ANIME_GUESSR_ROUNDS_STORAGE_KEY);
    if (!raw) return ANIME_GUESSR_ROUNDS;
    return normalizeAnimeGuessrRoundCount(JSON.parse(raw));
  } catch {
    return normalizeAnimeGuessrRoundCount(
      window.localStorage.getItem(ANIME_GUESSR_ROUNDS_STORAGE_KEY),
    );
  }
}

export function saveAnimeGuessrRoundCount(rounds: AnimeGuessrRoundCount) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANIME_GUESSR_ROUNDS_STORAGE_KEY, String(rounds));
}

export function getAnimeGuessrRoundCountFromSearch(
  search: string,
): AnimeGuessrRoundCount | null {
  const params = new URLSearchParams(search);
  const value = params.get("rounds");
  if (value == null) return null;
  return normalizeAnimeGuessrRoundCount(value);
}

export function normalizeAnimeGuessrDifficultyTier(
  value: unknown,
): AnimeGuessrDifficultyTier {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      ANIME_GUESSR_DIFFICULTY_TIERS.includes(
        trimmed as AnimeGuessrDifficultyTier,
      )
    ) {
      return trimmed as AnimeGuessrDifficultyTier;
    }
    const legacy = Number.parseInt(trimmed, 10);
    if (legacy === 1) return "beginner";
    if (legacy === 2) return "intermediate";
    if (legacy === 3) return "master";
    if (legacy === 4 || legacy === 5) return "miracle";
  }

  if (typeof value === "number") {
    if (value === 1) return "beginner";
    if (value === 2) return "intermediate";
    if (value === 3) return "master";
    if (value === 4 || value === 5) return "miracle";
  }

  return ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER;
}

function readStoredDifficultyTierValue(
  storageKey: string,
): AnimeGuessrDifficultyTier | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    return normalizeAnimeGuessrDifficultyTier(JSON.parse(raw));
  } catch {
    return normalizeAnimeGuessrDifficultyTier(raw);
  }
}

export function getStoredAnimeGuessrDifficultyTier(): AnimeGuessrDifficultyTier {
  if (typeof window === "undefined") {
    return ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER;
  }

  const storedTier = readStoredDifficultyTierValue(
    ANIME_GUESSR_DIFFICULTY_STORAGE_KEY,
  );
  if (storedTier) return storedTier;

  const legacyTier = readStoredDifficultyTierValue(
    ANIME_GUESSR_LEGACY_MAX_DIFFICULTY_STORAGE_KEY,
  );
  if (legacyTier) {
    saveAnimeGuessrDifficultyTier(legacyTier);
    window.localStorage.removeItem(ANIME_GUESSR_LEGACY_MAX_DIFFICULTY_STORAGE_KEY);
    return legacyTier;
  }

  return ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER;
}

export function saveAnimeGuessrDifficultyTier(tier: AnimeGuessrDifficultyTier) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANIME_GUESSR_DIFFICULTY_STORAGE_KEY, tier);
}

export function getAnimeGuessrDifficultyTierFromSearch(
  search: string,
): AnimeGuessrDifficultyTier | null {
  const params = new URLSearchParams(search);
  const value = params.get("difficulty");
  if (value == null) return null;
  return normalizeAnimeGuessrDifficultyTier(value);
}
