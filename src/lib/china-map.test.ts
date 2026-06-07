import { describe, expect, it } from "vitest";
import { CHINA_BOUNDS, clampToChina } from "./china-map";

describe("china-map", () => {
  it("将中国坐标限制在国界范围内", () => {
    expect(clampToChina({ lat: 10, lng: 100 })).toEqual({
      lat: CHINA_BOUNDS.southWest.lat,
      lng: 100,
    });
  });
});
