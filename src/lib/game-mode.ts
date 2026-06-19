import { type QuestionType } from "~/types/question";

export type GameModeSlug =
  | QuestionType
  | "anime"
  | "tuxun"
  | "foreign"
  | "history-tuxun"
  | "history-year";

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
  /** 为 false 时仅用于个人模式，不进入对战配置 */
  battleEnabled?: boolean;
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
    enabled: false,
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
    enabled: false,
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
  anime: {
    type: "anime",
    slug: "anime",
    title: "猜动漫模式",
    emoji: "🎞️",
    description: "观察现实街景，参考左上角动漫线索猜取景地",
    tagline: "Google 街景 + 动漫线索 + 全球地图猜点",
    accentClass: "text-pink-300",
    borderHoverClass: "hover:border-pink-500",
    enabled: true,
    battleEnabled: false,
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
    enabled: false,
  },
  foreign: {
    type: "foreign",
    slug: "foreign",
    title: "国外模式",
    emoji: "🌏",
    description: "Google 街景日本版 GeoGuessr，观察街景猜位置",
    tagline: "Google 街景 + 日本地图猜点",
    accentClass: "text-emerald-300",
    borderHoverClass: "hover:border-emerald-500",
    enabled: false,
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
    enabled: false,
  },
  "history-year": {
    type: "history-year",
    slug: "history-year",
    title: "历史猜年份",
    emoji: "⌛",
    description: "根据逐步解锁的历史线索猜事件年份",
    tagline: "线索越少 + 年份越准，分数越高",
    accentClass: "text-fuchsia-300",
    borderHoverClass: "hover:border-fuchsia-500",
    enabled: false,
    battleEnabled: false,
  },
};

export const GAME_MODE_LIST = Object.values(GAME_MODES).filter(
  (mode) => mode.enabled !== false,
);

export const BATTLE_GAME_MODE_LIST = GAME_MODE_LIST.filter(
  (mode) => mode.battleEnabled !== false,
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
    isQuestionType(value) ||
    value === "anime" ||
    value === "tuxun" ||
    value === "foreign" ||
    value === "history-tuxun" ||
    value === "history-year"
  );
}

export function getGameMode(slug: string): GameModeConfig | undefined {
  return isGameModeSlug(slug) ? GAME_MODES[slug] : undefined;
}

export function isBattleGameModeSlug(value: string): value is GameModeSlug {
  if (!isGameModeSlug(value)) return false;
  const mode = GAME_MODES[value];
  return mode.enabled !== false && mode.battleEnabled !== false;
}
