import { describe, expect, it } from "vitest";
import { allQuestions, pickQuestions, countByType } from "~/data/questions";
import { validateQuestion } from "~/lib/question-schema";
import { nostalgiaQuestions } from "~/data/nostalgia";
import { memeQuestions } from "~/data/memes";
import { historicalEvents } from "~/data/events";
import {
  MODERN_CONTENT_MIN_YEAR,
  MODERN_CONTENT_MAX_YEAR,
  requiresMap,
} from "~/types/question";

describe("allQuestions", () => {
  it("包含三类题目", () => {
    const counts = countByType(allQuestions);
    expect(counts.historical).toBeGreaterThan(0);
    expect(counts.nostalgia).toBeGreaterThan(0);
    expect(counts.meme).toBeGreaterThan(0);
  });

  it("每道题通过 Zod 校验", () => {
    for (const q of allQuestions) {
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

  it("历史题均有坐标", () => {
    for (const q of historicalEvents) {
      expect(q.type).toBe("historical");
      expect(typeof q.lat).toBe("number");
      expect(typeof q.lng).toBe("number");
      expect(requiresMap(q)).toBe(true);
    }
  });
});

describe("pickQuestions", () => {
  it("只从指定类型抽取，不混合", () => {
    const picked = pickQuestions({ count: 3, type: "nostalgia" });
    expect(picked).toHaveLength(3);
    expect(picked.every((q) => q.type === "nostalgia")).toBe(true);
  });

  it("各类型独立抽取不超过对应题库上限", () => {
    for (const type of ["historical", "nostalgia", "meme"] as const) {
      const picked = pickQuestions({ count: 100, type });
      const poolSize = allQuestions.filter((q) => q.type === type).length;
      expect(picked.length).toBeLessThanOrEqual(poolSize);
      expect(picked.every((q) => q.type === type)).toBe(true);
    }
  });
});
