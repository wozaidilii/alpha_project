import "server-only";

import { toEventImageProxyUrl } from "~/lib/event-image-url";
import { sql } from "~/server/db/client";
import { type HistoricalEvent } from "~/types/event";

interface HistoricalEventRow {
  id: string;
  title: string;
  description: string;
  year: number;
  lat: number;
  lng: number;
  location: string;
  category: "world" | "china";
  wikipedia_title: string | null;
  image_url: string | null;
  funfact: string[] | null;
  hint: string | null;
  difficulty: number | null;
}

export interface HistoricalEventQuery {
  count: number;
  difficulty?: number;
}

function parseFunfact(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : undefined;
}

function toHistoricalEvent(row: HistoricalEventRow): HistoricalEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    year: row.year,
    lat: row.lat,
    lng: row.lng,
    location: row.location,
    category: row.category,
    wikipediaTitle: row.wikipedia_title ?? undefined,
    imageUrl: toEventImageProxyUrl(row.image_url),
    hint: row.hint ?? undefined,
    difficulty: row.difficulty ?? undefined,
    funfact: parseFunfact(row.funfact),
  };
}

const HISTORICAL_EVENT_COLUMNS = sql`
  id,
  title,
  description,
  year,
  lat,
  lng,
  location,
  category,
  wikipedia_title,
  image_url,
  funfact,
  hint,
  difficulty
`;

export async function getRandomHistoricalEvents(
  query: HistoricalEventQuery,
): Promise<HistoricalEvent[]> {
  const { count, difficulty } = query;

  const rows =
    difficulty == null
      ? await sql<HistoricalEventRow[]>`
          select ${HISTORICAL_EVENT_COLUMNS}
          from historical_events
          where category = 'china'
          order by random()
          limit ${count}
        `
      : await sql<HistoricalEventRow[]>`
          select ${HISTORICAL_EVENT_COLUMNS}
          from historical_events
          where category = 'china'
            and difficulty = ${difficulty}
          order by random()
          limit ${count}
        `;

  return rows.map(toHistoricalEvent);
}

/** 按 ID 批量取题，保持传入顺序 */
export async function getHistoricalEventsByIds(
  ids: string[],
): Promise<HistoricalEvent[]> {
  if (ids.length === 0) return [];

  const rows = await sql<HistoricalEventRow[]>`
    select ${HISTORICAL_EVENT_COLUMNS}
    from historical_events
    where id in ${sql(ids)}
      and category = 'china'
  `;

  const byId = new Map(rows.map((row) => [row.id, toHistoricalEvent(row)]));
  return ids
    .map((id) => byId.get(id))
    .filter((event): event is HistoricalEvent => event != null);
}
