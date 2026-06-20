import { isAnimeBattleQuestion } from "~/lib/battle-question";
import {
  locationRoundScore,
  type LocationRoundScoreResult,
} from "~/lib/scoring";
import { type BattleQuestion } from "~/types/battle";

/**
 * 当本轮最高分突破常规满分上限（>100）时，对落后方造成的伤害额外放大的倍率。
 * 让「超神一击」在对战中拥有明显的压制力与情绪价值。
 */
export const BATTLE_BREAKTHROUGH_DAMAGE_MULTIPLIER = 1.5;

export function calcBattleDamage(
  topScore: number,
  playerScore: number,
  options?: { breakthrough?: boolean },
) {
  const diff = Math.max(0, topScore - playerScore);
  const multiplier = options?.breakthrough
    ? BATTLE_BREAKTHROUGH_DAMAGE_MULTIPLIER
    : 1;
  return Math.round(diff * multiplier);
}

export function calcBattleLocationScore({
  question,
  distanceKm,
  elapsedSeconds,
  timePerRound,
}: {
  question: BattleQuestion;
  distanceKm: number;
  elapsedSeconds: number;
  timePerRound: number;
}): LocationRoundScoreResult {
  return locationRoundScore({
    distanceKm,
    elapsedSeconds,
    speedCompensationWindowSeconds: timePerRound,
    soloAnimeScoring: isAnimeBattleQuestion(question),
  });
}
