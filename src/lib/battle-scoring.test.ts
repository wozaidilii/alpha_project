import { describe, expect, it } from "vitest";
import { calcBattleDamage } from "./battle-scoring";

describe("calcBattleDamage", () => {
  it("does not damage tied top scorers", () => {
    expect(calcBattleDamage(4200, 4200, "anime")).toBe(0);
  });

  it("applies at least one point of damage for anime score gaps", () => {
    expect(calcBattleDamage(4200, 4199, "anime")).toBe(1);
  });

  it("uses location battle scaling for anime mode", () => {
    expect(calcBattleDamage(4200, 4000, "anime")).toBe(40);
  });

  it("keeps standard mode gaps on the slower HP scale", () => {
    expect(calcBattleDamage(4200, 4000, "historical")).toBe(1);
  });
});
