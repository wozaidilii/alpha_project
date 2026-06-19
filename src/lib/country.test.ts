import { describe, expect, it } from "vitest";
import {
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
    expect(countryCodeToLabel("JP")).toBe("日本");
  });
});
