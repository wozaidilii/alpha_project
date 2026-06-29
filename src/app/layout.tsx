import "~/styles/globals.css";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { type Metadata, type Viewport } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";

import { PostHogRouteTracker } from "~/components/PostHogRouteTracker";
import { PostHogScript } from "~/components/PostHogScript";
import {
  DEFAULT_ANIME_LOCALE,
  isAnimeLocale,
  withAnimeLocale,
  type AnimeLocale,
} from "~/lib/anime-locale";
import {
  SITE_DESCRIPTIONS,
  SITE_NAME,
  SITE_URL,
  localeAlternates,
} from "~/lib/seo";
import { TRPCReactProvider } from "~/trpc/react";

const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: SITE_NAME,
} as const;

async function getRequestLocale(): Promise<AnimeLocale> {
  const headerList = await headers();
  const headerLocale = headerList.get("x-anime-locale");
  return isAnimeLocale(headerLocale) ? headerLocale : DEFAULT_ANIME_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const description = SITE_DESCRIPTIONS[locale];
  const canonicalPath = withAnimeLocale("/", locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} · Anime Street-View Guessing Game`,
      template: `%s · ${SITE_NAME}`,
    },
    description,
    applicationName: SITE_NAME,
    keywords: [
      "AniGuessr",
      "anime guessing game",
      "anime street view",
      "anime pilgrimage",
      "聖地巡礼",
      "圣地巡礼",
      "geoguessr anime",
      "アニメ 聖地 当て",
    ],
    alternates: {
      canonical: canonicalPath,
      languages: localeAlternates("/"),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale,
      title: `${SITE_NAME} · Anime Street-View Guessing Game`,
      description,
      url: canonicalPath,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} · Anime Street-View Guessing Game`,
      description,
      images: [OG_IMAGE.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    icons: [
      {
        rel: "icon",
        url: "/icon-192.png?v=20260620",
        type: "image/png",
        sizes: "192x192",
      },
      {
        rel: "icon",
        url: "/icon-512.png?v=20260620",
        type: "image/png",
        sizes: "512x512",
      },
      {
        rel: "apple-touch-icon",
        url: "/apple-touch-icon.png?v=20260620",
        type: "image/png",
        sizes: "180x180",
      },
      { rel: "shortcut icon", url: "/favicon.ico?v=20260620" },
    ],
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0612",
  colorScheme: "dark",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} className={`${geist.variable}`}>
      <body>
        <PostHogScript />
        <TRPCReactProvider>
          <PostHogRouteTracker />
          {children}
        </TRPCReactProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
