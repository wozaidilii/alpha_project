import { isAnimeBattleQuestion } from "~/lib/battle-question";
import {
  locationRoundScore,
  type LocationRoundScoreResult,
} from "~/lib/scoring";
import { type BattleQuestion } from "~/types/battle";

export function calcBattleDamage(topScore: number, playerScore: number) {
  const diff = Math.max(0, topScore - playerScore);
  return Math.round(diff);
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
