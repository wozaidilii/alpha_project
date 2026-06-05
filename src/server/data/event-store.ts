import "server-only";

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
    imageUrl: row.image_url ?? undefined,
  };
}

export async function getRandomHistoricalEvents(
  count: number,
): Promise<HistoricalEvent[]> {
  const rows = await sql<HistoricalEventRow[]>`
    select
      id,
      title,
      description,
      year,
      lat,
      lng,
      location,
      category,
      wikipedia_title,
      image_url
    from historical_events
    order by random()
    limit ${count}
  `;

  return rows.map(toHistoricalEvent);
}
