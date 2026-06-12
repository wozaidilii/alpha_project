import { type HistoricalEvent } from "~/types/event";
import { type FunfactQuestionRecord } from "~/types/funfact";
import { type FunfactQuestion, type HistoricalQuestion } from "~/types/question";

/** 将数据库历史题转为游戏联合类型 */
export function toHistoricalQuestion(
  event: HistoricalEvent,
): HistoricalQuestion {
  return {
    ...event,
    type: "historical",
    hint: event.hint,
    difficulty: event.difficulty,
  };
}

export function toHistoricalQuestions(
  events: HistoricalEvent[],
): HistoricalQuestion[] {
  return events.map(toHistoricalQuestion);
}

/** 将数据库冷知识题转为游戏联合类型 */
export function toFunfactQuestion(
  record: FunfactQuestionRecord,
): FunfactQuestion {
  return {
    type: "funfact",
    id: record.id,
    sourceId: record.sourceId,
    title: record.title,
    description: record.description ?? record.hint ?? record.title,
    year: 0,
    format: record.format,
    stem: record.stem,
    options: record.options,
    correctIndex: record.correctIndex,
    explanation: record.explanation,
    category: record.category,
    hint: record.hint,
    funfact: record.funfact,
    difficulty: record.difficulty,
    imageUrl: record.imageUrl,
    fallbackImageUrl: record.fallbackImageUrl,
  };
}

export function toFunfactQuestions(
  records: FunfactQuestionRecord[],
): FunfactQuestion[] {
  return records.map(toFunfactQuestion);
}
