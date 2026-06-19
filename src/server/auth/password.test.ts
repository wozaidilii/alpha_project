import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "~/server/auth/password";

describe("password auth", () => {
  it("hashes passwords without storing plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).toMatch(/^scrypt:[0-9a-f]+:[0-9a-f]+$/);
    expect(hash).not.toContain("correct horse battery staple");
  });

  it("verifies matching passwords", async () => {
    const hash = await hashPassword("anime-guessr-secret");

    await expect(verifyPassword("anime-guessr-secret", hash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("wrong-secret", hash)).resolves.toBe(false);
  });

  it("rejects missing or malformed hashes", async () => {
    await expect(verifyPassword("secret", null)).resolves.toBe(false);
    await expect(verifyPassword("secret", "plaintext")).resolves.toBe(false);
    await expect(verifyPassword("secret", "scrypt:salt:not-hex")).resolves.toBe(
      false,
    );
  });
});
