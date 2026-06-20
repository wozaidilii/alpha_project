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

export function mergeBattlePlayersPreservingLowerHp(
  current: Record<string, BattlePlayer>,
  incoming: Record<string, BattlePlayer>,
) {
  const next: Record<string, BattlePlayer> = { ...incoming };

  for (const [id, currentPlayer] of Object.entries(current)) {
    const incomingPlayer = next[id];
    if (!incomingPlayer) continue;
    next[id] = {
      ...incomingPlayer,
      hp: Math.min(incomingPlayer.hp, currentPlayer.hp),
    };
  }

  return next;
}

export function applyBattleHpSnapshotPreservingLowerHp(
  current: Record<string, BattlePlayer>,
  hpByPlayer: Record<string, number>,
) {
  const next = { ...current };

  for (const [id, hp] of Object.entries(hpByPlayer)) {
    const player = next[id];
    if (!player) continue;
    next[id] = {
      ...player,
      hp: Math.min(player.hp, hp),
    };
  }

  return next;
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
