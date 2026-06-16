import "server-only";

import { sql } from "~/server/db/client";
import {
  type LocationTuxunPuzzle,
  type LocationTuxunQuestion,
  type LocationTuxunStreetViewScene,
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

interface LocationTuxunStreetViewSceneRow {
  scene_lat: number;
  scene_lng: number;
  pano_id: string | null;
}

interface TableExistsRow {
  table_name: string | null;
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

const RECENT_STREET_VIEW_FAILURE_FILTER = sql`
  and not exists (
    select 1
    from location_tuxun_street_view_scenes cached_scene
    where cached_scene.location = location_tuxun_questions.location
      and cached_scene.status = 'unavailable'
      and cached_scene.updated_at >= now() - interval '7 days'
  )
`;

async function hasStreetViewSceneCacheTable(): Promise<boolean> {
  const rows = await sql<TableExistsRow[]>`
    select to_regclass('public.location_tuxun_street_view_scenes')::text as table_name
  `;

  return Boolean(rows[0]?.table_name);
}

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
    difficulty: difficulties.length > 0 ? Math.min(...difficulties) : undefined,
    year: primary.year ?? undefined,
    questionIds: rows.map((row) => row.id),
  };
}

function toStreetViewScene(
  row: LocationTuxunStreetViewSceneRow,
): LocationTuxunStreetViewScene {
  return {
    lat: row.scene_lat,
    lng: row.scene_lng,
    panoId: row.pano_id ?? undefined,
  };
}

export async function getLocationTuxunStreetViewScene(
  location: string,
): Promise<LocationTuxunStreetViewScene | null> {
  if (!(await hasStreetViewSceneCacheTable())) return null;

  const rows = await sql<LocationTuxunStreetViewSceneRow[]>`
    select scene_lat, scene_lng, pano_id
    from location_tuxun_street_view_scenes
    where location = ${location}
      and status = 'available'
      and scene_lat is not null
      and scene_lng is not null
    limit 1
  `;

  const row = rows[0];
  return row ? toStreetViewScene(row) : null;
}

export async function saveLocationTuxunStreetViewScene(input: {
  location: string;
  lat: number;
  lng: number;
  panoId?: string;
}): Promise<void> {
  if (!(await hasStreetViewSceneCacheTable())) return;

  await sql`
    insert into location_tuxun_street_view_scenes (
      location,
      status,
      scene_lat,
      scene_lng,
      pano_id,
      last_checked_at,
      lookup_failed_at,
      updated_at
    )
    values (
      ${input.location},
      'available',
      ${input.lat},
      ${input.lng},
      ${input.panoId ?? null},
      now(),
      null,
      now()
    )
    on conflict (location) do update set
      status = 'available',
      scene_lat = excluded.scene_lat,
      scene_lng = excluded.scene_lng,
      pano_id = excluded.pano_id,
      last_checked_at = now(),
      lookup_failed_at = null,
      updated_at = now()
  `;
}

export async function markLocationTuxunStreetViewUnavailable(
  location: string,
): Promise<void> {
  if (!(await hasStreetViewSceneCacheTable())) return;

  await sql`
    insert into location_tuxun_street_view_scenes (
      location,
      status,
      last_checked_at,
      lookup_failed_at,
      updated_at
    )
    values (${location}, 'unavailable', now(), now(), now())
    on conflict (location) do update set
      status = 'unavailable',
      last_checked_at = now(),
      lookup_failed_at = now(),
      updated_at = now()
  `;
}

export async function getRandomLocationTuxunPuzzle(
  query: LocationTuxunQuery = {},
): Promise<LocationTuxunPuzzle | null> {
  const { excludeLocation, difficulty } = query;
  const streetViewFailureFilter = (await hasStreetViewSceneCacheTable())
    ? RECENT_STREET_VIEW_FAILURE_FILTER
    : sql``;

  const picked =
    difficulty == null
      ? excludeLocation
        ? await sql<{ location: string }[]>`
            select location
            from location_tuxun_questions
            where enabled = true
              ${streetViewFailureFilter}
              and location <> ${excludeLocation}
            group by location
            order by random()
            limit 1
          `
        : await sql<{ location: string }[]>`
            select location
            from location_tuxun_questions
            where enabled = true
              ${streetViewFailureFilter}
            group by location
            order by random()
            limit 1
          `
      : excludeLocation
        ? await sql<{ location: string }[]>`
            select location
            from location_tuxun_questions
            where enabled = true
              ${streetViewFailureFilter}
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
              ${streetViewFailureFilter}
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

  const puzzle = buildPuzzle(rows);
  if (!puzzle) return null;

  const streetViewScene = await getLocationTuxunStreetViewScene(
    puzzle.location,
  );

  return streetViewScene ? { ...puzzle, streetViewScene } : puzzle;
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
