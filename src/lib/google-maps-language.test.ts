import { describe, expect, it } from "vitest";
import { getGoogleMapsLanguage } from "./google-maps-language";

describe("getGoogleMapsLanguage", () => {
  it("maps site locales to Google Maps language codes", () => {
    expect(getGoogleMapsLanguage("zh")).toBe("zh-CN");
    expect(getGoogleMapsLanguage("ja")).toBe("ja");
    expect(getGoogleMapsLanguage("en")).toBe("en");
  });
});
