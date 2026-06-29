import { type MetadataRoute } from "next";
import { absoluteUrl } from "~/lib/seo";

/**
 * 爬虫规则：开放可索引的公开页，屏蔽接口、个人化与动态对战房间页。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/battle/", "/profile", "/onboarding"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
