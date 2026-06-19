import { describe, expect, it } from "vitest";
import {
  COUNTRY_OPTIONS,
  countryCodeToFlagEmoji,
  countryCodeToLabel,
  normalizeCountryCode,
} from "./country";

describe("country helpers", () => {
  it("normalizes two-letter country codes", () => {
    expect(normalizeCountryCode(" jp ")).toBe("JP");
    expect(normalizeCountryCode("usa")).toBeNull();
    expect(normalizeCountryCode(null)).toBeNull();
  });

  it("renders country flags and labels", () => {
    expect(countryCodeToFlagEmoji("US")).toBe("🇺🇸");
    expect(countryCodeToFlagEmoji(null)).toBe("🏳️");
    expect(countryCodeToLabel("JP")).toBe("Japan");
  });

  it("offers a broad flag picker set for player profiles", () => {
    expect(COUNTRY_OPTIONS.length).toBeGreaterThanOrEqual(50);
    expect(COUNTRY_OPTIONS.map((country) => country.code)).toContain("BR");
    expect(COUNTRY_OPTIONS.map((country) => country.code)).toContain("ZA");
  });
});
