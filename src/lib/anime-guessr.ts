import {
  DEFAULT_FOREIGN_COUNTRY,
  isPointInsideBounds,
} from "~/lib/foreign-map";

export const ANIME_GUESSR_ROUNDS = 5;
export const ANIME_GUESSR_DATA_URL = "/data/anime-guessr-questions.json";
export const ANIME_GUESSR_PLACEHOLDER_IMAGE_URL =
  "/images/anime-placeholder.jpg";

export const ANIME_GUESSR_IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL;

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
    isPointInsideBounds(
      { lat: item.lat, lng: item.lng },
      DEFAULT_FOREIGN_COUNTRY.bounds,
    )
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
