import { describe, expect, it } from "vitest";
import {
  GUEST_DAILY_FREE_GAMES,
  canStartGuestGame,
  getGuestGamesRemaining,
  markGuestGameStarted,
  normalizeGuestProgress,
  saveGuestGameResult,
} from "./guest-progress";

describe("guest progress", () => {
  it("resets daily play count on a new local day", () => {
    const progress = normalizeGuestProgress(
      {
        guestId: "guest-1",
        dateKey: "2026-06-18",
        startedToday: GUEST_DAILY_FREE_GAMES,
        bestScore: 120,
      },
      "2026-06-19",
    );

    expect(progress.startedToday).toBe(0);
    expect(canStartGuestGame(progress)).toBe(true);
  });

  it("tracks remaining guest games", () => {
    const progress = markGuestGameStarted(
      normalizeGuestProgress({ guestId: "guest-1" }, "2026-06-19"),
    );

    expect(getGuestGamesRemaining(progress)).toBe(GUEST_DAILY_FREE_GAMES - 1);
  });

  it("stores local history and detects new records", () => {
    const result = saveGuestGameResult(
      normalizeGuestProgress({ guestId: "guest-1", bestScore: 200 }),
      {
        id: "game-1",
        score: 320,
        maxScore: 500,
        rounds: 5,
        playedAt: "2026-06-19T00:00:00.000Z",
      },
    );

    expect(result.isNewBest).toBe(true);
    expect(result.progress.bestScore).toBe(320);
    expect(result.progress.history).toHaveLength(1);
  });
});
