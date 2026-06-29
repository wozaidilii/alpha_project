export const ANIME_LOCALES = ["zh", "ja", "en"] as const;
export type AnimeLocale = (typeof ANIME_LOCALES)[number];

export const DEFAULT_ANIME_LOCALE: AnimeLocale = "en";
export const ANIME_LOCALE_STORAGE_KEY = "aniguessr_locale";
/** middleware 与客户端共用的语言偏好 Cookie 名 */
export const ANIME_LOCALE_COOKIE = ANIME_LOCALE_STORAGE_KEY;

export function isAnimeLocale(value: unknown): value is AnimeLocale {
  return (
    typeof value === "string" &&
    (ANIME_LOCALES as readonly string[]).includes(value)
  );
}

/** 从路径前缀解析语言，例如 /ja/game/anime → { locale: "ja", pathname: "/game/anime" } */
export function parseLocaleFromPathname(pathname: string): {
  locale: AnimeLocale | null;
  pathname: string;
} {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalized.split("/").filter(Boolean);
  const first = segments[0];
  if (first && isAnimeLocale(first)) {
    const rest = segments.slice(1);
    return {
      locale: first,
      pathname: rest.length > 0 ? `/${rest.join("/")}` : "/",
    };
  }
  return { locale: null, pathname: normalized || "/" };
}

export function getAnimeLocaleFromPathname(
  pathname: string | null | undefined,
): AnimeLocale | null {
  if (!pathname) return null;
  return parseLocaleFromPathname(pathname).locale;
}

/** 去掉已有的语言前缀，得到站内裸路径 */
export function stripLocalePrefix(pathname: string): string {
  return parseLocaleFromPathname(pathname).pathname;
}

/** 旧版 ?lang= 查询参数，保留兼容并在 middleware 中 301 到路径前缀 */
export function getAnimeLocaleFromSearch(
  search: string | URLSearchParams | null | undefined,
): AnimeLocale | null {
  if (!search) return null;
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  const value = params.get("lang");
  return isAnimeLocale(value) ? value : null;
}

export function getStoredAnimeLocale(
  fallback: AnimeLocale = DEFAULT_ANIME_LOCALE,
): AnimeLocale {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(ANIME_LOCALE_STORAGE_KEY);
    return isAnimeLocale(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function saveAnimeLocale(locale: AnimeLocale) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANIME_LOCALE_STORAGE_KEY, locale);
  } catch {
    // 隐私模式等场景下忽略写入失败
  }
}

/** 客户端统一解析当前语言：路径前缀 > ?lang= > localStorage > 默认 */
export function resolveAnimeLocale(options?: {
  pathname?: string | null;
  search?: string | null;
  fallback?: AnimeLocale;
}): AnimeLocale {
  const fromPath = getAnimeLocaleFromPathname(options?.pathname);
  if (fromPath) return fromPath;
  const fromSearch = getAnimeLocaleFromSearch(options?.search);
  if (fromSearch) return fromSearch;
  if (typeof window !== "undefined") {
    return getStoredAnimeLocale(options?.fallback ?? DEFAULT_ANIME_LOCALE);
  }
  return options?.fallback ?? DEFAULT_ANIME_LOCALE;
}

/** 为站内路径加上 /{locale} 前缀，保留 query/hash，去掉旧 lang 参数 */
export function withAnimeLocale(path: string, locale: AnimeLocale): string {
  const url = new URL(path, "https://aniguessr.local");
  const innerPath = stripLocalePrefix(url.pathname);
  url.pathname =
    innerPath === "/" ? `/${locale}` : `/${locale}${innerPath}`;
  url.searchParams.delete("lang");
  return `${url.pathname}${url.search}${url.hash}`;
}
