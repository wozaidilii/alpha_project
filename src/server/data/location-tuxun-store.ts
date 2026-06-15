import "server-only";

import { sql } from "~/server/db/client";
import {
  type LocationTuxunPuzzle,
  type LocationTuxunQuestion,
} from "~/types/location-tuxun";

interface LocationTuxunRow {
  id: string;
  source_id: string;
  location: string;
  modern_name: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  title: string;
  aspect: string | null;
  hint: string;
  funfact: string[] | null;
  difficulty: number | null;
  quality_flags: string[] | null;
  year: number | null;
  year_end: number | null;
  year_note: string | null;
  category: string;
  subject_note: string | null;
  location_scope: string | null;
  location_note: string | null;
  ancient_names: string[] | null;
}

export interface LocationTuxunQuery {
  excludeLocation?: string;
  difficulty?: number;
}

const LOCATION_TUXUN_COLUMNS = sql`
  id,
  source_id,
  location,
  modern_name,
  center_lat,
  center_lng,
  radius_km,
  title,
  aspect,
  hint,
  funfact,
  difficulty,
  quality_flags,
  year,
  year_end,
  year_note,
  category,
  subject_note,
  location_scope,
  location_note,
  ancient_names
`;

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toLocationTuxunQuestion(row: LocationTuxunRow): LocationTuxunQuestion {
  const funfact = parseStringArray(row.funfact);
  return {
    id: row.id,
    sourceId: row.source_id,
    location: row.location,
    modernName: row.modern_name,
    centerLat: row.center_lat,
    centerLng: row.center_lng,
    radiusKm: row.radius_km,
    title: row.title,
    aspect: row.aspect ?? undefined,
    hint: row.hint,
    funfact: funfact.length > 0 ? funfact : undefined,
    difficulty: row.difficulty ?? undefined,
    qualityFlags: parseStringArray(row.quality_flags),
    year: row.year ?? undefined,
    yearEnd: row.year_end ?? undefined,
    yearNote: row.year_note ?? undefined,
    category: row.category,
    subjectNote: row.subject_note ?? undefined,
    locationScope: row.location_scope ?? undefined,
    locationNote: row.location_note ?? undefined,
    ancientNames: parseStringArray(row.ancient_names),
  };
}

function buildAnswerContext(rows: LocationTuxunRow[]): string {
  const primary = rows[0];
  if (!primary) return "";

  const parts = [
    primary.subject_note?.trim(),
    primary.location_note?.trim(),
    primary.year_note?.trim(),
  ].filter((item): item is string => Boolean(item));

  if (parts.length > 0) return parts[0]!;

  const year = primary.year;
  if (year != null) {
    return `与 ${year} 年前后的历史线索相关。`;
  }

  return "根据历史线索，在地图上标出这座城市的位置。";
}

function mergeFunfacts(rows: LocationTuxunRow[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const row of rows) {
    for (const item of parseStringArray(row.funfact)) {
      if (seen.has(item)) continue;
      seen.add(item);
      merged.push(item);
      if (merged.length >= 3) return merged;
    }
  }

  return merged;
}

function buildPuzzle(rows: LocationTuxunRow[]): LocationTuxunPuzzle | null {
  if (rows.length === 0) return null;

  const primary = rows[0]!;
  const clues = rows
    .map((row) => row.hint.trim())
    .filter((hint, index, items) => hint && items.indexOf(hint) === index);

  if (clues.length === 0) return null;

  const difficulties = rows
    .map((row) => row.difficulty)
    .filter((value): value is number => value != null);

  return {
    puzzleId: `city:${primary.location}`,
    location: primary.location,
    answerName: primary.modern_name || primary.location,
    answerContext: buildAnswerContext(rows),
    centerLat: primary.center_lat,
    centerLng: primary.center_lng,
    radiusKm: primary.radius_km,
    clues,
    funfact: mergeFunfacts(rows),
    difficulty:
      difficulties.length > 0 ? Math.min(...difficulties) : undefined,
    year: primary.year ?? undefined,
    questionIds: rows.map((row) => row.id),
  };
}

export async function getRandomLocationTuxunPuzzle(
  query: LocationTuxunQuery = {},
): Promise<LocationTuxunPuzzle | null> {
  const { excludeLocation, difficulty } = query;

  const picked =
    difficulty == null
      ? excludeLocation
        ? await sql<{ location: string }[]>`
            select location
            from location_tuxun_questions
            where enabled = true
              and location <> ${excludeLocation}
            group by location
            order by random()
            limit 1
          `
        : await sql<{ location: string }[]>`
            select location
            from location_tuxun_questions
            where enabled = true
            group by location
            order by random()
            limit 1
          `
      : excludeLocation
        ? await sql<{ location: string }[]>`
            select location
            from location_tuxun_questions
            where enabled = true
              and difficulty = ${difficulty}
              and location <> ${excludeLocation}
            group by location
            order by random()
            limit 1
          `
        : await sql<{ location: string }[]>`
            select location
            from location_tuxun_questions
            where enabled = true
              and difficulty = ${difficulty}
            group by location
            order by random()
            limit 1
          `;

  const location = picked[0]?.location;
  if (!location) return null;

  const rows =
    difficulty == null
      ? await sql<LocationTuxunRow[]>`
          select ${LOCATION_TUXUN_COLUMNS}
          from location_tuxun_questions
          where enabled = true
            and location = ${location}
          order by difficulty asc nulls last, id asc
        `
      : await sql<LocationTuxunRow[]>`
          select ${LOCATION_TUXUN_COLUMNS}
          from location_tuxun_questions
          where enabled = true
            and location = ${location}
            and difficulty = ${difficulty}
          order by id asc
        `;

  return buildPuzzle(rows);
}

export async function getLocationTuxunQuestionsByLocation(
  location: string,
): Promise<LocationTuxunQuestion[]> {
  const rows = await sql<LocationTuxunRow[]>`
    select ${LOCATION_TUXUN_COLUMNS}
    from location_tuxun_questions
    where enabled = true
      and location = ${location}
    order by difficulty asc nulls last, id asc
  `;

  return rows.map(toLocationTuxunQuestion);
}
