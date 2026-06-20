import "~/styles/globals.css";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { PostHogRouteTracker } from "~/components/PostHogRouteTracker";
import { PostHogScript } from "~/components/PostHogScript";
import { DEFAULT_ANIME_LOCALE } from "~/lib/anime-locale";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "AniGuessr",
  description: "Anime street-view guessing game",
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

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={DEFAULT_ANIME_LOCALE} className={`${geist.variable}`}>
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
