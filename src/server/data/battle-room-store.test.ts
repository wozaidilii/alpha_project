import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DEFAULT_BATTLE_SETTINGS,
  cancelBattleRoomStart,
  finishBattleRoom,
  getBattleRoomSnapshot,
  joinBattleRoom,
  leaveBattleRoom,
  markBattleRoomRoundReady,
  markBattleRoomStarting,
  recordBattleRoomRoundResult,
  resetBattleRoomStoreForTests,
  startBattleRoom,
  startBattleRoomRound,
  submitBattleRoomGuess,
} from "./battle-room-store";
import {
  BATTLE_MAX_PLAYERS,
  type BattlePlayer,
  type BattleRoundResult,
  type BattleSettings,
} from "~/types/battle";

const settings: BattleSettings = {
  ...DEFAULT_BATTLE_SETTINGS,
  rounds: 3,
  questionType: "foreign",
};

function player(id: string, isHost = false): BattlePlayer {
  return {
    id,
    name: isHost ? "房主" : "玩家",
    avatar: { icon: "🧭", color: "#f59e0b" },
    hp: 100,
    isHost,
  };
}

describe("battle-room-store", () => {
  beforeEach(() => {
    resetBattleRoomStoreForTests();
  });

  it("syncs lobby settings and more than two players", () => {
    joinBattleRoom({
      roomId: "ROOM01",
      player: player("host", true),
      settings,
    });
    joinBattleRoom({
      roomId: "ROOM01",
      player: player("guest"),
    });
    const snapshot = joinBattleRoom({
      roomId: "ROOM01",
      player: player("third"),
    });

    expect(snapshot.phase).toBe("lobby");
    expect(snapshot.settings.questionType).toBe("foreign");
    expect(Object.keys(snapshot.players)).toEqual(["host", "guest", "third"]);
  });

  it("marks starting and can cancel back to lobby", () => {
    const players = {
      host: player("host", true),
      guest: player("guest"),
    };

    expect(
      markBattleRoomStarting({ roomId: "ROOM02", settings, players }).phase,
    ).toBe("starting");
    expect(cancelBattleRoomStart({ roomId: "ROOM02" })?.phase).toBe("lobby");
  });

  it("stores started game payload for missed Pusher events", () => {
    const players = {
      host: player("host", true),
      guest: player("guest"),
    };

    const snapshot = startBattleRoom({
      roomId: "ROOM03",
      settings,
      players,
      questions: [
        {
          id: "foreign:tokyo",
          type: "foreign",
          title: "东京街景",
          location: {
            id: "tokyo",
            title: "东京街景",
            province: "日本",
            city: "东京",
            lat: 35.6762,
            lng: 139.6503,
            heading: 0,
            pitch: 0,
            hint: "测试街景",
            source: "google-random",
          },
        },
      ],
      roundIndex: 0,
      startTime: 12345,
    });

    expect(snapshot.phase).toBe("playing");
    expect(snapshot.questions?.[0]?.type).toBe("foreign");
    expect(getBattleRoomSnapshot("ROOM03")?.startTime).toBe(12345);
  });

  it("closes the room after all players leave", () => {
    joinBattleRoom({
      roomId: "ROOM04",
      player: player("host", true),
      settings,
    });
    joinBattleRoom({ roomId: "ROOM04", player: player("guest") });

    expect(leaveBattleRoom({ roomId: "ROOM04", playerId: "host" }).closed).toBe(
      false,
    );
    expect(
      leaveBattleRoom({ roomId: "ROOM04", playerId: "guest" }).closed,
    ).toBe(true);
    expect(getBattleRoomSnapshot("ROOM04")).toBeNull();
  });

  it("persists guesses, round results, ready state, next round, and game over", () => {
    joinBattleRoom({
      roomId: "ROOM06",
      player: player("host", true),
      settings,
    });
    joinBattleRoom({ roomId: "ROOM06", player: player("guest") });
    startBattleRoom({
      roomId: "ROOM06",
      settings,
      players: {
        host: player("host", true),
        guest: player("guest"),
      },
      questions: [
        {
          id: "foreign:tokyo",
          type: "foreign",
          title: "东京街景",
          location: {
            id: "tokyo",
            title: "东京街景",
            province: "日本",
            city: "东京",
            lat: 35.6762,
            lng: 139.6503,
            heading: 0,
            pitch: 0,
            hint: "测试街景",
            source: "google-random",
          },
        },
      ],
      roundIndex: 0,
      startTime: 12345,
    });

    submitBattleRoomGuess({
      roomId: "ROOM06",
      guess: {
        playerId: "host",
        roundIndex: 0,
        lat: 35,
        lng: 139,
        year: 0,
        submittedAt: 12400,
      },
    });
    submitBattleRoomGuess({
      roomId: "ROOM06",
      guess: {
        playerId: "ghost",
        roundIndex: 0,
        lat: 0,
        lng: 0,
        year: 0,
        submittedAt: 12401,
      },
    });
    expect(getBattleRoomSnapshot("ROOM06")?.guesses?.host?.lat).toBe(35);
    expect(getBattleRoomSnapshot("ROOM06")?.guesses?.ghost).toBeUndefined();

    const result: BattleRoundResult = {
      roundIndex: 0,
      question: getBattleRoomSnapshot("ROOM06")!.questions![0]!,
      guesses: {
        host: {
          lat: 35,
          lng: 139,
          year: 0,
          guessIndex: null,
          locationPts: 100,
          yearPts: 0,
          quizPts: 0,
          total: 100,
          distanceKm: 10,
          speedMultiplier: 1,
          submitted: true,
        },
        guest: {
          lat: 0,
          lng: 0,
          year: 0,
          guessIndex: null,
          locationPts: 0,
          yearPts: 0,
          quizPts: 0,
          total: 0,
          distanceKm: 0,
          speedMultiplier: 1,
          submitted: false,
        },
      },
      hpAfter: { host: 100, guest: 80 },
      damage: { host: 0, guest: 20 },
    };

    expect(
      recordBattleRoomRoundResult({ roomId: "ROOM06", result })?.roundStatus,
    ).toBe("round-result");
    expect(
      markBattleRoomRoundReady({
        roomId: "ROOM06",
        playerId: "guest",
        roundIndex: 0,
      })?.roundReady?.guest,
    ).toBe(true);
    expect(
      markBattleRoomRoundReady({
        roomId: "ROOM06",
        playerId: "ghost",
        roundIndex: 0,
      })?.roundReady?.ghost,
    ).toBeUndefined();
    expect(
      startBattleRoomRound({
        roomId: "ROOM06",
        roundIndex: 1,
        startTime: 13000,
      })?.guesses,
    ).toEqual({});
    expect(
      finishBattleRoom({
        roomId: "ROOM06",
        results: [result],
        finalHp: { host: 100, guest: 80 },
      })?.roundStatus,
    ).toBe("game-over");
  });

  it("rejects players beyond the multiplayer room limit", () => {
    joinBattleRoom({
      roomId: "ROOM05",
      player: player("host", true),
      settings,
    });
    for (let index = 1; index < BATTLE_MAX_PLAYERS; index += 1) {
      joinBattleRoom({ roomId: "ROOM05", player: player(`guest-${index}`) });
    }

    expect(() =>
      joinBattleRoom({ roomId: "ROOM05", player: player("overflow") }),
    ).toThrow("房间已满");
  });
});
