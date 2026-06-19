import { describe, expect, it } from "vitest";
import {
  areBattlePlayersReady,
  isBattleFinalRound,
  shouldFinishBattleFromResult,
} from "./battle-flow";
import { type BattlePlayer, type BattleSettings } from "~/types/battle";

const settings: BattleSettings = {
  startingHp: 100,
  timePerRound: 120,
  questionType: "anime",
  rounds: 3,
};

function player(id: string, hp: number): BattlePlayer {
  return {
    id,
    name: id,
    avatar: { icon: "🎮", color: "#ec4899" },
    hp,
    isHost: id === "host",
  };
}

describe("battle flow helpers", () => {
  it("treats all listed players as ready regardless of player count", () => {
    expect(
      areBattlePlayersReady({ host: player("host", 100) }, { host: true }),
    ).toBe(true);
  });

  it("finishes on the configured final round", () => {
    expect(
      isBattleFinalRound(2, settings, {
        host: player("host", 100),
        guest: player("guest", 100),
      }),
    ).toBe(true);
  });

  it("finishes when only one player remains alive", () => {
    expect(
      isBattleFinalRound(0, settings, {
        host: player("host", 100),
        guest: player("guest", 0),
        third: player("third", 0),
      }),
    ).toBe(true);
  });

  it("does not finish a non-final round while two players are alive", () => {
    expect(
      shouldFinishBattleFromResult({
        roundIndex: 0,
        settings,
        players: {
          host: player("host", 100),
          guest: player("guest", 50),
        },
        roundReady: { host: true, guest: true },
      }),
    ).toBe(false);
  });

  it("finishes after the final result when everyone is ready", () => {
    expect(
      shouldFinishBattleFromResult({
        roundIndex: 2,
        settings,
        players: {
          host: player("host", 100),
          guest: player("guest", 50),
        },
        roundReady: { host: true, guest: true },
      }),
    ).toBe(true);
  });

  it("does not finish a final-round result before active players are ready", () => {
    expect(
      shouldFinishBattleFromResult({
        roundIndex: 2,
        settings,
        players: {
          host: player("host", 100),
          guest: player("guest", 50),
        },
        roundReady: { host: true },
      }),
    ).toBe(false);
  });

  it("finishes immediately when elimination leaves one player alive", () => {
    expect(
      shouldFinishBattleFromResult({
        roundIndex: 0,
        settings,
        players: {
          host: player("host", 100),
          guest: player("guest", 0),
        },
        roundReady: {},
      }),
    ).toBe(true);
  });
});
