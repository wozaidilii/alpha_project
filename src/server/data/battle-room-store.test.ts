import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DEFAULT_BATTLE_SETTINGS,
  cancelBattleRoomStart,
  getBattleRoomSnapshot,
  joinBattleRoom,
  leaveBattleRoom,
  markBattleRoomStarting,
  resetBattleRoomStoreForTests,
  startBattleRoom,
} from "./battle-room-store";
import { type BattlePlayer, type BattleSettings } from "~/types/battle";

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

  it("syncs lobby settings and two players", () => {
    joinBattleRoom({
      roomId: "ROOM01",
      player: player("host", true),
      settings,
    });
    const snapshot = joinBattleRoom({
      roomId: "ROOM01",
      player: player("guest"),
    });

    expect(snapshot.phase).toBe("lobby");
    expect(snapshot.settings.questionType).toBe("foreign");
    expect(Object.keys(snapshot.players)).toEqual(["host", "guest"]);
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

  it("rejects a third player", () => {
    joinBattleRoom({
      roomId: "ROOM05",
      player: player("host", true),
      settings,
    });
    joinBattleRoom({ roomId: "ROOM05", player: player("guest") });

    expect(() =>
      joinBattleRoom({ roomId: "ROOM05", player: player("third") }),
    ).toThrow("房间已满");
  });
});
