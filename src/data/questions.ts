import { historicalEvents } from "~/data/events";
import { memeQuestions } from "~/data/memes";
import { nostalgiaQuestions } from "~/data/nostalgia";
import {
  type GameQuestion,
  type QuestionType,
} from "~/types/question";

/** 全量题库 */
export const allQuestions: GameQuestion[] = [
  ...historicalEvents,
  ...nostalgiaQuestions,
  ...memeQuestions,
];

export interface PickQuestionsOptions {
  count: number;
  /** 单一游戏类型，不可混合 */
  type: QuestionType;
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

/** 从指定类型的题库随机抽取题目 */
export function pickQuestions({
  count,
  type,
}: PickQuestionsOptions): GameQuestion[] {
  const pool = allQuestions.filter((q) => q.type === type);
  if (pool.length === 0) return [];
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

/** 按题型分组统计 */
export function countByType(questions: GameQuestion[]): Record<QuestionType, number> {
  return questions.reduce(
    (acc, q) => {
      acc[q.type] += 1;
      return acc;
    },
    { historical: 0, nostalgia: 0, meme: 0 } satisfies Record<QuestionType, number>,
  );
}
