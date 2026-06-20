import { describe, expect, it } from "vitest";
import {
  BATTLE_LOBBY_PUSHER_PENDING_MS,
  mergeBattleLobbyPlayers,
} from "./battle-room-sync";
import { type BattlePlayer } from "~/types/battle";

function player(id: string, name = id): BattlePlayer {
  return {
    id,
    name,
    avatar: { icon: "🎮", color: "#ec4899" },
    hp: 100,
    isHost: id === "host",
  };
}

describe("mergeBattleLobbyPlayers", () => {
  it("always keeps the local player even if the server snapshot is stale", () => {
    expect(
      mergeBattleLobbyPlayers(
        { guest: player("guest") },
        { host: player("host") },
        player("guest"),
        {},
      ),
    ).toMatchObject({
      host: { id: "host" },
      guest: { id: "guest" },
    });
  });

  it("keeps recent pusher-only players until the server catches up", () => {
    const now = Date.now();
    expect(
      mergeBattleLobbyPlayers(
        { host: player("host"), guest: player("guest") },
        { host: player("host") },
        player("host"),
        { guest: now - 1_000 },
        now,
      ),
    ).toMatchObject({
      host: { id: "host" },
      guest: { id: "guest" },
    });
  });

  it("drops stale pusher-only players after the grace window", () => {
    const now = Date.now();
    const result = mergeBattleLobbyPlayers(
      { host: player("host"), guest: player("guest") },
      { host: player("host") },
      player("host"),
      { guest: now - BATTLE_LOBBY_PUSHER_PENDING_MS - 1 },
      now,
    );

    expect(Object.keys(result).sort()).toEqual(["host"]);
    expect(result.host?.id).toBe("host");
    expect(result.guest).toBeUndefined();
  });
});
