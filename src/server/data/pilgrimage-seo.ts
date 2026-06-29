import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { type AnimeLocale } from "~/lib/anime-locale";
import {
  decodeSpotId,
  parseAnimeSlug,
  parseLocationSlug,
} from "~/lib/pilgrimage-slug";

export interface LocalizedText {
  zh: string;
  ja: string;
  en: string;
}

export interface PilgrimageAnimeSummary {
  subjectId: string;
  slug: string;
  animeTitle: string;
  spotCount: number;
  locationCount: number;
  years: number[];
}

export interface PilgrimageLocationSummary {
  slug: string;
  name: string;
  spotCount: number;
  animeCount: number;
}

export interface PilgrimageSpot {
  id: string;
  subjectId: string;
  subjectSlug: string;
  locationSlug: string;
  lat: number;
  lng: number;
  year: number | null;
  difficulty: number | null;
  confidence: string;
  imagePath: string | null;
  sourceUrl: string | null;
  title: LocalizedText;
  description: LocalizedText;
  animeTitle: LocalizedText;
  location: LocalizedText;
  answerName: LocalizedText;
  aspect: string | null;
  episodeContext: string | null;
  funfact: string[];
}

export interface PilgrimageSeoIndex {
  generatedAt: string;
  sourceQuestionCount: number;
  spotCount: number;
  animeCount: number;
  locationCount: number;
  animes: PilgrimageAnimeSummary[];
  locations: PilgrimageLocationSummary[];
  spotIds: string[];
  spots: Record<string, PilgrimageSpot>;
}

const INDEX_PATH = path.join(
  process.cwd(),
  "public/data/seo/index.json",
);

let cachedIndex: PilgrimageSeoIndex | null = null;

function isLocalizedText(value: unknown): value is LocalizedText {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LocalizedText>;
  return (
    typeof item.zh === "string" &&
    typeof item.ja === "string" &&
    typeof item.en === "string"
  );
}

function isPilgrimageSeoIndex(value: unknown): value is PilgrimageSeoIndex {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PilgrimageSeoIndex>;
  return (
    Array.isArray(item.animes) &&
    Array.isArray(item.locations) &&
    Array.isArray(item.spotIds) &&
    item.spots !== null &&
    typeof item.spots === "object"
  );
}

/** 读取构建时生成的 SEO 索引（进程内缓存，避免重复读盘） */
export function getPilgrimageSeoIndex(): PilgrimageSeoIndex | null {
  if (cachedIndex) return cachedIndex;
  try {
    const raw = readFileSync(INDEX_PATH, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isPilgrimageSeoIndex(parsed)) return null;
    cachedIndex = parsed;
    return cachedIndex;
  } catch {
    return null;
  }
}

export function pickLocalizedText(
  text: LocalizedText | undefined,
  locale: AnimeLocale,
): string {
  if (!text) return "";
  return text[locale] || text.en || text.zh || text.ja || "";
}

export function getAnimeBySlug(slug: string): PilgrimageAnimeSummary | null {
  const index = getPilgrimageSeoIndex();
  if (!index) return null;
  const subjectId = parseAnimeSlug(slug);
  if (subjectId) {
    return index.animes.find((item) => item.subjectId === subjectId) ?? null;
  }
  return index.animes.find((item) => item.slug === slug) ?? null;
}

export function getLocationBySlug(slug: string): PilgrimageLocationSummary | null {
  const index = getPilgrimageSeoIndex();
  if (!index) return null;
  return (
    index.locations.find((item) => item.slug === slug) ??
    index.locations.find(
      (item) => item.name === parseLocationSlug(slug),
    ) ??
    null
  );
}

export function getSpotById(encodedId: string): PilgrimageSpot | null {
  const index = getPilgrimageSeoIndex();
  if (!index) return null;
  const id = decodeSpotId(encodedId);
  const spot = index.spots[id];
  return spot ?? null;
}

export function listSpotsForAnime(subjectId: string): PilgrimageSpot[] {
  const index = getPilgrimageSeoIndex();
  if (!index) return [];
  return index.spotIds
    .map((id) => index.spots[id])
    .filter((spot): spot is PilgrimageSpot => {
      if (!spot) return false;
      return spot.subjectId === subjectId;
    });
}

export function listSpotsForLocation(locationSlug: string): PilgrimageSpot[] {
  const index = getPilgrimageSeoIndex();
  if (!index) return [];
  const decodedName = parseLocationSlug(locationSlug);
  return index.spotIds
    .map((id) => index.spots[id])
    .filter((spot): spot is PilgrimageSpot => {
      if (!spot) return false;
      return (
        spot.locationSlug === locationSlug ||
        pickLocalizedText(spot.location, "zh") === decodedName
      );
    });
}

/** sitemap 分块：每块最多 5000 条 spot URL（单语言计数） */
export const SITEMAP_SPOT_CHUNK_SIZE = 5000;

export function getSitemapSpotChunkCount(): number {
  const index = getPilgrimageSeoIndex();
  if (!index || index.spotIds.length === 0) return 0;
  return Math.ceil(index.spotIds.length / SITEMAP_SPOT_CHUNK_SIZE);
}

export function getSpotIdsForSitemapChunk(chunkId: number): string[] {
  const index = getPilgrimageSeoIndex();
  if (!index) return [];
  const start = chunkId * SITEMAP_SPOT_CHUNK_SIZE;
  return index.spotIds.slice(start, start + SITEMAP_SPOT_CHUNK_SIZE);
}
