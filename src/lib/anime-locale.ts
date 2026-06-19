export const ANIME_LOCALES = ["zh", "ja", "en"] as const;
export type AnimeLocale = (typeof ANIME_LOCALES)[number];

export const DEFAULT_ANIME_LOCALE: AnimeLocale = "en";
export const ANIME_LOCALE_STORAGE_KEY = "aniguessr_locale";

export function isAnimeLocale(value: unknown): value is AnimeLocale {
  return (
    typeof value === "string" &&
    (ANIME_LOCALES as readonly string[]).includes(value)
  );
}

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
    // Ignore storage failures so private browsing can still play.
  }
}

export function withAnimeLocale(path: string, locale: AnimeLocale) {
  const url = new URL(path, "https://aniguessr.local");
  url.searchParams.set("lang", locale);
  return `${url.pathname}${url.search}${url.hash}`;
}
