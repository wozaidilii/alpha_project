import { type BattlePlayer, type BattleSettings } from "~/types/battle";

export function areBattlePlayersReady(
  players: Record<string, BattlePlayer>,
  roundReady: Record<string, boolean>,
) {
  const ids = Object.keys(players);
  return ids.length > 0 && ids.every((id) => roundReady[id] === true);
}

export function isBattleFinalRound(
  roundIndex: number,
  settings: BattleSettings,
  players: Record<string, BattlePlayer>,
) {
  return (
    roundIndex >= settings.rounds - 1 || hasSingleRemainingBattlePlayer(players)
  );
}

export function hasSingleRemainingBattlePlayer(
  players: Record<string, BattlePlayer>,
) {
  const ids = Object.keys(players);
  if (ids.length <= 1) return true;

  const aliveCount = ids.filter((id) => (players[id]?.hp ?? 0) > 0).length;
  return aliveCount <= 1;
}

export function shouldFinishBattleFromResult({
  roundIndex,
  settings,
  players,
  roundReady,
}: {
  roundIndex: number;
  settings: BattleSettings;
  players: Record<string, BattlePlayer>;
  roundReady: Record<string, boolean>;
}) {
  if (!isBattleFinalRound(roundIndex, settings, players)) return false;
  if (hasSingleRemainingBattlePlayer(players)) return true;
  return areBattlePlayersReady(players, roundReady);
}
