import { describe, expect, it } from "vitest";
import { calcBattleDamage } from "./battle-scoring";

describe("calcBattleDamage", () => {
  it("does not damage tied top scorers", () => {
    expect(calcBattleDamage(4200, 4200)).toBe(0);
  });

  it("deducts the exact score gap", () => {
    expect(calcBattleDamage(4200, 4000)).toBe(200);
  });

  it("rounds fractional score gaps to whole HP", () => {
    expect(calcBattleDamage(4200.7, 4000.2)).toBe(201);
  });
});
