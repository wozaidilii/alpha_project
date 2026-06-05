import { describe, expect, it } from "vitest";
import { staticQuestions, pickQuestions, countByType } from "~/data/questions";
import { validateQuestion } from "~/lib/question-schema";
import { nostalgiaQuestions } from "~/data/nostalgia";
import { memeQuestions } from "~/data/memes";
import { toHistoricalQuestion } from "~/lib/event-adapters";
import {
  MODERN_CONTENT_MIN_YEAR,
  MODERN_CONTENT_MAX_YEAR,
  requiresMap,
  type HistoricalQuestion,
} from "~/types/question";

const sampleHistorical: HistoricalQuestion = toHistoricalQuestion({
  id: "test_event",
  title: "测试历史事件",
  description: "用于单元测试",
  year: 1789,
  lat: 48.8533,
  lng: 2.3692,
  location: "巴黎，法国",
  category: "world",
});

describe("staticQuestions", () => {
  it("静态题库包含回忆杀与网络哏", () => {
    const counts = countByType(staticQuestions);
    expect(counts.nostalgia).toBeGreaterThan(0);
    expect(counts.meme).toBeGreaterThan(0);
    expect(counts.historical).toBe(0);
  });

  it("每道静态题通过 Zod 校验", () => {
    for (const q of staticQuestions) {
      const result = validateQuestion(q);
      expect(result.success, q.id).toBe(true);
    }
  });

  it("回忆杀与网络哏不需要地图", () => {
    for (const q of [...nostalgiaQuestions, ...memeQuestions]) {
      expect(requiresMap(q)).toBe(false);
    }
  });

  it("回忆杀与网络哏年份在 1980–2022 范围内", () => {
    for (const q of [...nostalgiaQuestions, ...memeQuestions]) {
      expect(q.year).toBeGreaterThanOrEqual(MODERN_CONTENT_MIN_YEAR);
      expect(q.year).toBeLessThanOrEqual(MODERN_CONTENT_MAX_YEAR);
    }
  });

  it("历史题适配器保留坐标字段", () => {
    expect(sampleHistorical.type).toBe("historical");
    expect(requiresMap(sampleHistorical)).toBe(true);
  });
});

describe("pickQuestions", () => {
  it("只从指定类型抽取，不混合", () => {
    const picked = pickQuestions({ count: 3, type: "nostalgia" });
    expect(picked).toHaveLength(3);
    expect(picked.every((q) => q.type === "nostalgia")).toBe(true);
  });

  it("历史题不从静态题库抽取", () => {
    expect(pickQuestions({ count: 5, type: "historical" })).toHaveLength(0);
  });

  it("各静态类型独立抽取不超过对应题库上限", () => {
    for (const type of ["nostalgia", "meme"] as const) {
      const picked = pickQuestions({ count: 100, type });
      const poolSize = staticQuestions.filter((q) => q.type === type).length;
      expect(picked.length).toBeLessThanOrEqual(poolSize);
      expect(picked.every((q) => q.type === type)).toBe(true);
    }
  });
});
