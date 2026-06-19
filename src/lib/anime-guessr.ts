import { type TuxunLocation } from "~/lib/tuxun-locations";
import {
  DEFAULT_ANIME_LOCALE,
  isAnimeLocale,
  type AnimeLocale,
} from "~/lib/anime-locale";

export const ANIME_GUESSR_ROUNDS = 5;
export const ANIME_GUESSR_DATA_URL = "/data/anime-guessr-questions.json";
export const ANIME_GUESSR_PLACEHOLDER_IMAGE_URL =
  "/images/anime-placeholder.jpg";

export const ANIME_GUESSR_IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL;

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
  year: number;
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
    typeof item.year === "number" &&
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

export function pickAnimeGuessrQuestions(
  questions: AnimeGuessrQuestion[],
  count = ANIME_GUESSR_ROUNDS,
): AnimeGuessrQuestion[] {
  return shuffle(questions).slice(0, Math.min(count, questions.length));
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
  if (!baseUrl) return undefined;

  const base = baseUrl.replace(/\/+$/, "");
  const path = imagePath.replace(/^\/+/, "");
  return `${base}/${path}`;
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
    question.locales?.[DEFAULT_ANIME_LOCALE] ??
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
