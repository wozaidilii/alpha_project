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
  /** 为 false 时不在选择页展示（暂时下线） */
  enabled?: boolean;
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
    enabled: true,
  },
  funfact: {
    type: "funfact",
    slug: "funfact",
    title: "历史冷知识",
    emoji: "📚",
    description: "四选一选择题与对错判断题，考验历史常识",
    tagline: "选择题 + 判断题",
    accentClass: "text-emerald-400",
    borderHoverClass: "hover:border-emerald-500",
    enabled: true,
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
    enabled: false,
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
    enabled: false,
  },
};

export const GAME_MODE_LIST = Object.values(GAME_MODES).filter(
  (mode) => mode.enabled !== false,
);

export function isQuestionType(value: string): value is QuestionType {
  return (
    value === "historical" ||
    value === "funfact" ||
    value === "nostalgia" ||
    value === "meme"
  );
}

export function getGameMode(slug: string): GameModeConfig | undefined {
  return isQuestionType(slug) ? GAME_MODES[slug] : undefined;
}
