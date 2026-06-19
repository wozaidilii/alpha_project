import { describe, expect, it, vi } from "vitest";
import {
  ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER,
  ANIME_GUESSR_PLACEHOLDER_IMAGE_URL,
  buildAnimeGuessrImageUrl,
  buildGoogleMapsStreetViewUrl,
  filterAnimeGuessrQuestionsByTier,
  getAnimeGuessrQuestionDifficulty,
  getAnimeGuessrQuestionText,
  isAnimeGuessrQuestion,
  pickAnimeGuessrQuestions,
  toAnimeStreetViewLocation,
  type AnimeGuessrQuestion,
} from "~/lib/anime-guessr";
import { DEFAULT_ANIME_LOCALE } from "~/lib/anime-locale";

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
  it("defaults the public site language to English", () => {
    expect(DEFAULT_ANIME_LOCALE).toBe("en");
  });

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

  it("does not duplicate the anime path when the public base already includes it", () => {
    expect(
      buildAnimeGuessrImageUrl(
        "anime/51_CLANNAD/5c4dgq9pm.jpg",
        "https://example.com/anime-gussr/anime/",
      ),
    ).toBe("https://example.com/anime-gussr/anime/51_CLANNAD/5c4dgq9pm.jpg");
  });

  it("accepts object keys pasted with the bucket prefix", () => {
    expect(
      buildAnimeGuessrImageUrl(
        "anime-gussr/anime/51_CLANNAD/5c4dgq9pm.jpg",
        "https://example.com/",
      ),
    ).toBe("https://example.com/anime/51_CLANNAD/5c4dgq9pm.jpg");
  });

  it("uses the configured public base in development unless local images are explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ANIME_GUESSR_USE_LOCAL_IMAGES", "false");

    expect(
      buildAnimeGuessrImageUrl(
        "anime/51_CLANNAD/5c4dgq9pm.jpg",
        "https://example.com/anime-gussr/",
      ),
    ).toBe("https://example.com/anime-gussr/anime/51_CLANNAD/5c4dgq9pm.jpg");

    vi.unstubAllEnvs();
  });

  it("uses the local image API route when local images are enabled", () => {
    const previousFlag = process.env.NEXT_PUBLIC_ANIME_GUESSR_USE_LOCAL_IMAGES;
    process.env.NEXT_PUBLIC_ANIME_GUESSR_USE_LOCAL_IMAGES = "true";

    expect(buildAnimeGuessrImageUrl("anime/51_CLANNAD/5c4dgq9pm.jpg", "")).toBe(
      "/api/anime-guessr-image/anime/51_CLANNAD/5c4dgq9pm.jpg",
    );

    process.env.NEXT_PUBLIC_ANIME_GUESSR_USE_LOCAL_IMAGES = previousFlag;
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

  it("builds a Google Maps Street View URL from answer coordinates", () => {
    const url = new URL(buildGoogleMapsStreetViewUrl(sampleQuestion));

    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps/@");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("map_action")).toBe("pano");
    expect(url.searchParams.get("viewpoint")).toBe("35.7728,139.3545");
    expect(url.searchParams.get("heading")).toMatch(/^\d+$/);
    expect(url.searchParams.get("pitch")).toBe("0");
  });

  it("returns localized question text with base-field fallback", () => {
    expect(getAnimeGuessrQuestionText(sampleQuestion)).toMatchObject({
      title: "Sunset Meeting Slope",
      description: "The slope from the CLANNAD opening.",
      answerName: "Slope near Lake Tama",
    });
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

  it("filters questions by difficulty tier", () => {
    const easy = { ...sampleQuestion, id: "easy", difficulty: 1 as const };
    const medium = { ...sampleQuestion, id: "medium", difficulty: 2 as const };
    const hard = { ...sampleQuestion, id: "hard", difficulty: 3 as const };
    const unrated = { ...sampleQuestion, id: "unrated", difficulty: undefined };

    expect(
      filterAnimeGuessrQuestionsByTier(
        [easy, medium, hard, unrated],
        "beginner",
      ),
    ).toEqual([easy]);
    expect(
      filterAnimeGuessrQuestionsByTier([easy, medium, hard], "intermediate"),
    ).toEqual([easy, medium]);
    expect(
      filterAnimeGuessrQuestionsByTier([easy, medium, hard], "master"),
    ).toEqual([easy, medium, hard]);
    expect(getAnimeGuessrQuestionDifficulty(unrated)).toBe(5);
    expect(
      filterAnimeGuessrQuestionsByTier([easy, hard, unrated], "miracle"),
    ).toHaveLength(3);
    expect(
      pickAnimeGuessrQuestions(
        [easy, medium],
        5,
        ANIME_GUESSR_DEFAULT_DIFFICULTY_TIER,
      ),
    ).toEqual([easy]);
  });

  it("accepts questions without a year", () => {
    const withoutYear: Partial<AnimeGuessrQuestion> = { ...sampleQuestion };
    delete withoutYear.year;
    expect(isAnimeGuessrQuestion(withoutYear)).toBe(true);
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
