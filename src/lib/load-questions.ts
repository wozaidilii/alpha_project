import { pickQuestions } from "~/data/questions";
import {
  toFunfactQuestions,
  toHistoricalQuestions,
} from "~/lib/event-adapters";
import { type HistoricalEvent } from "~/types/event";
import { type FunfactQuestionRecord } from "~/types/funfact";
import { type GameQuestion, type QuestionType } from "~/types/question";

export interface LoadQuestionsResult {
  questions: GameQuestion[];
  error?: string;
}

function insufficientError(type: QuestionType): string {
  if (type === "historical") return "题库题目不足，请先导入更多历史题目";
  if (type === "funfact") return "冷知识题库不足，请先运行导入脚本";
  return "静态题库题目不足";
}

function ensureCount(
  type: QuestionType,
  count: number,
  questions: GameQuestion[],
): LoadQuestionsResult {
  if (questions.length < count) {
    return { questions: [], error: insufficientError(type) };
  }
  return { questions };
}

export function historicalFromEvents(
  events: HistoricalEvent[],
  count: number,
): LoadQuestionsResult {
  return ensureCount("historical", count, toHistoricalQuestions(events));
}

export function funfactFromRecords(
  records: FunfactQuestionRecord[],
  count: number,
): LoadQuestionsResult {
  return ensureCount("funfact", count, toFunfactQuestions(records));
}

export function loadStaticQuestions(
  type: QuestionType,
  count: number,
): LoadQuestionsResult {
  return ensureCount(type, count, pickQuestions({ count, type }));
}

export async function fetchQuestionsByType(
  type: QuestionType,
  count: number,
  fetchers: {
    fetchHistorical: (count: number) => Promise<HistoricalEvent[]>;
    fetchFunfact: (count: number) => Promise<FunfactQuestionRecord[]>;
  },
): Promise<LoadQuestionsResult> {
  if (type === "historical") {
    const events = await fetchers.fetchHistorical(count);
    return historicalFromEvents(events, count);
  }
  if (type === "funfact") {
    const records = await fetchers.fetchFunfact(count);
    return funfactFromRecords(records, count);
  }
  return loadStaticQuestions(type, count);
}
