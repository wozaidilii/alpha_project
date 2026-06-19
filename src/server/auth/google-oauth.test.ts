import { describe, expect, it } from "vitest";
import {
  buildGoogleAuthorizationUrl,
  getGoogleRedirectUri,
  sanitizeNextPath,
} from "./google-oauth";

describe("google oauth helpers", () => {
  it("sanitizes next paths", () => {
    expect(sanitizeNextPath("/game/anime")).toBe("/game/anime");
    expect(sanitizeNextPath("//evil.example")).toBe("/game/anime");
    expect(sanitizeNextPath("https://evil.example")).toBe("/game/anime");
  });

  it("builds redirect uri from request origin when not configured", () => {
    expect(getGoogleRedirectUri(new URL("https://loamly.net/login"))).toBe(
      "https://loamly.net/api/auth/google/callback",
    );
  });

  it("builds google authorization url with minimal profile scopes", () => {
    const url = buildGoogleAuthorizationUrl({
      clientId: "client-id",
      redirectUri: "https://loamly.net/api/auth/google/callback",
      state: "state-1",
    });

    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("state-1");
  });
});
