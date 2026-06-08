// ─── Character configuration ──────────────────────────────────────────────────

export interface CharacterConfig {
  skinTone: number; // 0–4
  hairStyle: number; // 0–4
  hairColor: number; // 0–5
  topStyle: number; // 0–3, outfit style
  topColor: number; // 0–5, outfit color
  pantsStyle: number; // 0–2, accessory style
  pantsColor: number; // 0–4, accessory color
}

export const DEFAULT_CHARACTER: CharacterConfig = {
  skinTone: 1,
  hairStyle: 0,
  hairColor: 0,
  topStyle: 0,
  topColor: 2,
  pantsStyle: 0,
  pantsColor: 3,
};

// ─── Color palettes ───────────────────────────────────────────────────────────

export const SKIN_TONES = [
  "#FDDBB4", // 白皙
  "#F5C08A", // 自然
  "#D4915A", // 小麦
  "#A0622A", // 深棕
  "#5C3317", // 深色
];

export const HAIR_COLORS = [
  "#21130F", // 墨茶
  "#5B3A90", // 夜紫
  "#E8B35C", // 蜂蜜金
  "#F472B6", // 樱粉
  "#38BDF8", // 湖蓝
  "#C084FC", // 星紫
];

export const HAIR_STYLE_NAMES = [
  "学生短发",
  "姬发长发",
  "蓬松卷发",
  "侧马尾",
  "利落短发",
];

export const TOP_COLORS = [
  "#EF4444", // 赤红
  "#3B82F6", // 学院蓝
  "#10B981", // 薄荷绿
  "#F59E0B", // 金橙
  "#8B5CF6", // 魔法紫
  "#F8FAFC", // 月白
];

export const TOP_STYLE_NAMES = [
  "学院制服",
  "偶像外套",
  "幻想连衣裙",
  "术士披肩",
];

export const PANTS_COLORS = [
  "#F472B6", // 樱粉
  "#A78BFA", // 梦紫
  "#38BDF8", // 晶蓝
  "#FACC15", // 星金
  "#2DD4BF", // 青绿
];

export const PANTS_STYLE_NAMES = ["发饰蝴蝶结", "兽耳发饰", "耳机光环"];

// ─── Serialization ────────────────────────────────────────────────────────────

export function serializeCharacter(c: CharacterConfig): string {
  return [
    c.skinTone,
    c.hairStyle,
    c.hairColor,
    c.topStyle,
    c.topColor,
    c.pantsStyle,
    c.pantsColor,
  ].join("-");
}

export function deserializeCharacter(s: string): CharacterConfig {
  const parts = s.split("-").map(Number);
  if (parts.length !== 7 || parts.some(isNaN)) return DEFAULT_CHARACTER;
  const [
    skinTone,
    hairStyle,
    hairColor,
    topStyle,
    topColor,
    pantsStyle,
    pantsColor,
  ] = parts as [number, number, number, number, number, number, number];
  return {
    skinTone,
    hairStyle,
    hairColor,
    topStyle,
    topColor,
    pantsStyle,
    pantsColor,
  };
}

export const CHARACTER_STORAGE_KEY = "histoguessr_character";
export const CHARACTER_UPDATED_EVENT = "histoguessr-character-updated";

export const CHARACTER_PRESETS: CharacterConfig[] = [
  {
    skinTone: 1,
    hairStyle: 0,
    hairColor: 0,
    topStyle: 0,
    topColor: 1,
    pantsStyle: 0,
    pantsColor: 0,
  },
  {
    skinTone: 0,
    hairStyle: 1,
    hairColor: 3,
    topStyle: 2,
    topColor: 5,
    pantsStyle: 0,
    pantsColor: 3,
  },
  {
    skinTone: 1,
    hairStyle: 3,
    hairColor: 5,
    topStyle: 1,
    topColor: 4,
    pantsStyle: 2,
    pantsColor: 2,
  },
  {
    skinTone: 2,
    hairStyle: 2,
    hairColor: 4,
    topStyle: 3,
    topColor: 2,
    pantsStyle: 1,
    pantsColor: 4,
  },
  {
    skinTone: 0,
    hairStyle: 4,
    hairColor: 2,
    topStyle: 0,
    topColor: 3,
    pantsStyle: 2,
    pantsColor: 1,
  },
];
