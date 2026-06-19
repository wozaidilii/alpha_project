import { describe, expect, it } from "vitest";
import {
  yearOnlyScore,
  historyYearRoundScore,
  scoreRound,
  yearScore,
  locationScore,
  locationDistanceScore,
  locationRoundScore,
  locationSpeedCompensationScore,
  LOCATION_ROUND_SCORE_MAX,
  LOCATION_FULL_SCORE_DISTANCE_KM,
  LOCATION_PRECISION_ZONE_KM,
  LOCATION_CITY_GUESS_MAX_DISTANCE_PTS,
  LOCATION_FAR_DISTANCE_KM,
  LOCATION_FAR_DISTANCE_MAX_PTS,
  LOCATION_SPEED_COMPENSATION_MAX,
  LOCATION_SOLO_ANIME_BREAKTHROUGH_MAX,
  LOCATION_SOLO_ANIME_OVER_TIME_MAX,
  LOCATION_SOLO_ANIME_TIME_CAP_SECONDS,
  getTargetYear,
  formatAnswerYear,
  quizScore,
  CHINA_LOCATION_SCORE_ZERO_KM,
  LOCATION_ROUND_ZERO_DISTANCE_KM,
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

describe("historyYearRoundScore", () => {
  it("满分年份在第一条线索提交时不扣线索分", () => {
    const result = historyYearRoundScore({
      actualYear: 1945,
      guessedYear: 1945,
      revealedClueCount: 1,
      totalClues: 4,
    });

    expect(result.accuracyPts).toBe(10000);
    expect(result.cluePenaltyPts).toBe(0);
    expect(result.total).toBe(10000);
  });

  it("同样年份准确度下，使用线索越多总分越低", () => {
    const early = historyYearRoundScore({
      actualYear: 1945,
      guessedYear: 1944,
      revealedClueCount: 1,
      totalClues: 4,
    });
    const late = historyYearRoundScore({
      actualYear: 1945,
      guessedYear: 1944,
      revealedClueCount: 4,
      totalClues: 4,
    });

    expect(early.accuracyPts).toBe(late.accuracyPts);
    expect(early.total).toBeGreaterThan(late.total);
    expect(late.cluePenaltyPts).toBeGreaterThan(0);
  });

  it("线索数量越界时按有效范围计分", () => {
    const beforeFirst = historyYearRoundScore({
      actualYear: 1945,
      guessedYear: 1945,
      revealedClueCount: 0,
      totalClues: 3,
    });
    const afterLast = historyYearRoundScore({
      actualYear: 1945,
      guessedYear: 1945,
      revealedClueCount: 99,
      totalClues: 3,
    });

    expect(beforeFirst.total).toBe(10000);
    expect(afterLast.total).toBe(4000);
  });
});

describe("formatAnswerYear", () => {
  it("区间答案展示均值", () => {
    expect(formatAnswerYear(1998, 2003)).toContain("均值");
    expect(formatAnswerYear(1998, 2003)).toContain("2001");
  });
});

describe("quizScore", () => {
  it("答对得满分", () => {
    expect(quizScore(true)).toBe(10000);
  });

  it("答错得零分", () => {
    expect(quizScore(false)).toBe(0);
  });
});

describe("scoreRound", () => {
  it("冷知识题答对得满分", () => {
    const result = scoreRound({
      questionType: "funfact",
      actualYear: 0,
      guessedYear: 0,
      correctIndex: 1,
      guessedIndex: 1,
    });
    expect(result.quizPts).toBe(10000);
    expect(result.total).toBe(10000);
    expect(result.isCorrect).toBe(true);
  });

  it("冷知识题答错得零分", () => {
    const result = scoreRound({
      questionType: "funfact",
      actualYear: 0,
      guessedYear: 0,
      correctIndex: 1,
      guessedIndex: 0,
    });
    expect(result.quizPts).toBe(0);
    expect(result.total).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

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

  it("中国地图距离超过计分范围后地点分归零", () => {
    expect(locationScore(CHINA_LOCATION_SCORE_ZERO_KM)).toBe(0);
    expect(locationScore(CHINA_LOCATION_SCORE_ZERO_KM + 1)).toBe(0);
  });

  it("中国地图一千公里误差只保留少量地点分", () => {
    expect(locationScore(1000)).toBeGreaterThan(0);
    expect(locationScore(1000)).toBeLessThan(1000);
  });
});

describe("locationDistanceScore", () => {
  it("1 km 内得满分", () => {
    expect(locationDistanceScore(0)).toBe(100);
    expect(locationDistanceScore(1)).toBe(100);
  });

  it("1–3 km 从 100 线性递减至 80", () => {
    expect(locationDistanceScore(2)).toBe(90);
    expect(locationDistanceScore(3)).toBe(80);
  });

  it("刚超过 3 km 时距离分上限为 80", () => {
    expect(locationDistanceScore(3.1)).toBeLessThanOrEqual(80);
    expect(locationDistanceScore(50)).toBeLessThanOrEqual(80);
  });

  it("数十 km 误差仍在城市段，分数显著低于满分", () => {
    const pts = locationDistanceScore(50);
    expect(pts).toBeGreaterThan(40);
    expect(pts).toBeLessThanOrEqual(80);
  });

  it("400 km 时距离分为 40", () => {
    expect(locationDistanceScore(LOCATION_FAR_DISTANCE_KM)).toBe(
      LOCATION_FAR_DISTANCE_MAX_PTS,
    );
  });

  it("超过 400 km 后距离分低于 40", () => {
    expect(locationDistanceScore(401)).toBeLessThan(40);
    expect(locationDistanceScore(800)).toBeLessThan(40);
  });

  it("极远误差距离分归零", () => {
    expect(locationDistanceScore(LOCATION_ROUND_ZERO_DISTANCE_KM)).toBe(0);
  });
});

describe("locationSpeedCompensationScore", () => {
  it("开局 20 分，每 10 秒扣 1 分，200 秒扣光", () => {
    expect(locationSpeedCompensationScore(0)).toBe(20);
    expect(locationSpeedCompensationScore(9)).toBe(20);
    expect(locationSpeedCompensationScore(10)).toBe(19);
    expect(locationSpeedCompensationScore(100)).toBe(10);
    expect(locationSpeedCompensationScore(190)).toBe(1);
    expect(locationSpeedCompensationScore(200)).toBe(0);
    expect(locationSpeedCompensationScore(240)).toBe(0);
  });
});

describe("locationRoundScore", () => {
  it("100 秒内精确命中时可突破 100 分上限", () => {
    const result = locationRoundScore({
      distanceKm: 0,
      elapsedSeconds: 50,
      soloAnimeScoring: true,
    });

    expect(result.distancePts).toBe(LOCATION_ROUND_SCORE_MAX);
    expect(result.speedCompensationPts).toBe(15);
    expect(result.total).toBe(115);
    expect(result.scoreBreakthrough).toBe(true);
  });

  it("100 秒内即时提交且距离满分时可达到 120", () => {
    const result = locationRoundScore({
      distanceKm: 0,
      elapsedSeconds: 0,
      soloAnimeScoring: true,
    });

    expect(result.total).toBe(LOCATION_SOLO_ANIME_BREAKTHROUGH_MAX);
    expect(result.scoreBreakthrough).toBe(true);
  });

  it("100 秒内距离分不足 90 时仍按 100 封顶", () => {
    const result = locationRoundScore({
      distanceKm: 50,
      elapsedSeconds: 0,
      soloAnimeScoring: true,
    });

    expect(result.distancePts).toBeLessThan(90);
    expect(result.total).toBeLessThanOrEqual(LOCATION_ROUND_SCORE_MAX);
    expect(result.scoreBreakthrough).toBeUndefined();
  });

  it("100 秒内距离分相同时，提交越快速度补偿越高", () => {
    const fast = locationRoundScore({
      distanceKm: 50,
      elapsedSeconds: 0,
      soloAnimeScoring: true,
    });
    const slow = locationRoundScore({
      distanceKm: 50,
      elapsedSeconds: 50,
      soloAnimeScoring: true,
    });

    expect(fast.distancePts).toBe(slow.distancePts);
    expect(fast.speedCompensationPts).toBeGreaterThan(
      slow.speedCompensationPts,
    );
    expect(fast.total).toBeGreaterThan(slow.total);
    expect(fast.total).toBeLessThanOrEqual(LOCATION_ROUND_SCORE_MAX);
  });

  it("100 秒内距离 ≥90 且速度极快时可突破 100", () => {
    const result = locationRoundScore({
      distanceKm: 2,
      elapsedSeconds: 5,
      soloAnimeScoring: true,
    });

    expect(result.distancePts).toBeGreaterThanOrEqual(90);
    expect(result.total).toBeGreaterThan(LOCATION_ROUND_SCORE_MAX);
    expect(result.scoreBreakthrough).toBe(true);
  });

  it("超过 100 秒后即使距离满分也不能再到 100", () => {
    const result = locationRoundScore({
      distanceKm: 0,
      elapsedSeconds: 101,
      soloAnimeScoring: true,
    });

    expect(result.distancePts).toBe(LOCATION_ROUND_SCORE_MAX);
    expect(result.total).toBe(LOCATION_SOLO_ANIME_OVER_TIME_MAX);
  });

  it("非单人模式仍按 100 分封顶", () => {
    const result = locationRoundScore({
      distanceKm: 0,
      elapsedSeconds: 0,
    });

    expect(result.total).toBe(LOCATION_ROUND_SCORE_MAX);
  });

  it("极远误差时距离分归零，仍可叠加时间补偿", () => {
    const result = locationRoundScore({
      distanceKm: LOCATION_ROUND_ZERO_DISTANCE_KM,
      elapsedSeconds: 0,
      soloAnimeScoring: true,
    });

    expect(result.distancePts).toBe(0);
    expect(result.speedCompensationPts).toBe(LOCATION_SPEED_COMPENSATION_MAX);
    expect(result.total).toBe(LOCATION_SPEED_COMPENSATION_MAX);
  });
});
