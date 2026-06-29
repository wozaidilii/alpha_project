import { type AnimeLocale } from "~/lib/anime-locale";

export const PILGRIMAGE_COPY: Record<
  AnimeLocale,
  {
    siteKicker: string;
    hubTitle: string;
    hubDescription: string;
    animeArchive: string;
    locationArchive: string;
    spotCountLabel: (count: number) => string;
    animeCountLabel: (count: number) => string;
    locationCountLabel: (count: number) => string;
    playGame: string;
    backHub: string;
    backAnime: string;
    backLocation: string;
    spotsInAnime: (title: string, count: number) => string;
    spotsInLocation: (name: string, count: number) => string;
    spotDetail: string;
    answerName: string;
    episode: string;
    funfacts: string;
    coordinates: string;
    openMaps: string;
    openAnitabi: string;
    relatedAnime: string;
    relatedLocation: string;
    emptyIndex: string;
    viewSpot: string;
    seoSpotTitle: (anime: string, place: string) => string;
    seoSpotDescription: (anime: string, place: string, location: string) => string;
    seoAnimeTitle: (title: string, count: number) => string;
    seoAnimeDescription: (title: string, count: number) => string;
    seoLocationTitle: (name: string, count: number) => string;
    seoLocationDescription: (name: string, count: number) => string;
  }
