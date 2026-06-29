import { describe, expect, it } from "vitest";
import {
  getAnimeLocaleFromPathname,
  parseLocaleFromPathname,
  stripLocalePrefix,
  withAnimeLocale,
} from "~/lib/anime-locale";

describe("anime-locale path prefix", () => {
  it("parseLocaleFromPathname 解析语言前缀", () => {
    expect(parseLocaleFromPathname("/ja/game/anime")).toEqual({
      locale: "ja",
      pathname: "/game/anime",
    });
    expect(parseLocaleFromPathname("/en")).toEqual({
      locale: "en",
      pathname: "/",
    });
    expect(parseLocaleFromPathname("/game/anime")).toEqual({
      locale: null,
      pathname: "/game/anime",
    });
  });

  it("withAnimeLocale 生成带前缀路径并去掉旧 lang 参数", () => {
    expect(withAnimeLocale("/game/anime?rounds=5", "zh")).toBe(
      "/zh/game/anime?rounds=5",
    );
    expect(withAnimeLocale("/en/game/anime?lang=ja", "ja")).toBe(
      "/ja/game/anime",
    );
    expect(withAnimeLocale("/", "en")).toBe("/en");
  });

  it("stripLocalePrefix 与 getAnimeLocaleFromPathname", () => {
    expect(stripLocalePrefix("/zh/battle")).toBe("/battle");
    expect(getAnimeLocaleFromPathname("/zh/battle")).toBe("zh");
    expect(getAnimeLocaleFromPathname("/battle")).toBeNull();
  });
});
