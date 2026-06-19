import { describe, expect, it } from "vitest";
import { classifyPlayerUniqueViolation } from "./postgres-errors";

describe("postgres player errors", () => {
  it("classifies detail-only email unique violations", () => {
    expect(
      classifyPlayerUniqueViolation({
        code: "23505",
        detail: "Key (email)=(test@example.com) already exists.",
      }),
    ).toBe("email");
  });

  it("classifies detail-only username unique violations", () => {
    expect(
      classifyPlayerUniqueViolation({
        code: "23505",
        detail: "Key (username_key)=(sakura) already exists.",
      }),
    ).toBe("username");
  });

  it("ignores non-unique database errors", () => {
    expect(classifyPlayerUniqueViolation({ code: "42703" })).toBeNull();
  });
});
