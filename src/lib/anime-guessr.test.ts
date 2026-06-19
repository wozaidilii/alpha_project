import { describe, expect, it } from "vitest";
import {
  ANIME_GUESSR_PLACEHOLDER_IMAGE_URL,
  buildAnimeGuessrImageUrl,
  isAnimeGuessrQuestion,
  pickAnimeGuessrQuestions,
  toAnimeStreetViewLocation,
  type AnimeGuessrQuestion,
} from "~/lib/anime-guessr";

const sampleQuestion: AnimeGuessrQuestion = {
  id: "anitabi_51_5c4dgq9pm",
  title: "夕阳下的相遇坡道",
  description: "在《CLANNAD》的片头动画中出现的坡道。",
  animeTitle: "CLANNAD",
  aspect: "OP画面中的经典坡道",
  year: 2007,
  lat: 35.7728,
  lng: 139.3545,
  location: "东京都",
  answerName: "东京都东大和市多摩湖附近坡道",
  episodeContext: "第一季OP",
  imagePath: "anime/51_CLANNAD/5c4dgq9pm.jpg",
  sourceUrl: "https://anitabi.cn/map?bangumiId=51&pid=5c4dgq9pm",
  funfact: ["该坡道位于东京都东大和市。"],
  difficulty: 1,
  confidence: "high",
  tags: ["CLANNAD", "东京都"],
};

describe("anime-guessr", () => {
  it("accepts valid Japan anime pilgrimage questions", () => {
    expect(isAnimeGuessrQuestion(sampleQuestion)).toBe(true);
  });

  it("rejects questions outside Japan bounds", () => {
    expect(
      isAnimeGuessrQuestion({
        ...sampleQuestion,
        lat: 48.8566,
        lng: 2.3522,
      }),
    ).toBe(false);
  });

  it("builds image URLs from a configurable public base", () => {
    expect(
      buildAnimeGuessrImageUrl(
        "anime/51_CLANNAD/5c4dgq9pm.jpg",
        "https://example.com/anime-gussr/",
      ),
    ).toBe("https://example.com/anime-gussr/anime/51_CLANNAD/5c4dgq9pm.jpg");
  });

  it("does not invent an image URL when no public base is configured", () => {
    expect(buildAnimeGuessrImageUrl(sampleQuestion.imagePath, "")).toBe(
      undefined,
    );
  });

  it("defines a local placeholder image for missing remote assets", () => {
    expect(ANIME_GUESSR_PLACEHOLDER_IMAGE_URL).toBe(
      "/images/anime-placeholder.jpg",
    );
  });

  it("picks at most the requested number of questions", () => {
    expect(pickAnimeGuessrQuestions([sampleQuestion], 5)).toHaveLength(1);
  });

  it("maps anime questions to Google Street View locations", () => {
    const location = toAnimeStreetViewLocation(sampleQuestion);

    expect(location).toMatchObject({
      id: "anime:anitabi_51_5c4dgq9pm",
      title: "东京都东大和市多摩湖附近坡道",
      province: "日本",
      city: "东京都",
      lat: 35.7728,
      lng: 139.3545,
      pitch: 0,
      hint: "在《CLANNAD》的片头动画中出现的坡道。",
    });
    expect(location.heading).toBeGreaterThanOrEqual(0);
    expect(location.heading).toBeLessThan(360);
  });
});
