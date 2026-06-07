import { type FunfactFormat } from "~/types/funfact";

/** 题目大类：历史地理猜谜 / 历史冷知识 / 年代回忆杀 / 网络哏 */
export type QuestionType = "historical" | "funfact" | "nostalgia" | "meme";

/** 文化辐射范围（回忆杀与网络哏无精确地理坐标，用此字段标注共鸣圈层） */
export type CulturalScope = "cn_mainland" | "cn_hk_tw" | "global";

/** 历史题子分类（沿用原有 world/china 维度） */
export type HistoricalCategory = "world" | "china";

/** 回忆杀内容子类 */
export type NostalgiaSubCategory =
  | "appliance"
  | "snack"
  | "toy"
  | "anime"
  | "comic"
  | "movie"
  | "tv"
  | "celebrity"
  | "game"
  | "music"
  | "other";

/** 网络哏形态子类 */
export type MemeSubCategory =
  | "phrase"
  | "image"
  | "video"
  | "event"
  | "character";

/** 网络哏主要传播平台 */
export type MemePlatform =
  | "bbs"
  | "weibo"
  | "wechat"
  | "bilibili"
  | "douyin"
  | "zhihu"
  | "tieba"
  | "other";

/** 所有题目共有的基础字段 */
interface QuestionBase {
  id: string;
  /** 展示标题（可含答案名称，或仅作提示性标题） */
  title: string;
  /** 给玩家的线索描述，避免直接泄露年份 */
  description: string;
  /**
   * 标准答案年份：
   * - 历史题：事件发生年
   * - 回忆杀：首发年或巅峰流行年
   * - 网络哏：梗首次广泛传播年
   */
  year: number;
  /** 可选图片（爬取或手动配置） */
  imageUrl?: string;
  /** 可选：Wikipedia 词条，用于自动拉取配图 */
  wikipediaTitle?: string;
  /** 数据来源备注，便于爬取管线追溯 */
  source?: string;
}

/** 历史题：地图 + 年份双维度作答 */
export interface HistoricalQuestion extends QuestionBase {
  type: "historical";
  lat: number;
  lng: number;
  location: string;
  category: HistoricalCategory;
  /** 答题后展示的冷知识，1–3 条 */
  funfact?: string[];
}

/**
 * 回忆杀题：仅猜年份（无地理坐标）
 * 通过家电、零食、动漫、影视剧等标志性内容唤起 1980–2022 集体记忆
 */
export interface NostalgiaQuestion extends QuestionBase {
  type: "nostalgia";
  subCategory: NostalgiaSubCategory;
  culturalScope: CulturalScope;
  tags: string[];
  /**
   * 流行区间上限（可选）。
   * 计分时以 (year + yearEnd) / 2 的均值作为标准答案。
   * 例：还珠格格 1998–2003 年热播 → 均值 2000.5 年
   */
  yearEnd?: number;
  /** 别名，用于入库去重与日后文本答法扩展 */
  aliases?: string[];
}

/**
 * 网络哏题：仅猜年份（无地理坐标）
 * 聚焦中文互联网语境下的梗、表情包、流行语
 */
export interface MemeQuestion extends QuestionBase {
  type: "meme";
  subCategory: MemeSubCategory;
  culturalScope: CulturalScope;
  platform: MemePlatform | MemePlatform[];
  tags: string[];
  /** 梗的多种叫法 / 原文片段 */
  aliases?: string[];
  /** 原始出处链接（视频、帖子等） */
  sourceUrl?: string;
}

/**
 * 历史冷知识题：四选一或判断题，无地图与年份作答
 */
export interface FunfactQuestion extends QuestionBase {
  type: "funfact";
  format: FunfactFormat;
  sourceId: string;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  category: string;
  hint?: string;
  funfact?: string[];
  difficulty?: number;
  fallbackImageUrl?: string;
}

export type GameQuestion =
  | HistoricalQuestion
  | FunfactQuestion
  | NostalgiaQuestion
  | MemeQuestion;

/** 回忆杀 / 网络哏年代范围 */
export const MODERN_CONTENT_MIN_YEAR = 1980;
export const MODERN_CONTENT_MAX_YEAR = 2022;

export function isHistoricalQuestion(q: GameQuestion): q is HistoricalQuestion {
  return q.type === "historical";
}

export function isNostalgiaQuestion(q: GameQuestion): q is NostalgiaQuestion {
  return q.type === "nostalgia";
}

export function isMemeQuestion(q: GameQuestion): q is MemeQuestion {
  return q.type === "meme";
}

export function isFunfactQuestion(q: GameQuestion): q is FunfactQuestion {
  return q.type === "funfact";
}

export function requiresMap(q: GameQuestion): boolean {
  return q.type === "historical";
}

export function requiresQuizAnswer(q: GameQuestion): boolean {
  return q.type === "funfact";
}

export function getQuestionYear(q: GameQuestion): number {
  return q.year;
}

export function getQuestionYearEnd(q: GameQuestion): number | undefined {
  if (q.type === "nostalgia") return q.yearEnd;
  return undefined;
}
