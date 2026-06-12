"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FloatingGuessMap } from "~/app/game/_components/FloatingGuessMap";
import {
  haversineDistance,
  locationScore,
  LOCATION_SCORE_MAX,
} from "~/lib/scoring";
import { generateRandomTuxunLocations } from "~/lib/baidu-panorama";
import { TUXUN_ROUNDS, type TuxunLocation } from "~/lib/tuxun-locations";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";
import { BaiduPanorama } from "./_components/BaiduPanorama";
import { TuxunResultMap } from "./_components/TuxunResultMap";

type Phase = "playing" | "result" | "final";
type LocationLoadState = "loading" | "ready" | "error";

interface TuxunRoundResult {
  location: TuxunLocation;
  guess: { lat: number; lng: number };
  distanceKm: number;
  score: number;
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} 米`;
  return `${Math.round(distanceKm).toLocaleString()} 公里`;
}

function getRank(score: number) {
  if (score >= 22000) return { label: "街景猎手", emoji: "🏆" };
  if (score >= 18000) return { label: "城市达人", emoji: "🥇" };
  if (score >= 12000) return { label: "方向感不错", emoji: "🥈" };
  if (score >= 6000) return { label: "还在认路", emoji: "🥉" };
  return { label: "地图新手", emoji: "🧭" };
}

export default function TuxunGamePage() {
  const { ready } = useCompletedPlayerSession();
  const [locations, setLocations] = useState<TuxunLocation[]>([]);
  const [locationLoadState, setLocationLoadState] =
    useState<LocationLoadState>("loading");
  const [locationLoadMessage, setLocationLoadMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<TuxunRoundResult[]>([]);

  const current = locations[round];
  const latestResult = results[results.length - 1];
  const totalScore = useMemo(
    () => results.reduce((sum, result) => sum + result.score, 0),
    [results],
  );

  useEffect(() => {
    if (!ready) return;

    let active = true;
    setLocationLoadState("loading");
    setLocationLoadMessage("正在随机生成百度全景点...");
    setLocations([]);
    setRound(0);
    setGuess(null);
    setResults([]);
    setPhase("playing");

    void generateRandomTuxunLocations(TUXUN_ROUNDS)
      .then((result) => {
        if (!active) return;
        setLocations(result.locations);
        setLocationLoadMessage(result.message ?? "");
        setLocationLoadState(result.locations.length > 0 ? "ready" : "error");
      })
      .catch(() => {
        if (!active) return;
        setLocationLoadMessage("图寻点位生成失败，请稍后重试。");
        setLocationLoadState("error");
      });

    return () => {
      active = false;
    };
  }, [ready, reloadKey]);

  function handleSubmit() {
    if (!current || !guess) return;

    const distanceKm = haversineDistance(
      current.lat,
      current.lng,
      guess.lat,
      guess.lng,
    );
    const score = locationScore(distanceKm);
    setResults((prev) => [
      ...prev,
      {
        location: current,
        guess,
        distanceKm,
        score,
      },
    ]);
    setPhase("result");
  }

  function handleNext() {
    if (round + 1 >= locations.length) {
      setPhase("final");
      return;
    }

    setRound((value) => value + 1);
    setGuess(null);
    setPhase("playing");
  }

  function handleRestart() {
    setReloadKey((value) => value + 1);
  }

  if (!ready) return <AuthLoading />;

  if (locationLoadState === "loading") {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 text-white">
        <div className="text-5xl">🔭</div>
        <div className="text-xl font-bold text-sky-300">正在生成图寻点位</div>
        <p className="text-sm text-stone-400">{locationLoadMessage}</p>
      </main>
    );
  }

  if (locationLoadState === "error" || (!current && phase !== "final")) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 text-white">
        <p className="text-stone-400">
          {locationLoadMessage || "图寻点位不足，请稍后重试。"}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-lg bg-sky-400 px-4 py-2 font-bold text-stone-950 transition hover:bg-sky-300"
          >
            重新生成
          </button>
          <Link href="/game" className="rounded-lg bg-stone-800 px-4 py-2">
            返回模式选择
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "final") {
    const maxScore = results.length * LOCATION_SCORE_MAX;
    const rank = getRank(totalScore);

    return (
      <main className="flex min-h-screen flex-col bg-stone-900 text-white">
        <header className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
          <h1 className="text-xl font-bold text-sky-300">🔭 图寻模式</h1>
          <Link
            href="/"
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-300 transition hover:bg-stone-700"
          >
            退出
          </Link>
        </header>

        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-sky-600/30 to-stone-800 p-8 text-center">
            <div className="mb-2 text-5xl">{rank.emoji}</div>
            <div className="mb-1 text-2xl font-bold text-sky-300">
              {rank.label}
            </div>
            <div className="text-7xl font-extrabold text-white">
              {totalScore.toLocaleString()}
            </div>
            <div className="mt-1 text-stone-400">
              / {maxScore.toLocaleString()} 分
            </div>
          </div>

          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={result.location.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-stone-800 px-4 py-3"
              >
                <div>
                  <div className="text-sm text-stone-500">
                    第 {index + 1} 轮
                  </div>
                  <div className="font-bold text-sky-200">
                    {result.location.title}
                  </div>
                  <div className="text-xs text-stone-400">
                    {result.location.province} · {result.location.city} · 偏差{" "}
                    {formatDistance(result.distanceKm)}
                  </div>
                </div>
                <div className="text-right text-xl font-extrabold text-white">
                  {result.score.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="flex-1 rounded-xl bg-sky-400 py-3 font-bold text-stone-950 transition hover:bg-sky-300"
            >
              再来一局
            </button>
            <Link
              href="/game"
              className="flex-1 rounded-xl bg-stone-700 py-3 text-center font-bold text-stone-300 transition hover:bg-stone-600"
            >
              换模式
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "result" && latestResult) {
    return (
      <main className="flex h-screen flex-col bg-stone-900 text-white">
        <header className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
          <h1 className="text-xl font-bold text-sky-300">🔭 图寻模式</h1>
          <span className="text-sm text-stone-400">
            第 {round + 1} / {locations.length} 轮结果
          </span>
        </header>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_380px]">
          <section className="min-h-0">
            <TuxunResultMap
              actual={latestResult.location}
              guess={latestResult.guess}
            />
          </section>

          <aside className="flex flex-col gap-4 overflow-y-auto border-l border-stone-700 bg-stone-950/70 p-5">
            <div>
              <div className="text-sm text-stone-500">实际地点</div>
              <h2 className="mt-1 text-2xl font-extrabold text-sky-300">
                {latestResult.location.title}
              </h2>
              <p className="mt-1 text-sm text-stone-400">
                {latestResult.location.province} · {latestResult.location.city}
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-sky-500/20 to-stone-800 p-5 text-center">
              <div className="text-sm text-stone-400">本轮得分</div>
              <div className="text-6xl font-extrabold text-white">
                {latestResult.score.toLocaleString()}
              </div>
              <div className="text-sm text-stone-500">
                / {LOCATION_SCORE_MAX.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl bg-stone-800 p-4 text-sm leading-6 text-stone-300">
              你的猜测距离实际地点{" "}
              <span className="font-bold text-white">
                {formatDistance(latestResult.distanceKm)}
              </span>
              。{latestResult.location.hint}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="mt-auto rounded-xl bg-sky-400 py-3 font-bold text-stone-950 transition hover:bg-sky-300"
            >
              {round + 1 >= locations.length ? "查看最终得分" : "下一轮"}
            </button>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-stone-900 text-white">
      <header className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-sky-300">🔭 图寻模式</h1>
          <Link
            href="/game"
            className="text-xs text-stone-500 transition hover:text-stone-300"
          >
            换类型
          </Link>
          <Link
            href="/"
            className="text-xs text-stone-500 transition hover:text-stone-300"
          >
            退出
          </Link>
        </div>
        <span className="text-stone-400">
          第 {round + 1} / {locations.length} 轮
        </span>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <section className="h-full min-h-0">
          {current && <BaiduPanorama key={current.id} location={current} />}
        </section>

        <aside className="absolute top-4 left-4 z-20 flex w-[min(calc(100vw-2rem),360px)] flex-col gap-3 rounded-xl border border-stone-700 bg-stone-950/85 p-4 shadow-lg shadow-black/30">
          {locationLoadMessage && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
              {locationLoadMessage}
            </div>
          )}

          <div>
            <div className="text-sm font-semibold text-sky-300">
              观察全景，猜它在中国哪里
            </div>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              和原版 GeoGuessr 一样，先从街景/全景里找线索，再在地图上点选位置。
            </p>
          </div>
        </aside>

        <FloatingGuessMap
          guessLat={guess?.lat ?? null}
          guessLng={guess?.lng ?? null}
          onGuess={(lat, lng) => setGuess({ lat, lng })}
          onSubmit={handleSubmit}
          disabled={!guess}
          title="图寻猜点"
        />
      </div>
    </main>
  );
}
