import "~/styles/globals.css";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { PostHogRouteTracker } from "~/components/PostHogRouteTracker";
import { PostHogScript } from "~/components/PostHogScript";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "AniGuessr",
  description: "Anime street-view guessing game",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh" className={`${geist.variable}`}>
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
