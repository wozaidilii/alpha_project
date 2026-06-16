import { describe, expect, it } from "vitest";
import { buildHistoryTuxunPlayState } from "./history-tuxun-puzzle";
import { type LocationTuxunPuzzle } from "~/types/location-tuxun";

const puzzle: LocationTuxunPuzzle = {
  puzzleId: "city:test",
  location: "测试地点",
  answerName: "测试市",
  answerContext: "测试上下文",
  centerLat: 30,
  centerLng: 120,
  radiusKm: 20,
  clues: ["线索一"],
  funfact: ["冷知识"],
  questionIds: ["q1"],
};

describe("buildHistoryTuxunPlayState", () => {
  it("uses the prevalidated panorama scene instead of generating a new point", () => {
    const playState = buildHistoryTuxunPlayState(puzzle, {
      lat: 30.123,
      lng: 120.456,
      panoId: "pano-1",
    });

    expect(playState.sceneLat).toBe(30.123);
    expect(playState.sceneLng).toBe(120.456);
    expect(playState.scenePanoId).toBe("pano-1");
  });
});
