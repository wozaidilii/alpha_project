import { describe, expect, it } from "vitest";
import {
  getQuestionBadge,
  getTimelineBounds,
  getQuestionResultSubtitle,
} from "~/lib/question-utils";
import { toHistoricalQuestion } from "~/lib/event-adapters";
import { nostalgiaQuestions } from "~/data/nostalgia";
import { memeQuestions } from "~/data/memes";
import { MODERN_CONTENT_MIN_YEAR, MODERN_CONTENT_MAX_YEAR } from "~/types/question";

const sampleHistorical = toHistoricalQuestion({
  id: "test_event",
  title: "测试历史事件",
  description: "用于单元测试",
  year: 80,
  lat: 41.8902,
  lng: 12.4922,
  location: "罗马，意大利",
  category: "world",
});

describe("getQuestionBadge", () => {
  it("历史题显示世界/中国标签", () => {
    expect(getQuestionBadge(sampleHistorical)).toContain("世界");
  });

  it("回忆杀题显示子类", () => {
    expect(getQuestionBadge(nostalgiaQuestions[0]!)).toContain("回忆杀");
  });

  it("网络哏题显示子类", () => {
    expect(getQuestionBadge(memeQuestions[0]!)).toContain("网络哏");
  });
});

describe("getTimelineBounds", () => {
  it("现代内容题使用 1980–2022 时间轴", () => {
    const bounds = getTimelineBounds(nostalgiaQuestions[0]!);
    expect(bounds.minYear).toBe(MODERN_CONTENT_MIN_YEAR);
    expect(bounds.maxYear).toBe(MODERN_CONTENT_MAX_YEAR);
  });

  it("历史题使用全局时间轴", () => {
    const bounds = getTimelineBounds(sampleHistorical);
    expect(bounds.minYear).toBe(-3000);
    expect(bounds.maxYear).toBe(2026);
  });
});

describe("getQuestionResultSubtitle", () => {
  it("历史题显示地点", () => {
    expect(getQuestionResultSubtitle(sampleHistorical)).toBe(
      sampleHistorical.location,
    );
  });

  it("回忆杀题显示文化圈层", () => {
    const subtitle = getQuestionResultSubtitle(nostalgiaQuestions[0]!);
    expect(subtitle).toMatch(/大陆|港台|全球/);
  });
});
