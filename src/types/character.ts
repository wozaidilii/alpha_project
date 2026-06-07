// ─── Character configuration ──────────────────────────────────────────────────

export interface CharacterConfig {
  skinTone: number;   // 0–4
  hairStyle: number;  // 0–4
  hairColor: number;  // 0–5
  topStyle: number;   // 0–3
  topColor: number;   // 0–5
  pantsStyle: number; // 0–2
  pantsColor: number; // 0–4
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
  "#1A1008", // 黑色
  "#5C3A1A", // 深棕
  "#C4893C", // 金棕
  "#E8C060", // 金色
  "#C03040", // 红色
  "#7A5BAF", // 紫色
];

export const HAIR_STYLE_NAMES = ["短发", "长发", "卷发", "马尾", "光头"];

export const TOP_COLORS = [
  "#E84040", // 红
  "#4080E8", // 蓝
  "#40B840", // 绿
  "#E8A020", // 橙
  "#9040C8", // 紫
  "#FFFFFF", // 白
];

export const TOP_STYLE_NAMES = ["T恤", "卫衣", "连衣裙", "西装"];

export const PANTS_COLORS = [
  "#2040A0", // 牛仔蓝
  "#303030", // 黑色
  "#807060", // 卡其
  "#C04040", // 红色
  "#40A040", // 绿色
];

export const PANTS_STYLE_NAMES = ["长裤", "短裤", "裙子"];

// ─── Serialization ────────────────────────────────────────────────────────────

export function serializeCharacter(c: CharacterConfig): string {
  return [c.skinTone, c.hairStyle, c.hairColor, c.topStyle, c.topColor, c.pantsStyle, c.pantsColor].join("-");
}

export function deserializeCharacter(s: string): CharacterConfig {
  const parts = s.split("-").map(Number);
  if (parts.length !== 7 || parts.some(isNaN)) return DEFAULT_CHARACTER;
  const [skinTone, hairStyle, hairColor, topStyle, topColor, pantsStyle, pantsColor] = parts as [number, number, number, number, number, number, number];
  return { skinTone, hairStyle, hairColor, topStyle, topColor, pantsStyle, pantsColor };
}

export const CHARACTER_STORAGE_KEY = "histoguessr_character";
