import { type QuestionType } from "~/types/question";

export type GameModeSlug = QuestionType | "tuxun" | "history-tuxun";

export interface GameModeConfig {
  type: GameModeSlug;
  slug: GameModeSlug;
  title: string;
  emoji: string;
  description: string;
  tagline: string;
  accentClass: string;
  borderHoverClass: string;
  /** 为 false 时不在选择页展示（暂时下线） */
  enabled?: boolean;
}

export const GAME_MODES: Record<GameModeSlug, GameModeConfig> = {
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
  tuxun: {
    type: "tuxun",
    slug: "tuxun",
    title: "图寻模式",
    emoji: "🔭",
    description: "百度全景中国版 GeoGuessr，观察街景猜位置",
    tagline: "全景线索 + 中国地图猜点",
    accentClass: "text-sky-300",
    borderHoverClass: "hover:border-sky-500",
    enabled: true,
  },
  "history-tuxun": {
    type: "history-tuxun",
    slug: "history-tuxun",
    title: "历史图寻模式",
    emoji: "🏛️",
    description: "根据历史线索观察现代街景，猜它对应的地点",
    tagline: "历史线索 + 百度全景 + 中国地图猜点",
    accentClass: "text-amber-300",
    borderHoverClass: "hover:border-amber-500",
    enabled: true,
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

export function isGameModeSlug(value: string): value is GameModeSlug {
  return (
    isQuestionType(value) || value === "tuxun" || value === "history-tuxun"
  );
}

export function getGameMode(slug: string): GameModeConfig | undefined {
  return isGameModeSlug(slug) ? GAME_MODES[slug] : undefined;
}
