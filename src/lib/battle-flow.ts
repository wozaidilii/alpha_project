import {
  type BattlePlayer,
  type BattleRoundResult,
  type BattleSettings,
} from "~/types/battle";

export function isBattlePlayerAlive(player: BattlePlayer | undefined) {
  return (player?.hp ?? 0) > 0;
}

export function getActiveBattlePlayerIds(
  players: Record<string, BattlePlayer>,
) {
  return Object.keys(players).filter((id) =>
    isBattlePlayerAlive(players[id]),
  );
}

export function hasRoundEliminations(result: BattleRoundResult) {
  return Object.entries(result.damage).some(
    ([playerId, damage]) =>
      damage > 0 && (result.hpAfter[playerId] ?? 0) <= 0,
  );
}

export function getRoundEliminatedPlayerIds(result: BattleRoundResult) {
  return Object.keys(result.hpAfter).filter(
    (playerId) =>
      (result.damage[playerId] ?? 0) > 0 &&
      (result.hpAfter[playerId] ?? 0) <= 0,
  );
}

export function areBattlePlayersReady(
  players: Record<string, BattlePlayer>,
  roundReady: Record<string, boolean>,
) {
  const activeIds = getActiveBattlePlayerIds(players);
  return (
    activeIds.length > 0 &&
    activeIds.every((id) => roundReady[id] === true)
  );
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
