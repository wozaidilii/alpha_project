import { describe, expect, it } from "vitest";
import {
  getQuestionBadge,
  getTimelineBounds,
  getQuestionResultSubtitle,
} from "~/lib/question-utils";
import { nostalgiaQuestions } from "~/data/nostalgia";
import { memeQuestions } from "~/data/memes";
import { historicalEvents } from "~/data/events";
import { MODERN_CONTENT_MIN_YEAR, MODERN_CONTENT_MAX_YEAR } from "~/types/question";

describe("getQuestionBadge", () => {
  it("历史题显示世界/中国标签", () => {
    const world = historicalEvents.find((e) => e.category === "world")!;
    expect(getQuestionBadge(world)).toContain("世界");
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
    const bounds = getTimelineBounds(historicalEvents[0]!);
    expect(bounds.minYear).toBe(-3000);
    expect(bounds.maxYear).toBe(2026);
  });
});

describe("getQuestionResultSubtitle", () => {
  it("历史题显示地点", () => {
    const event = historicalEvents[0]!;
    expect(getQuestionResultSubtitle(event)).toBe(event.location);
  });

  it("回忆杀题显示文化圈层", () => {
    const subtitle = getQuestionResultSubtitle(nostalgiaQuestions[0]!);
    expect(subtitle).toMatch(/大陆|港台|全球/);
  });
});
