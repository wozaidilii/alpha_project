import { type QuestionType } from "~/types/question";

export interface GameModeConfig {
  type: QuestionType;
  slug: QuestionType;
  title: string;
  emoji: string;
  description: string;
  tagline: string;
  accentClass: string;
  borderHoverClass: string;
}

export const GAME_MODES: Record<QuestionType, GameModeConfig> = {
  historical: {
    type: "historical",
    slug: "historical",
    title: "历史地理",
    emoji: "🗺️",
    description: "在地图上标地点，拖动时间轴猜年份",
    tagline: "地点 + 年份双重挑战",
    accentClass: "text-amber-400",
    borderHoverClass: "hover:border-amber-500",
  },
  nostalgia: {
    type: "nostalgia",
    slug: "nostalgia",
    title: "回忆杀",
    emoji: "📼",
    description: "家电、零食、动漫、影视剧……猜它火遍全国是哪一年",
    tagline: "1980–2022 集体记忆",
    accentClass: "text-rose-400",
    borderHoverClass: "hover:border-rose-500",
  },
  meme: {
    type: "meme",
    slug: "meme",
    title: "网络哏",
    emoji: "🌐",
    description: "表情包、流行语、鬼畜梗……猜它刷屏互联网是哪一年",
    tagline: "中文互联网梗文化",
    accentClass: "text-violet-400",
    borderHoverClass: "hover:border-violet-500",
  },
};

export const GAME_MODE_LIST = Object.values(GAME_MODES);

export function isQuestionType(value: string): value is QuestionType {
  return value === "historical" || value === "nostalgia" || value === "meme";
}

export function getGameMode(slug: string): GameModeConfig | undefined {
  return isQuestionType(slug) ? GAME_MODES[slug] : undefined;
}
