import { memeQuestions } from "~/data/memes";
import { nostalgiaQuestions } from "~/data/nostalgia";
import {
  type GameQuestion,
  type QuestionType,
} from "~/types/question";

/** 静态题库（回忆杀 + 网络哏）；历史题从数据库加载 */
export const staticQuestions: GameQuestion[] = [
  ...nostalgiaQuestions,
  ...memeQuestions,
];

export interface PickQuestionsOptions {
  count: number;
  /** 单一游戏类型，不可混合；历史题请走 tRPC event.random */
  type: QuestionType;
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

/** 从静态题库随机抽取（仅 nostalgia / meme） */
export function pickQuestions({
  count,
  type,
}: PickQuestionsOptions): GameQuestion[] {
  if (type === "historical") return [];

  const pool = staticQuestions.filter((q) => q.type === type);
  if (pool.length === 0) return [];
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

/** 按题型分组统计（仅静态题库） */
export function countByType(
  questions: GameQuestion[],
): Record<QuestionType, number> {
  return questions.reduce(
    (acc, q) => {
      acc[q.type] += 1;
      return acc;
    },
    { historical: 0, nostalgia: 0, meme: 0 } satisfies Record<
      QuestionType,
      number
    >,
  );
}
