import { describe, expect, it } from "vitest";
import { redactAnswerTerms } from "./anime-clue-redaction";

describe("redactAnswerTerms", () => {
  it("hides answer location terms from clue text", () => {
    expect(
      redactAnswerTerms("东京塔附近的标志性街景", ["东京塔", "东京"]),
    ).toBe("□□附近的标志性街景");
  });

  it("ignores empty and one-character terms", () => {
    expect(redactAnswerTerms("京都的街道", ["", "京"])).toBe("京都的街道");
  });
});
