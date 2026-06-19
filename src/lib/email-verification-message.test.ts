import { describe, expect, it } from "vitest";
import { buildVerificationEmailMessage } from "~/lib/email-verification-message";

describe("email verification message", () => {
  it("builds password reset messages in English by default", () => {
    const message = buildVerificationEmailMessage({
      code: "123456",
      purpose: "password_reset",
    });

    expect(message.subject).toBe("Your AniGuessr password reset code");
    expect(message.text).toContain(
      "Your AniGuessr password reset code is 123456.",
    );
    expect(message.text).toContain("It expires in 10 minutes.");
    expect(message.html).toContain("<strong>123456</strong>");
  });

  it("defaults unspecified verification messages to login copy", () => {
    const message = buildVerificationEmailMessage({ code: "654321" });

    expect(message.subject).toBe("Your AniGuessr login code");
    expect(message.text).toContain("Your AniGuessr login code is 654321.");
  });
});
