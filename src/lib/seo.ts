import {
  ANIME_LOCALES,
  DEFAULT_ANIME_LOCALE,
  stripLocalePrefix,
  withAnimeLocale,
  type AnimeLocale,
} from "~/lib/anime-locale";

/**
 * 站点对外正式域名。优先级：
 * 1. 显式配置的 NEXT_PUBLIC_SITE_URL（自定义域名时最稳妥）
 * 2. Vercel 注入的部署域名 VERCEL_URL（预览环境自动生效）
 * 3. 兜底使用生产域名
 */
const PRODUCTION_URL = "https://aniguessr.loamly.net";

function normalizeBaseUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.origin;
  } catch {
    return null;
  }
}

export const SITE_URL: string =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  normalizeBaseUrl(process.env.VERCEL_URL) ??
  PRODUCTION_URL;

export const SITE_NAME = "AniGuessr";

export const SITE_DESCRIPTIONS: Record<AnimeLocale, string> = {
  en: "AniGuessr is an anime street-view guessing game: read the anime clue, interrogate the real Street View, and pin the pilgrimage location on the world map.",
  zh: "AniGuessr 是一款动漫街景猜地点游戏：读取番剧线索，在真实街景中寻找答案，把圣地坐标钉回世界地图。",
  ja: "AniGuessr はアニメの手がかりから現実のストリートビューで場所を当てる聖地巡礼ゲームです。",
};

/** 把站内相对路径拼成绝对 URL。 */
export function absoluteUrl(path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${suffix === "/" ? "" : suffix}` || SITE_URL;
}

/** 为指定裸路径生成 /{locale}/... 形式的 hreflang 映射。 */
export function localeAlternates(path = "/"): Record<string, string> {
  const barePath = stripLocalePrefix(path);
  const entries = ANIME_LOCALES.map((locale: AnimeLocale) => {
    const localizedPath = withAnimeLocale(barePath, locale);
    return [locale, absoluteUrl(localizedPath)] as const;
  });
  return {
    ...Object.fromEntries(entries),
    "x-default": absoluteUrl(
      withAnimeLocale(barePath, DEFAULT_ANIME_LOCALE),
    ),
  };
}
