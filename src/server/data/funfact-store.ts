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
  description: string | null;
  hint: string | null;
  funfact: string[] | null;
  difficulty: number | null;
  image_url: string | null;
  fallback_image_url: string | null;
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
    description: row.description ?? undefined,
    hint: row.hint ?? undefined,
    funfact: funfact.length > 0 ? funfact : undefined,
    difficulty: row.difficulty ?? undefined,
    imageUrl: toEventImageProxyUrl(row.image_url),
    fallbackImageUrl: toEventImageProxyUrl(row.fallback_image_url),
  };
}

export interface FunfactQuestionQuery {
  count: number;
  difficulty?: number;
}

const FUNFACT_QUESTION_COLUMNS = sql`
  id,
  source_id,
  format,
  title,
  stem,
  options,
  correct_index,
  explanation,
  category,
  description,
  hint,
  funfact,
  difficulty,
  image_url,
  fallback_image_url
`;

export async function getRandomFunfactQuestions(
  query: FunfactQuestionQuery,
): Promise<FunfactQuestionRecord[]> {
  const { count, difficulty } = query;

  const rows =
    difficulty == null
      ? await sql<FunfactQuestionRow[]>`
          select ${FUNFACT_QUESTION_COLUMNS}
          from funfact_questions
          order by random()
          limit ${count}
        `
      : await sql<FunfactQuestionRow[]>`
          select ${FUNFACT_QUESTION_COLUMNS}
          from funfact_questions
          where difficulty = ${difficulty}
          order by random()
          limit ${count}
        `;

  return rows.map(toFunfactQuestion);
}

/** 按 ID 批量取题，保持传入顺序 */
export async function getFunfactQuestionsByIds(
  ids: string[],
): Promise<FunfactQuestionRecord[]> {
  if (ids.length === 0) return [];

  const rows = await sql<FunfactQuestionRow[]>`
    select ${FUNFACT_QUESTION_COLUMNS}
    from funfact_questions
    where id in ${sql(ids)}
  `;

  const byId = new Map(rows.map((row) => [row.id, toFunfactQuestion(row)]));
  return ids
    .map((id) => byId.get(id))
    .filter((record): record is FunfactQuestionRecord => record != null);
}