> = {
  zh: {
    siteKicker: "圣地巡礼档案",
    hubTitle: "动漫圣地巡礼地图",
    hubDescription:
      "收录日本动画取景地的真实坐标、场景描述与巡礼贴士。按番剧或城市浏览，也可在 AniGuessr 里用街景验证你的判断。",
    animeArchive: "按番剧浏览",
    locationArchive: "按地区浏览",
    spotCountLabel: (count) => `${count.toLocaleString()} 处取景地`,
    animeCountLabel: (count) => `${count.toLocaleString()} 部作品`,
    locationCountLabel: (count) => `${count.toLocaleString()} 个地区`,
    playGame: "在 AniGuessr 挑战",
    backHub: "返回巡礼目录",
    backAnime: "番剧列表",
    backLocation: "地区列表",
    spotsInAnime: (title, count) => `《${title}》圣地巡礼 · ${count} 处`,
    spotsInLocation: (name, count) => `${name} 动画取景 · ${count} 处`,
    spotDetail: "取景地详情",
    answerName: "现实地点",
    episode: "出现场景",
    funfacts: "巡礼贴士",
    coordinates: "坐标",
    openMaps: "在 Google 地图打开",
    openAnitabi: "在 Anitabi 查看",
    relatedAnime: "所属作品",
    relatedLocation: "所在地区",
    emptyIndex: "SEO 索引尚未生成，请先运行 npm run data:build-pilgrimage-seo",
    viewSpot: "查看详情",
    seoSpotTitle: (anime, place) => `${anime} 圣地：${place}`,
    seoSpotDescription: (anime, place, location) =>
      `${anime} 取景地「${place}」（${location}）。真实坐标、场景描述与圣地巡礼指南，可在 AniGuessr 街景模式中验证。`,
    seoAnimeTitle: (title, count) => `${title} 圣地巡礼地点大全（${count} 处）`,
    seoAnimeDescription: (title, count) =>
      `整理《${title}》在日本的真实取景地共 ${count} 处，含地点名称、场景线索与地图坐标。`,
    seoLocationTitle: (name, count) => `${name} 动画圣地巡礼（${count} 处）`,
    seoLocationDescription: (name, count) =>
      `${name} 共收录 ${count} 处日本动画取景地，按作品分类，适合规划圣地巡礼路线。`,
  },
  ja: {
    siteKicker: "聖地巡礼アーカイブ",
    hubTitle: "アニメ聖地巡礼マップ",
    hubDescription:
      "日本のアニメ撮影地の座標・シーン説明・巡礼ヒントを収録。作品別・地域別に閲覧し、AniGuessr のストリートビューで当てっこもできます。",
    animeArchive: "作品から探す",
    locationArchive: "地域から探す",
    spotCountLabel: (count) => `撮影地 ${count.toLocaleString()} 件`,
    animeCountLabel: (count) => `作品 ${count.toLocaleString()} 本`,
    locationCountLabel: (count) => `地域 ${count.toLocaleString()} 件`,
    playGame: "AniGuessr で挑戦",
    backHub: "巡礼目録へ",
    backAnime: "作品一覧",
    backLocation: "地域一覧",
    spotsInAnime: (title, count) => `『${title}』聖地巡礼 · ${count} 件`,
    spotsInLocation: (name, count) => `${name} のアニメロケ · ${count} 件`,
    spotDetail: "撮影地詳細",
    answerName: "現実の場所",
    episode: "登場シーン",
    funfacts: "巡礼メモ",
    coordinates: "座標",
    openMaps: "Google マップで開く",
    openAnitabi: "Anitabi で見る",
    relatedAnime: "作品",
    relatedLocation: "地域",
    emptyIndex: "SEO インデックス未生成。npm run data:build-pilgrimage-seo を実行してください",
    viewSpot: "詳細を見る",
    seoSpotTitle: (anime, place) => `${anime} 聖地：${place}`,
    seoSpotDescription: (anime, place, location) =>
      `『${anime}』の撮影地「${place}」（${location}）。座標・シーン説明・巡礼ガイド。AniGuessr ストリートビューで検証できます。`,
    seoAnimeTitle: (title, count) => `『${title}』聖地巡礼リスト（${count} 件）`,
    seoAnimeDescription: (title, count) =>
      `『${title}』の日本国内ロケ地 ${count} 件を整理。場所名・シーン手がかり・地図座標付き。`,
    seoLocationTitle: (name, count) => `${name} アニメ聖地巡礼（${count} 件）`,
    seoLocationDescription: (name, count) =>
      `${name} のアニメ撮影地 ${count} 件を作品別に収録。聖地巡礼ルートの参考に。`,
  },
  en: {
    siteKicker: "Pilgrimage Archive",
    hubTitle: "Anime Pilgrimage Location Guide",
    hubDescription:
      "Real-world coordinates, scene notes, and visit tips for anime filming locations across Japan. Browse by series or region, then test yourself in AniGuessr Street View.",
    animeArchive: "Browse by anime",
    locationArchive: "Browse by region",
    spotCountLabel: (count) => `${count.toLocaleString()} filming spots`,
    animeCountLabel: (count) => `${count.toLocaleString()} series`,
    locationCountLabel: (count) => `${count.toLocaleString()} regions`,
    playGame: "Play on AniGuessr",
    backHub: "Back to archive",
    backAnime: "All anime",
    backLocation: "All regions",
    spotsInAnime: (title, count) => `${title} pilgrimage · ${count} spots`,
    spotsInLocation: (name, count) => `${name} anime locations · ${count} spots`,
    spotDetail: "Spot details",
    answerName: "Real-world place",
    episode: "Scene context",
    funfacts: "Visit notes",
    coordinates: "Coordinates",
    openMaps: "Open in Google Maps",
    openAnitabi: "View on Anitabi",
    relatedAnime: "Anime",
    relatedLocation: "Region",
    emptyIndex: "SEO index not built yet. Run npm run data:build-pilgrimage-seo first.",
    viewSpot: "View details",
    seoSpotTitle: (anime, place) => `${anime} pilgrimage: ${place}`,
    seoSpotDescription: (anime, place, location) =>
      `${anime} filming location “${place}” in ${location}. Coordinates, scene notes, and pilgrimage tips — playable in AniGuessr Street View.`,
    seoAnimeTitle: (title, count) => `${title} pilgrimage locations (${count})`,
    seoAnimeDescription: (title, count) =>
      `${count} real-world ${title} filming spots in Japan with place names, scene clues, and map coordinates.`,
    seoLocationTitle: (name, count) => `${name} anime pilgrimage guide (${count})`,
    seoLocationDescription: (name, count) =>
      `${count} anime filming locations in ${name}, grouped by series for route planning.`,
  },
};

export function getPilgrimageCopy(locale: AnimeLocale) {
  return PILGRIMAGE_COPY[locale] ?? PILGRIMAGE_COPY.en;
}
