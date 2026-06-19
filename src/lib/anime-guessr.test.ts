import { describe, expect, it } from "vitest";
import {
  ANIME_GUESSR_PLACEHOLDER_IMAGE_URL,
  buildAnimeGuessrImageUrl,
  getAnimeGuessrQuestionText,
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
  locales: {
    en: {
      title: "Sunset Meeting Slope",
      description: "The slope from the CLANNAD opening.",
      animeTitle: "CLANNAD",
      location: "Tokyo",
      answerName: "Slope near Lake Tama",
      episodeContext: "Season 1 OP",
      funfact: ["A famous pilgrimage spot in Higashiyamato."],
      tags: ["CLANNAD", "Tokyo"],
    },
    ja: {
      title: "夕焼けの出会い坂",
      description: "『CLANNAD』のオープニングに登場する坂道。",
      animeTitle: "CLANNAD -クラナド-",
      location: "東京都",
      answerName: "東京都東大和市多摩湖付近の坂道",
      episodeContext: "第一期OP",
      funfact: ["東京都東大和市にある聖地巡礼スポット。"],
      tags: ["CLANNAD", "東京都"],
    },
  },
};

describe("anime-guessr", () => {
  it("accepts valid anime pilgrimage questions", () => {
    expect(isAnimeGuessrQuestion(sampleQuestion)).toBe(true);
  });

  it("accepts valid coordinates outside Japan", () => {
    expect(
      isAnimeGuessrQuestion({
        ...sampleQuestion,
        lat: 48.8566,
        lng: 2.3522,
      }),
    ).toBe(true);
  });

  it("rejects invalid global coordinates", () => {
    expect(
      isAnimeGuessrQuestion({
        ...sampleQuestion,
        lat: 120,
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

  it("returns localized question text with base-field fallback", () => {
    expect(getAnimeGuessrQuestionText(sampleQuestion, "en")).toMatchObject({
      title: "Sunset Meeting Slope",
      description: "The slope from the CLANNAD opening.",
      answerName: "Slope near Lake Tama",
    });
    expect(getAnimeGuessrQuestionText(sampleQuestion, "zh")).toMatchObject({
      title: "夕阳下的相遇坡道",
      answerName: "东京都东大和市多摩湖附近坡道",
    });
  });

  it("picks at most the requested number of questions", () => {
    expect(pickAnimeGuessrQuestions([sampleQuestion], 5)).toHaveLength(1);
  });

  it("maps anime questions to Google Street View locations", () => {
    const location = toAnimeStreetViewLocation(sampleQuestion, "ja");

    expect(location).toMatchObject({
      id: "anime:anitabi_51_5c4dgq9pm",
      title: "東京都東大和市多摩湖付近の坂道",
      province: "東京都",
      city: "東京都",
      lat: 35.7728,
      lng: 139.3545,
      pitch: 0,
      hint: "『CLANNAD』のオープニングに登場する坂道。",
    });
    expect(location.heading).toBeGreaterThanOrEqual(0);
    expect(location.heading).toBeLessThan(360);
  });
});
