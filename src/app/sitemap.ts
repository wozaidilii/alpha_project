import { type MetadataRoute } from "next";
import { DEFAULT_ANIME_LOCALE, withAnimeLocale } from "~/lib/anime-locale";
import { encodeSpotId } from "~/lib/pilgrimage-slug";
import { absoluteUrl, localeAlternates } from "~/lib/seo";
import {
  getPilgrimageSeoIndex,
  getSpotIdsForSitemapChunk,
  getSitemapSpotChunkCount,
} from "~/server/data/pilgrimage-seo";

/** 可公开索引的静态路由（裸路径，middleware 会映射到 /{locale}/...） */
const PUBLIC_ROUTES: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: "/pilgrimage", priority: 0.95 },
  { path: "/pilgrimage/anime", priority: 0.9 },
  { path: "/pilgrimage/locations", priority: 0.9 },
  { path: "/game", priority: 0.85 },
  { path: "/game/anime", priority: 0.85 },
  { path: "/game/anime-tuxun", priority: 0.8 },
  { path: "/game/tuxun", priority: 0.7 },
  { path: "/game/foreign", priority: 0.7 },
  { path: "/game/solo", priority: 0.7 },
  { path: "/game/history-year", priority: 0.6 },
  { path: "/game/history-tuxun", priority: 0.6 },
  { path: "/character", priority: 0.6 },
  { path: "/login", priority: 0.3 },
];

function buildSitemapEntry(
  path: string,
  priority: number,
  lastModified: Date,
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(withAnimeLocale(path, DEFAULT_ANIME_LOCALE)),
    lastModified,
    changeFrequency: "weekly",
    priority,
    alternates: { languages: localeAlternates(path) },
  };
}

/** id=0：核心页 + 番剧/地区 hub；id>=1：取景地详情分块 */
export async function generateSitemaps() {
  const spotChunks = getSitemapSpotChunkCount();
  const total = Math.max(1, spotChunks + 1);
  return Array.from({ length: total }, (_, index) => ({ id: String(index) }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const lastModified = new Date();
  const index = getPilgrimageSeoIndex();

  if (id === 0) {
    const entries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map(({ path, priority }) =>
      buildSitemapEntry(path, priority, lastModified),
    );

    if (index) {
      for (const anime of index.animes) {
        entries.push(
          buildSitemapEntry(
            `/pilgrimage/anime/${anime.slug}`,
            0.75,
            lastModified,
          ),
        );
      }
      for (const location of index.locations) {
        entries.push(
          buildSitemapEntry(
            `/pilgrimage/locations/${location.slug}`,
            0.7,
            lastModified,
          ),
        );
      }
    }

    return entries;
  }

  const chunkIndex = id - 1;
  const spotIds = getSpotIdsForSitemapChunk(chunkIndex);
  return spotIds.map((spotId) =>
    buildSitemapEntry(
      `/pilgrimage/spots/${encodeSpotId(spotId)}`,
      0.6,
      lastModified,
    ),
  );
}
