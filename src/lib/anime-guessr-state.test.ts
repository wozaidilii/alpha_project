import { describe, expect, it } from "vitest";
import {
  PENDING_ANIME_FINAL_RESULT_KEY,
  formatAnimeGameCountdown,
  loadPendingAnimeFinalResult,
  normalizePendingAnimeFinalResult,
  savePendingAnimeFinalResult,
  type AnimeRoundResult,
} from "~/lib/anime-guessr-state";
import { type AnimeGuessrQuestion } from "~/lib/anime-guessr";

function createStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

const question: AnimeGuessrQuestion = {
  id: "anitabi_1",
  title: "駅前",
  description: "駅前の風景",
  animeTitle: "Sample Anime",
  year: 2024,
  lat: 35.6812,
  lng: 139.7671,
  location: "東京",
  answerName: "東京駅",
  confidence: "high",
  tags: ["station"],
  funfact: [],
};

const result: AnimeRoundResult = {
  question,
  guess: { lat: 35.68, lng: 139.76 },
  distanceKm: 1.2,
  distancePts: 90,
  speedCompensationPts: 1,
  elapsedSeconds: 42,
  score: 91,
};

describe("anime guessr pending final result", () => {
  it("stores and loads a pending final result for login continuation", () => {
    const storage = createStorage();

    savePendingAnimeFinalResult(
      { questions: [question], results: [result], gameTimedOut: false },
      storage,
    );

    const raw = storage.getItem(PENDING_ANIME_FINAL_RESULT_KEY);
    expect(raw).toContain("anitabi_1");
    expect(loadPendingAnimeFinalResult(storage)?.results[0]?.score).toBe(91);
  });

  it("rejects stale pending final results", () => {
    const now = Date.parse("2026-06-19T01:00:00.000Z");
    const stale = {
      schemaVersion: 1,
      savedAt: Date.parse("2026-06-19T00:00:00.000Z"),
      questions: [question],
      results: [result],
      gameTimedOut: false,
    };

    expect(normalizePendingAnimeFinalResult(stale, now)).toBeNull();
  });
});

describe("formatAnimeGameCountdown", () => {
  it("formats seconds as m:ss", () => {
    expect(formatAnimeGameCountdown(120)).toBe("2:00");
    expect(formatAnimeGameCountdown(9.2)).toBe("0:10");
    expect(formatAnimeGameCountdown(-1)).toBe("0:00");
  });
});
