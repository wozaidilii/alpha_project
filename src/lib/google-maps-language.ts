import { type AnimeLocale } from "~/lib/anime-locale";
import { type GoogleMapsLanguage } from "~/lib/google-street-view";

export function getGoogleMapsLanguage(locale: AnimeLocale): GoogleMapsLanguage {
  if (locale === "zh") return "zh-CN";
  if (locale === "ja") return "ja";
  return "en";
}
