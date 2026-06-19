import { describe, expect, it } from "vitest";
import {
  displayNameFromEmail,
  isEmailLoginCode,
  normalizeEmailLoginCode,
} from "~/lib/email-login-code";

describe("email-login-code", () => {
  it("normalizes pasted verification codes", () => {
    expect(normalizeEmailLoginCode(" 12 3-456 789 ")).toBe("123456");
  });

  it("validates six digit verification codes", () => {
    expect(isEmailLoginCode("123456")).toBe(true);
    expect(isEmailLoginCode("12345")).toBe(false);
    expect(isEmailLoginCode("abcdef")).toBe(false);
  });

  it("derives a compact display name from email", () => {
    expect(displayNameFromEmail("sakura.reader@example.com")).toBe(
      "sakurareader",
    );
    expect(displayNameFromEmail("@example.com")).toBe("邮箱玩家");
  });
});
