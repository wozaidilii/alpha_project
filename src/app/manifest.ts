import { type MetadataRoute } from "next";
import { SITE_NAME } from "~/lib/seo";

/**
 * PWA 清单：复用现有图标资源，主题色沿用深色二次元基调。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} · Anime Street-View Guessing`,
    short_name: SITE_NAME,
    description:
      "Read the anime clue, interrogate the real street view, and pin the location on the world map.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0612",
    theme_color: "#0a0612",
    icons: [
      {
        src: "/icon-192.png?v=20260620",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=20260620",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png?v=20260620",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
