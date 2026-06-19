import { describe, expect, it } from "vitest";
import {
  buildAnimeTuxunPlayState,
  getCachedAnimeTuxunScene,
} from "./anime-tuxun-puzzle";
import { type AnimeTuxunPuzzle } from "~/types/anime-tuxun";

const puzzle: AnimeTuxunPuzzle = {
  puzzleId: "anime:test",
  location: "测试市",
  answerName: "测试市",
  answerContext: "测试上下文",
  centerLat: 35,
  centerLng: 139,
  radiusKm: 12,
  clues: ["《测试番》中的场景在此地取景"],
  funfact: ["答后补充"],
  animeTitles: ["测试番"],
  questionIds: ["q1"],
};

describe("buildAnimeTuxunPlayState", () => {
  it("uses the prevalidated panorama scene", () => {
    const playState = buildAnimeTuxunPlayState(puzzle, {
      lat: 35.123,
      lng: 139.456,
      panoId: "pano-1",
    });

    expect(playState.sceneLat).toBe(35.123);
    expect(playState.sceneLng).toBe(139.456);
    expect(playState.scenePanoId).toBe("pano-1");
    expect(playState.animeTitles).toEqual(["测试番"]);
  });
});

describe("getCachedAnimeTuxunScene", () => {
  it("returns a prevalidated scene from the puzzle payload", () => {
    expect(
      getCachedAnimeTuxunScene({
        ...puzzle,
        streetViewScene: {
          lat: 35.456,
          lng: 139.789,
          panoId: "cached-pano",
        },
      }),
    ).toEqual({
      lat: 35.456,
      lng: 139.789,
      panoId: "cached-pano",
    });
  });
});
