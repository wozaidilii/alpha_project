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

export const LOCATION_SCORE_MAX = 5000;
export const CHINA_LOCATION_SCORE_DECAY_KM = 600;
export const CHINA_LOCATION_SCORE_ZERO_KM = 2500;
export const LOCATION_ROUND_SCORE_MAX = 100;
export const LOCATION_SPEED_COMPENSATION_RATIO = 0.15;
export const LOCATION_SPEED_COMPENSATION_WINDOW_SECONDS = 60;
export const HISTORY_YEAR_SCORE_MAX = 10000;
export const HISTORY_YEAR_MIN_CLUE_MULTIPLIER = 0.4;

// 中国地图模式使用更紧的距离分曲线；跨大半个中国的误差应接近 0 分。
export function locationScore(distanceKm: number): number {
  if (distanceKm <= 0) return LOCATION_SCORE_MAX;
  if (distanceKm >= CHINA_LOCATION_SCORE_ZERO_KM) return 0;
  return Math.round(
    LOCATION_SCORE_MAX * Math.exp(-distanceKm / CHINA_LOCATION_SCORE_DECAY_KM),
  );
}

export interface LocationRoundScoreInput {
  distanceKm: number;
  elapsedSeconds?: number;
  speedCompensationWindowSeconds?: number;
}

export interface LocationRoundScoreResult {
  distancePts: number;
  speedCompensationPts: number;
  total: number;
}

export function locationDistanceScore(distanceKm: number): number {
  if (distanceKm <= 0) return LOCATION_ROUND_SCORE_MAX;
  if (distanceKm >= CHINA_LOCATION_SCORE_ZERO_KM) return 0;
  return Math.round(
    LOCATION_ROUND_SCORE_MAX *
      Math.exp(-distanceKm / CHINA_LOCATION_SCORE_DECAY_KM),
  );
}

export function locationRoundScore({
  distanceKm,
  elapsedSeconds,
  speedCompensationWindowSeconds = LOCATION_SPEED_COMPENSATION_WINDOW_SECONDS,
}: LocationRoundScoreInput): LocationRoundScoreResult {
  const distancePts = locationDistanceScore(distanceKm);
  const windowSeconds = Math.max(1, speedCompensationWindowSeconds);
  const elapsed = Math.max(0, elapsedSeconds ?? windowSeconds);
  const speedRatio = Math.max(
    0,
    1 - Math.min(elapsed, windowSeconds) / windowSeconds,
  );
  const availableCompensation = LOCATION_ROUND_SCORE_MAX - distancePts;
  const speedCompensationPts = Math.round(
    availableCompensation * LOCATION_SPEED_COMPENSATION_RATIO * speedRatio,
  );

  return {
    distancePts,
    speedCompensationPts,
    total: Math.min(
      LOCATION_ROUND_SCORE_MAX,
      distancePts + speedCompensationPts,
    ),
  };
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
  return Math.min(
    HISTORY_YEAR_SCORE_MAX,
    yearScore(targetYear, guessedYear) * 2,
  );
}

export interface HistoryYearRoundScoreInput {
  actualYear: number;
  guessedYear: number;
  yearEnd?: number;
  revealedClueCount: number;
  totalClues: number;
}

export interface HistoryYearRoundScoreResult {
  accuracyPts: number;
  cluePenaltyPts: number;
  clueMultiplier: number;
  total: number;
}

export function historyYearRoundScore({
  actualYear,
  guessedYear,
  yearEnd,
  revealedClueCount,
  totalClues,
}: HistoryYearRoundScoreInput): HistoryYearRoundScoreResult {
  const accuracyPts = yearOnlyScore(actualYear, guessedYear, yearEnd);
  const clueTotal = Math.max(1, Math.round(totalClues));
  const usedClues = Math.max(
    1,
    Math.min(clueTotal, Math.round(revealedClueCount)),
  );
  const clueProgress = clueTotal <= 1 ? 0 : (usedClues - 1) / (clueTotal - 1);
  const clueMultiplier =
    1 - clueProgress * (1 - HISTORY_YEAR_MIN_CLUE_MULTIPLIER);
  const total = Math.round(accuracyPts * clueMultiplier);

  return {
    accuracyPts,
    cluePenaltyPts: accuracyPts - total,
    clueMultiplier,
    total,
  };
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

  const { actualLat, actualLng, guessLat, guessLng } = input;

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
