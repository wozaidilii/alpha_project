// ─── Character configuration ──────────────────────────────────────────────────

export interface CharacterConfig {
  portraitId?: number; // 0–2, premium portrait base
  skinTone: number; // 0–4
  hairStyle: number; // 0–4
  hairColor: number; // 0–5
  topStyle: number; // 0–3, outfit style
  topColor: number; // 0–5, outfit color
  pantsStyle: number; // 0–2, accessory style
  pantsColor: number; // 0–4, accessory color
}

export const DEFAULT_CHARACTER: CharacterConfig = {
  portraitId: 0,
  skinTone: 1,
  hairStyle: 0,
  hairColor: 0,
  topStyle: 1,
  topColor: 1,
  pantsStyle: 2,
  pantsColor: 0,
};

export const CHARACTER_PORTRAITS = [
  {
    id: 0,
    name: "沈逸尘",
    archetype: "书生剑修",
    age: 22,
    personality: "冷静克制，擅长从史料细节中推断年代。",
    image: "/characters/xianxia-scholar-swordsman.png",
    defaultConfig: {
      skinTone: 1,
      hairStyle: 0,
      hairColor: 0,
      topStyle: 1,
      topColor: 1,
      pantsStyle: 2,
      pantsColor: 0,
    },
  },
  {
    id: 1,
    name: "温照影",
    archetype: "赤绫史官",
    age: 20,
    personality: "聪慧锐利，随身携带竹简与朱砂笔。",
    image: "/characters/xianxia-red-historian.png",
    defaultConfig: {
      skinTone: 0,
      hairStyle: 2,
      hairColor: 0,
      topStyle: 0,
      topColor: 3,
      pantsStyle: 1,
      pantsColor: 3,
    },
  },
  {
    id: 2,
    name: "陆青衡",
    archetype: "青衣机关师",
    age: 19,
    personality: "开朗机敏，喜欢用机关罗盘记录古地图。",
    image: "/characters/xianxia-jade-mechanist.png",
    defaultConfig: {
      skinTone: 1,
      hairStyle: 4,
      hairColor: 5,
      topStyle: 2,
      topColor: 5,
      pantsStyle: 0,
      pantsColor: 4,
    },
  },
] as const;

// ─── Serialization ────────────────────────────────────────────────────────────

export function serializeCharacter(c: CharacterConfig): string {
  return [
    c.portraitId ?? 0,
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
  if ((parts.length !== 7 && parts.length !== 8) || parts.some(isNaN)) {
    return DEFAULT_CHARACTER;
  }
  const legacyOffset = parts.length === 7 ? 0 : 1;
  const portraitId = parts.length === 8 ? parts[0]! : 0;
  const skinTone = parts[legacyOffset]!;
  const hairStyle = parts[legacyOffset + 1]!;
  const hairColor = parts[legacyOffset + 2]!;
  const topStyle = parts[legacyOffset + 3]!;
  const topColor = parts[legacyOffset + 4]!;
  const pantsStyle = parts[legacyOffset + 5]!;
  const pantsColor = parts[legacyOffset + 6]!;
  return {
    portraitId,
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
