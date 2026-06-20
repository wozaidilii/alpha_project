import { describe, expect, it } from "vitest";
import { type BattleQuestion } from "~/types/battle";
import { calcBattleDamage, calcBattleLocationScore } from "./battle-scoring";

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

  it("keeps the plain score gap without a breakthrough", () => {
    expect(calcBattleDamage(100, 80)).toBe(20);
    expect(calcBattleDamage(100, 80, { breakthrough: false })).toBe(20);
  });

  it("amplifies damage when the top score broke through the cap", () => {
    expect(calcBattleDamage(120, 80, { breakthrough: true })).toBe(60);
  });

  it("never damages a tied top scorer even on a breakthrough", () => {
    expect(calcBattleDamage(120, 120, { breakthrough: true })).toBe(0);
  });
});

describe("calcBattleLocationScore", () => {
  it("uses solo anime scoring for anime battle questions", () => {
    const score = calcBattleLocationScore({
      question: { type: "anime" } as BattleQuestion,
      distanceKm: 0,
      elapsedSeconds: 5,
      timePerRound: 120,
    });

    expect(score.total).toBeGreaterThan(100);
    expect(score.scoreBreakthrough).toBe(true);
  });

  it("keeps the normal location cap for non-anime battle questions", () => {
    const score = calcBattleLocationScore({
      question: { type: "foreign" } as BattleQuestion,
      distanceKm: 0,
      elapsedSeconds: 5,
      timePerRound: 120,
    });

    expect(score.total).toBe(100);
    expect(score.scoreBreakthrough).toBeUndefined();
  });
});
