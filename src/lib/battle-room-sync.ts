import {
  type BattlePlayer,
  type PusherGuessSubmitted,
} from "~/types/battle";

export const BATTLE_LOBBY_PUSHER_PENDING_MS = 15_000;

export function mergeBattleSubmittedGuesses(
  current: Record<string, PusherGuessSubmitted>,
  incoming: Record<string, PusherGuessSubmitted> | undefined,
  roundIndex: number,
) {
  const merged: Record<string, PusherGuessSubmitted> = {};

  for (const [playerId, guess] of Object.entries(incoming ?? {})) {
    if (guess.roundIndex === roundIndex) merged[playerId] = guess;
  }

  for (const [playerId, guess] of Object.entries(current)) {
    if (guess.roundIndex === roundIndex) merged[playerId] = guess;
  }

  return merged;
}

export function getBattleSubmittedPlayers(
  guesses: Record<string, PusherGuessSubmitted>,
) {
  return Object.fromEntries(
    Object.keys(guesses).map((playerId) => [playerId, true]),
  ) as Record<string, boolean>;
}

export function mergeBattleRoundReady(
  current: Record<string, boolean>,
  incoming: Record<string, boolean> | undefined,
) {
  return {
    ...(incoming ?? {}),
    ...current,
  };
}

export function mergeBattleLobbyPlayers(
  current: Record<string, BattlePlayer>,
  server: Record<string, BattlePlayer>,
  localPlayer: BattlePlayer,
  pendingPusherAt: Record<string, number>,
  now = Date.now(),
): Record<string, BattlePlayer> {
  const next: Record<string, BattlePlayer> = {
    ...server,
    [localPlayer.id]: {
      ...(server[localPlayer.id] ?? current[localPlayer.id] ?? localPlayer),
      ...localPlayer,
    },
  };

  for (const [id, player] of Object.entries(current)) {
    if (next[id]) continue;
    const pendingAt = pendingPusherAt[id];
    if (
      pendingAt != null &&
      now - pendingAt < BATTLE_LOBBY_PUSHER_PENDING_MS
    ) {
      next[id] = player;
    }
  }

  return next;
}
