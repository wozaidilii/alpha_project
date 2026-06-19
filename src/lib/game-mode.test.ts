import { describe, expect, it } from "vitest";
import { BATTLE_GAME_MODE_LIST, isBattleGameModeSlug } from "./game-mode";

describe("game-mode battle modes", () => {
  it("uses the current Anime Guessr mode for battles instead of the legacy anime-tuxun flow", () => {
    expect(BATTLE_GAME_MODE_LIST.map((mode) => mode.slug)).toEqual(["anime"]);
    expect(isBattleGameModeSlug("anime")).toBe(true);
    expect(isBattleGameModeSlug("anime-tuxun")).toBe(false);
  });
});
