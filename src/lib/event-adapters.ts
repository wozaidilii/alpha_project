import { type HistoricalEvent } from "~/types/event";
import { type HistoricalQuestion } from "~/types/question";

/** 将数据库历史题转为游戏联合类型 */
export function toHistoricalQuestion(
  event: HistoricalEvent,
): HistoricalQuestion {
  return { ...event, type: "historical" };
}

export function toHistoricalQuestions(
  events: HistoricalEvent[],
): HistoricalQuestion[] {
  return events.map(toHistoricalQuestion);
}
