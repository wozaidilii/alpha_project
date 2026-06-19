export function calcBattleDamage(topScore: number, playerScore: number) {
  const diff = Math.max(0, topScore - playerScore);
  return Math.round(diff);
}
