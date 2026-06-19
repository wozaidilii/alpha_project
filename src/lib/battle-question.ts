import {
  type BattleAnimeTuxunQuestion,
  type BattleForeignQuestion,
  type BattleHistoryTuxunQuestion,
  type BattleQuestion,
  type BattleTuxunQuestion,
} from "~/types/battle";
import {
  type GameQuestion,
  isFunfactQuestion,
  isHistoricalQuestion,
} from "~/types/question";
import { getQuestionResultSubtitle } from "~/lib/question-utils";

export function isStandardBattleQuestion(
  question: BattleQuestion,
): question is GameQuestion {
  return (
    question.type === "historical" ||
    question.type === "funfact" ||
    question.type === "nostalgia" ||
    question.type === "meme"
  );
}

export function isTuxunBattleQuestion(
  question: BattleQuestion,
): question is BattleTuxunQuestion {
  return question.type === "tuxun";
}

export function isForeignBattleQuestion(
  question: BattleQuestion,
): question is BattleForeignQuestion {
  return question.type === "foreign";
}

export function isHistoryTuxunBattleQuestion(
  question: BattleQuestion,
): question is BattleHistoryTuxunQuestion {
  return question.type === "history-tuxun";
}

export function isAnimeTuxunBattleQuestion(
  question: BattleQuestion,
): question is BattleAnimeTuxunQuestion {
  return question.type === "anime-tuxun";
}

export function isLocationOnlyBattleQuestion(
  question: BattleQuestion,
): question is
  | BattleTuxunQuestion
  | BattleForeignQuestion
  | BattleHistoryTuxunQuestion
  | BattleAnimeTuxunQuestion {
  return (
    isTuxunBattleQuestion(question) ||
    isForeignBattleQuestion(question) ||
    isHistoryTuxunBattleQuestion(question) ||
    isAnimeTuxunBattleQuestion(question)
  );
}

export function getBattleQuestionTitle(question: BattleQuestion): string {
  if (isTuxunBattleQuestion(question)) return question.location.title;
  if (isForeignBattleQuestion(question)) return question.location.title;
  if (isHistoryTuxunBattleQuestion(question)) {
    return question.playState.answerName;
  }
  if (isAnimeTuxunBattleQuestion(question))
    return question.playState.answerName;
  return question.title;
}

export function getBattleQuestionSubtitle(question: BattleQuestion): string {
  if (isTuxunBattleQuestion(question)) {
    return `${question.location.province} · ${question.location.city}`;
  }
  if (isForeignBattleQuestion(question)) {
    return `${question.location.province} · ${question.location.city}`;
  }
  if (isHistoryTuxunBattleQuestion(question)) {
    return question.playState.answerContext;
  }
  if (isAnimeTuxunBattleQuestion(question)) {
    return question.playState.answerContext;
  }
  return getQuestionResultSubtitle(question);
}

export function getBattleAnswerPoint(question: BattleQuestion): {
  lat: number;
  lng: number;
  label: string;
} | null {
  if (isTuxunBattleQuestion(question)) {
    return {
      lat: question.location.lat,
      lng: question.location.lng,
      label: question.location.title,
    };
  }
  if (isForeignBattleQuestion(question)) {
    return {
      lat: question.location.lat,
      lng: question.location.lng,
      label: question.location.title,
    };
  }
  if (isHistoryTuxunBattleQuestion(question)) {
    return {
      lat: question.playState.centerLat,
      lng: question.playState.centerLng,
      label: question.playState.answerName,
    };
  }
  if (isAnimeTuxunBattleQuestion(question)) {
    return {
      lat: question.playState.centerLat,
      lng: question.playState.centerLng,
      label: question.playState.answerName,
    };
  }
  if (isStandardBattleQuestion(question) && isHistoricalQuestion(question)) {
    return {
      lat: question.lat,
      lng: question.lng,
      label: question.location,
    };
  }
  return null;
}

export function getBattleQuestionYear(question: BattleQuestion): number | null {
  if (!isStandardBattleQuestion(question)) return null;
  if (isFunfactQuestion(question)) return null;
  return question.year;
}
