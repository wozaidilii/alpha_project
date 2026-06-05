import { describe, expect, it } from "vitest";
import {
  yearOnlyScore,
  scoreRound,
  yearScore,
  locationScore,
  getTargetYear,
  formatAnswerYear,
} from "~/lib/scoring";

describe("getTargetYear", () => {
  it("无区间时返回原年份", () => {
    expect(getTargetYear(1998)).toBe(1998);
  });

  it("有区间时返回均值", () => {
    expect(getTargetYear(1998, 2003)).toBe(2000.5);
  });
});

describe("yearOnlyScore", () => {
  it("猜中精确年份得满分", () => {
    expect(yearOnlyScore(1998, 1998)).toBe(10000);
  });

  it("区间答案以均值计分，接近均值得分最高", () => {
    const atMean = yearOnlyScore(1998, 2001, 2003);
    const atStart = yearOnlyScore(1998, 1998, 2003);
    expect(atMean).toBeGreaterThan(9900);
    expect(atMean).toBeGreaterThan(atStart);
  });

  it("偏离均值越远分数越低", () => {
    const near = yearOnlyScore(1998, 2001, 2003);
    const far = yearOnlyScore(1998, 2010, 2003);
    expect(near).toBeGreaterThan(far);
  });
});

describe("formatAnswerYear", () => {
  it("区间答案展示均值", () => {
    expect(formatAnswerYear(1998, 2003)).toContain("均值");
    expect(formatAnswerYear(1998, 2003)).toContain("2001");
  });
});

describe("scoreRound", () => {
  it("回忆杀题仅计年份分", () => {
    const result = scoreRound({
      questionType: "nostalgia",
      actualYear: 1999,
      guessedYear: 1999,
    });
    expect(result.locationPts).toBe(0);
    expect(result.yearPts).toBe(10000);
    expect(result.total).toBe(10000);
    expect(result.distanceKm).toBeNull();
  });

  it("历史题合并地点与年份分", () => {
    const result = scoreRound({
      questionType: "historical",
      actualYear: 1789,
      guessedYear: 1789,
      actualLat: 48.8533,
      actualLng: 2.3692,
      guessLat: 48.8533,
      guessLng: 2.3692,
    });
    expect(result.locationPts).toBe(5000);
    expect(result.yearPts).toBe(5000);
    expect(result.total).toBe(10000);
    expect(result.distanceKm).toBe(0);
  });
});

describe("yearScore / locationScore", () => {
  it("年份完全正确得 5000", () => {
    expect(yearScore(1969, 1969)).toBe(5000);
  });

  it("地点重合得 5000", () => {
    expect(locationScore(0)).toBe(5000);
  });
});
