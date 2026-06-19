import { describe, expect, it } from "vitest";
import {
  getBattleSubmittedPlayers,
  mergeBattleRoundReady,
  mergeBattleSubmittedGuesses,
} from "./battle-room-sync";
import { type PusherGuessSubmitted } from "~/types/battle";

function guess(
  playerId: string,
  roundIndex: number,
  submittedAt: number,
): PusherGuessSubmitted {
  return {
    playerId,
    roundIndex,
    lat: 35,
    lng: 139,
    year: 0,
    submittedAt,
  };
}

describe("battle room sync helpers", () => {
  it("keeps local submitted guesses when an older same-round snapshot arrives", () => {
    const hostGuess = guess("host", 3, 1000);
    const guestGuess = guess("guest", 3, 1100);

    const merged = mergeBattleSubmittedGuesses(
      { host: hostGuess, guest: guestGuess },
      { host: hostGuess },
      3,
    );

    expect(Object.keys(merged).sort()).toEqual(["guest", "host"]);
    expect(getBattleSubmittedPlayers(merged)).toEqual({
      host: true,
      guest: true,
    });
  });

  it("drops guesses from other rounds while merging", () => {
    const merged = mergeBattleSubmittedGuesses(
      { host: guess("host", 2, 1000) },
      { guest: guess("guest", 3, 1100) },
      3,
    );

    expect(Object.keys(merged)).toEqual(["guest"]);
  });

  it("keeps local ready players when an older result snapshot arrives", () => {
    expect(
      mergeBattleRoundReady({ host: true, guest: true }, { host: true }),
    ).toEqual({
      host: true,
      guest: true,
    });
  });
});
