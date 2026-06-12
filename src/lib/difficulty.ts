export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: "入门",
  2: "简单",
  3: "中等",
  4: "困难",
  5: "挑战",
};

export const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
  1: "线索较宽泛，适合熟悉历史地理的新手",
  2: "线索略收敛，需要一些常识背景",
  3: "线索更含蓄，考验综合判断",
  4: "线索非常克制，适合进阶玩家",
  5: "几乎只剩抽象背景，极具挑战",
};

export function getDifficultyLabel(level: number | undefined): string {
  if (level == null) return "全部难度";
  return DIFFICULTY_LABELS[level as DifficultyLevel] ?? `难度 ${level}`;
}

export function isDifficultyLevel(value: number): value is DifficultyLevel {
  return DIFFICULTY_LEVELS.includes(value as DifficultyLevel);
}
