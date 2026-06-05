import { describe, expect, it } from "vitest";
import { toHistoricalQuestion } from "~/lib/event-adapters";

describe("toHistoricalQuestion", () => {
  it("为数据库题目补上 historical 类型标记", () => {
    const result = toHistoricalQuestion({
      id: "colosseum",
      title: "罗马竞技场建成",
      description: "测试",
      year: 80,
      lat: 41.8902,
      lng: 12.4922,
      location: "罗马，意大利",
      category: "world",
    });

    expect(result.type).toBe("historical");
    expect(result.location).toBe("罗马，意大利");
  });
});
