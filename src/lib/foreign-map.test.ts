import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOREIGN_COUNTRY,
  clampToBounds,
  getForeignCountry,
  isPointInsideBounds,
} from "./foreign-map";

describe("foreign-map", () => {
  it("defines Japan as the first foreign country", () => {
    expect(DEFAULT_FOREIGN_COUNTRY.slug).toBe("japan");
    expect(getForeignCountry("japan")).toBe(DEFAULT_FOREIGN_COUNTRY);
  });

  it("detects points inside Japan bounds", () => {
    expect(
      isPointInsideBounds(
        { lat: 35.6812, lng: 139.7671 },
        DEFAULT_FOREIGN_COUNTRY.bounds,
      ),
    ).toBe(true);

    expect(
      isPointInsideBounds(
        { lat: 39.9042, lng: 116.4074 },
        DEFAULT_FOREIGN_COUNTRY.bounds,
      ),
    ).toBe(false);
  });

  it("clamps points to Japan bounds", () => {
    expect(
      clampToBounds({ lat: 60, lng: 170 }, DEFAULT_FOREIGN_COUNTRY.bounds),
    ).toEqual(DEFAULT_FOREIGN_COUNTRY.bounds.northEast);
  });
});
