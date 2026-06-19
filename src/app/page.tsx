"use client";

import Link from "next/link";
import { useState } from "react";
import { capturePostHogEvent } from "~/lib/posthog";

type Locale = "zh" | "ja" | "en";

const COPY: Record<
  Locale,
  {
    lang: string;
    kicker: string;
    title: string;
    subtitle: string;
    start: string;
    continue: string;
    clue: string;
    street: string;
    map: string;
    round: string;
    panelTitle: string;
    panelBody: string;
  }
> = {
  zh: {
    lang: "中文",
    kicker: "二次元街景猜谜",
    title: "AniGuessr",
    subtitle: "看现实街景，凭左上角动漫线索猜出取景地。",
    start: "开始猜动漫",
    continue: "进入当前玩法",
    clue: "动漫截图线索",
    street: "现实街景观察",
    map: "全球地图猜点",
    round: "5 轮挑战",
    panelTitle: "现实与番剧重叠的瞬间",
    panelBody:
      "主画面保持真实街景，动漫图案只作为线索出现。地图不再锁定日本，后续题库可以覆盖任何有 Google 街景的地区。",
  },
  ja: {
    lang: "日本語",
    kicker: "アニメ聖地ストリートビュー",
    title: "AniGuessr",
    subtitle: "現実の街並みを見て、左上のアニメ手がかりから場所を当てよう。",
    start: "プレイ開始",
    continue: "ゲームへ",
    clue: "アニメ画像ヒント",
    street: "現実のストリートビュー",
    map: "世界地図で推理",
    round: "5 ラウンド",
    panelTitle: "現実と物語が重なる場所",
    panelBody:
      "メイン画面はあくまで実写の街景。アニメ画像はヒントとして表示され、地図は日本以外の聖地にも対応します。",
  },
  en: {
    lang: "English",
    kicker: "Anime street-view mystery",
    title: "AniGuessr",
    subtitle:
      "Read the anime clue, scan the real street view, and pin the filming spot.",
    start: "Start Anime Guessr",
    continue: "Open game",
    clue: "Anime clue image",
    street: "Real street view",
    map: "Global map guess",
    round: "5 rounds",
    panelTitle: "Where frames meet the real world",
    panelBody:
      "The main scene stays as real-world Street View. Anime artwork appears only as the clue, and guesses are no longer locked to Japan.",
  },
};

const LOCALES: Locale[] = ["zh", "ja", "en"];
const PLAY_URL = "/game/anime";

export default function Home() {
  const [locale, setLocale] = useState<Locale>("zh");
  const copy = COPY[locale];

  return (
    <main className="anime-shell min-h-screen overflow-hidden text-white">
      <section className="relative min-h-screen px-5 py-5 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10">
          <div className="h-full w-full bg-[url('/images/anime-placeholder.jpg')] bg-cover bg-center opacity-35" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,6,18,0.98),rgba(20,9,32,0.86)_44%,rgba(10,6,18,0.78))]" />
        </div>

        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link
            href={PLAY_URL}
            className="text-lg font-black tracking-[0.18em] text-pink-100 uppercase focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
          >
            AniGuessr
          </Link>

          <div
            className="grid grid-cols-3 rounded-xl border border-white/10 bg-black/40 p-1 text-xs font-bold text-white/70"
            aria-label="Language"
          >
            {LOCALES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                className={`min-h-10 rounded-lg px-3 transition focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none ${
                  locale === item
                    ? "bg-pink-300 text-slate-950"
                    : "hover:bg-white/10 hover:text-white"
                }`}
              >
                {COPY[item].lang}
              </button>
            ))}
          </div>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-6xl items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <div className="anime-chip mb-5 w-fit">{copy.kicker}</div>
            <h1 className="text-[clamp(3.25rem,8vw,7rem)] leading-[0.86] font-black text-white">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-pink-50/80 sm:text-xl">
              {copy.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={PLAY_URL}
                onClick={() =>
                  capturePostHogEvent("home_start_clicked", { locale })
                }
                className="anime-button"
              >
                {copy.start}
              </Link>
              <Link
                href={PLAY_URL}
                onClick={() =>
                  capturePostHogEvent("home_start_clicked", { locale })
                }
                className="anime-button-secondary"
              >
                {copy.continue}
              </Link>
            </div>

            <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
              {[copy.clue, copy.street, copy.map].map((item, index) => (
                <div key={item} className="anime-stat">
                  <div className="text-xs font-black text-cyan-200">
                    0{index + 1}
                  </div>
                  <div className="mt-2 text-sm font-bold text-white">
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[420px] lg:min-h-[560px]">
            <div className="absolute top-2 right-2 left-10 h-[72%] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="h-full w-full bg-[url('/images/anime-placeholder.jpg')] bg-cover bg-center" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(8,5,16,0.76))]" />
            </div>

            <div className="anime-panel absolute right-0 bottom-16 left-0 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="anime-chip mb-3 w-fit">{copy.round}</div>
                  <h2 className="text-2xl font-black text-white sm:text-3xl">
                    {copy.panelTitle}
                  </h2>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-full border border-cyan-200/40 bg-cyan-200/10 text-xl font-black text-cyan-100">
                  S
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/70">
                {copy.panelBody}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
