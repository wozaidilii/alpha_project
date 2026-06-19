import { type AnimeLocale } from "~/lib/anime-locale";

export interface GoogleGuessMapLabels {
  answerTitle: string;
  answerMarkerLabel: string;
  guessTitle: string;
  guessMarkerLabel: string;
  loadingTitle: string;
  missingKeyTitle: string;
  loadingBody: string;
  missingKeyBody: string;
  distancePrefix: string;
}

export const GOOGLE_GUESS_MAP_LABELS: Record<
  AnimeLocale,
  GoogleGuessMapLabels
> = {
  zh: {
    answerTitle: "正确答案",
    answerMarkerLabel: "答",
    guessTitle: "你的猜测",
    guessMarkerLabel: "猜",
    loadingTitle: "正在加载 Google Maps",
    missingKeyTitle: "需要配置 Google Maps AK",
    loadingBody:
      "地图加载失败时，请确认 Google Maps JavaScript API 和 Street View 已开通。",
    missingKeyBody:
      "在 .env.local 配置 NEXT_PUBLIC_GOOGLE_MAP_AK 后重启开发服务。",
    distancePrefix: "偏差",
  },
  ja: {
    answerTitle: "正解地点",
    answerMarkerLabel: "正",
    guessTitle: "あなたの予想",
    guessMarkerLabel: "予",
    loadingTitle: "Google Maps を読み込み中",
    missingKeyTitle: "Google Maps AK の設定が必要です",
    loadingBody:
      "地図を読み込めない場合は、Google Maps JavaScript API と Street View の有効化を確認してください。",
    missingKeyBody:
      ".env.local に NEXT_PUBLIC_GOOGLE_MAP_AK を設定して開発サーバーを再起動してください。",
    distancePrefix: "誤差",
  },
  en: {
    answerTitle: "Correct answer",
    answerMarkerLabel: "A",
    guessTitle: "Your guess",
    guessMarkerLabel: "G",
    loadingTitle: "Loading Google Maps",
    missingKeyTitle: "Google Maps key required",
    loadingBody:
      "If the map fails to load, confirm Google Maps JavaScript API and Street View are enabled.",
    missingKeyBody:
      "Set NEXT_PUBLIC_GOOGLE_MAP_AK in .env.local and restart the dev server.",
    distancePrefix: "Off by",
  },
};

export function getGoogleGuessMapLabels(locale: AnimeLocale) {
  return GOOGLE_GUESS_MAP_LABELS[locale];
}
