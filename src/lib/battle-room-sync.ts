import { type PusherGuessSubmitted } from "~/types/battle";

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
