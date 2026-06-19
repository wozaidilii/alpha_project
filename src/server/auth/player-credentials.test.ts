import { describe, expect, it } from "vitest";
import {
  isEmailIdentifier,
  normalizeUsername,
  normalizeUsernameKey,
} from "~/server/auth/player-credentials";

describe("player credentials", () => {
  it("normalizes display usernames", () => {
    expect(normalizeUsername("  Sakura   Kinomoto  ")).toBe("Sakura Kinom");
    expect(normalizeUsername(" 星之旅人 ")).toBe("星之旅人");
  });

  it("derives case-insensitive username keys", () => {
    expect(normalizeUsernameKey("  Sakura  ")).toBe("sakura");
    expect(normalizeUsernameKey("星之旅人")).toBe("星之旅人");
  });

  it("detects email identifiers", () => {
    expect(isEmailIdentifier("name@example.com")).toBe(true);
    expect(isEmailIdentifier("sakura")).toBe(false);
  });
});
