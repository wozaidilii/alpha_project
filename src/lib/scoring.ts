import { MODERN_ANCHOR } from "~/lib/timeline";

// Haversine formula — distance in km between two lat/lng points
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Max distance score: 5000. Score decays with distance.
// Full score within ~25km, zero at ~15000km
export function locationScore(distanceKm: number): number {
  return Math.round(5000 * Math.exp(-distanceKm / 2000));
}

// Max year score: 5000. Score decays with year difference.
// Events closer to the modern anchor (2026) penalise year errors more heavily;
// ancient events are more lenient.
export function yearScore(actualYear: number, guessedYear: number): number {
  const diff = Math.abs(actualYear - guessedYear);
  const distFromModern = Math.abs(actualYear - MODERN_ANCHOR);
  const modernness = Math.exp(-distFromModern / 600);
  const decayScale = 220 - modernness * (220 - 55);
  return Math.round(5000 * Math.exp(-diff / decayScale));
}

export function totalScore(locationPts: number, yearPts: number): number {
  return locationPts + yearPts;
}

/** 年份区间答案取均值作为计分基准 */
export function getTargetYear(year: number, yearEnd?: number): number {
  if (yearEnd === undefined) return year;
  return (year + yearEnd) / 2;
}

/**
 * 回忆杀 / 网络哏：仅年份作答，满分 10000。
 * 若提供 yearEnd，以区间均值作为标准答案计分。
 */
export function yearOnlyScore(
  actualYear: number,
  guessedYear: number,
  yearEnd?: number,
): number {
  const targetYear = getTargetYear(actualYear, yearEnd);
  return Math.min(10000, yearScore(targetYear, guessedYear) * 2);
}

/** 结果页展示：单年或区间（附均值） */
export function formatAnswerYear(year: number, yearEnd?: number): string {
  if (yearEnd === undefined) return formatYear(year);
  const meanYear = Math.round(getTargetYear(year, yearEnd));
  return `${formatYear(year)} – ${formatYear(yearEnd)}（均值 ${formatYear(meanYear)}）`;
}

/** 冷知识题：答对满分 10000，答错 0 */
export function quizScore(isCorrect: boolean): number {
  return isCorrect ? 10000 : 0;
}

export interface RoundScoreInput {
  questionType: "historical" | "funfact" | "nostalgia" | "meme";
  actualYear: number;
  guessedYear: number;
  yearEnd?: number;
  actualLat?: number;
  actualLng?: number;
  guessLat?: number;
  guessLng?: number;
  correctIndex?: number;
  guessedIndex?: number;
}

export interface RoundScoreResult {
  locationPts: number;
  yearPts: number;
  quizPts: number;
  total: number;
  distanceKm: number | null;
  isCorrect?: boolean;
}

/** 按题型统一计分 */
export function scoreRound(input: RoundScoreInput): RoundScoreResult {
  if (input.questionType === "funfact") {
    const guessedIndex = input.guessedIndex;
    const isCorrect =
      guessedIndex !== undefined &&
      input.correctIndex !== undefined &&
      guessedIndex === input.correctIndex;
    const pts = quizScore(isCorrect);

    return {
      locationPts: 0,
      yearPts: 0,
      quizPts: pts,
      total: pts,
      distanceKm: null,
      isCorrect,
    };
  }

  const yearPts = yearOnlyScore(
    input.actualYear,
    input.guessedYear,
    input.yearEnd,
  );

  if (input.questionType !== "historical") {
    return {
      locationPts: 0,
      yearPts,
      quizPts: 0,
      total: yearPts,
      distanceKm: null,
    };
  }

  const {
    actualLat,
    actualLng,
    guessLat,
    guessLng,
  } = input;

  if (
    actualLat === undefined ||
    actualLng === undefined ||
    guessLat === undefined ||
    guessLng === undefined
  ) {
    throw new Error("历史题计分需要地点坐标");
  }

  const distanceKm = haversineDistance(
    actualLat,
    actualLng,
    guessLat,
    guessLng,
  );
  const locationPts = locationScore(distanceKm);
  const historicalYearPts = yearScore(input.actualYear, input.guessedYear);

  return {
    locationPts,
    yearPts: historicalYearPts,
    quizPts: 0,
    total: totalScore(locationPts, historicalYearPts),
    distanceKm,
  };
}

/**
 * Speed multiplier: 2.0x if submitted instantly, 1.0x at time limit.
 * @param roundStartTime  Date.now() when round began
 * @param submittedAt     Date.now() when player submitted
 * @param timePerRound    Seconds allowed per round
 */
export function calcSpeedMultiplier(
  roundStartTime: number,
  submittedAt: number,
  timePerRound: number,
): number {
  const elapsedSec = Math.max(0, (submittedAt - roundStartTime) / 1000);
  const ratio = Math.min(1, elapsedSec / timePerRound); // 0 = instant, 1 = deadline
  // 2x instant → 1x deadline, never below 1
  return Math.max(1, 2 - ratio);
}

export function formatYear(year: number): string {
  if (year < 0) return `公元前 ${Math.abs(year)} 年`;
  return `公元 ${year} 年`;
}
