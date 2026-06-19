import { type BattleSettings } from "~/types/battle";

const LOCATION_ONLY_DAMAGE_MODES = new Set<BattleSettings["questionType"]>([
  "anime",
  "anime-tuxun",
  "foreign",
  "history-tuxun",
  "tuxun",
]);

export function calcBattleDamage(
  topScore: number,
  playerScore: number,
  modeType: BattleSettings["questionType"],
) {
  const diff = Math.max(0, topScore - playerScore);
  if (diff <= 0) return 0;

  const divisor = LOCATION_ONLY_DAMAGE_MODES.has(modeType) ? 5 : 500;
  return Math.max(1, Math.floor(diff / divisor));
}
