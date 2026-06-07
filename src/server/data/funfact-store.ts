import "server-only";

import { toEventImageProxyUrl } from "~/lib/event-image-url";
import { sql } from "~/server/db/client";
import { type FunfactQuestionRecord } from "~/types/funfact";

interface FunfactQuestionRow {
  id: string;
  source_id: string;
  format: "multiple_choice" | "true_false";
  title: string;
  stem: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  category: string;
  hint: string | null;
  funfact: string[] | null;
  difficulty: number | null;
  image_url: string | null;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toFunfactQuestion(row: FunfactQuestionRow): FunfactQuestionRecord {
  const funfact = parseStringArray(row.funfact);
  return {
    id: row.id,
    sourceId: row.source_id,
    format: row.format,
    title: row.title,
    stem: row.stem,
    options: parseStringArray(row.options),
    correctIndex: row.correct_index,
    explanation: row.explanation ?? undefined,
    category: row.category,
    hint: row.hint ?? undefined,
    funfact: funfact.length > 0 ? funfact : undefined,
    difficulty: row.difficulty ?? undefined,
    imageUrl: toEventImageProxyUrl(row.image_url),
  };
}

export async function getRandomFunfactQuestions(
  count: number,
): Promise<FunfactQuestionRecord[]> {
  const rows = await sql<FunfactQuestionRow[]>`
    select
      id,
      source_id,
      format,
      title,
      stem,
      options,
      correct_index,
      explanation,
      category,
      hint,
      funfact,
      difficulty,
      image_url
    from funfact_questions
    order by random()
    limit ${count}
  `;

  return rows.map(toFunfactQuestion);
}
