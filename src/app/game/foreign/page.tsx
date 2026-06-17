"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleGuessMap } from "~/app/game/foreign/_components/GoogleGuessMap";
import { GoogleResultMap } from "~/app/game/foreign/_components/GoogleResultMap";
import { GoogleStreetView } from "~/app/game/foreign/_components/GoogleStreetView";
import {
  DEFAULT_FOREIGN_COUNTRY,
  FOREIGN_COUNTRIES,
  type ForeignCountryConfig,
  type ForeignCountrySlug,
} from "~/lib/foreign-map";
import { generateRandomForeignLocations } from "~/lib/google-street-view";
import {
  haversineDistance,
  locationRoundScore,
  LOCATION_ROUND_SCORE_MAX,
} from "~/lib/scoring";
import { TUXUN_ROUNDS, type TuxunLocation } from "~/lib/tuxun-locations";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";

type Phase = "playing" | "result" | "final";
type LocationLoadState = "loading" | "ready" | "error";

interface ForeignRoundResult {
  location: TuxunLocation;
  guess: { lat: number; lng: number };
  distanceKm: number;
  distancePts: number;
  speedCompensationPts: number;
  elapsedSeconds: number;
  score: number;
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} 米`;
  return `${Math.round(distanceKm).toLocaleString()} 公里`;
}

function formatElapsed(seconds: number): string {
  return `${Math.max(0, Math.round(seconds))} 秒`;
}

function getRank(score: number) {
  if (score >= 450) return { label: "世界街景猎手", symbol: "S" };
  if (score >= 360) return { label: "海外城市达人", symbol: "A" };
  if (score >= 240) return { label: "方向感不错", symbol: "B" };
  if (score >= 120) return { label: "还在认路", symbol: "C" };
  return { label: "地图新手", symbol: "D" };
}

export default function ForeignGamePage() {
  const { ready } = useCompletedPlayerSession();
  const [selectedCountrySlug, setSelectedCountrySlug] =
    useState<ForeignCountrySlug>(DEFAULT_FOREIGN_COUNTRY.slug);
  const [locations, setLocations] = useState<TuxunLocation[]>([]);
  const [locationLoadState, setLocationLoadState] =
    useState<LocationLoadState>("loading");
  const [locationLoadMessage, setLocationLoadMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<ForeignRoundResult[]>([]);
  const roundStartedAtRef = useRef(Date.now());

  const country = useMemo(
    () =>
      FOREIGN_COUNTRIES.find((item) => item.slug === selectedCountrySlug) ??
      DEFAULT_FOREIGN_COUNTRY,
    [selectedCountrySlug],
  );
  const current = locations[round];
  const latestResult = results[results.length - 1];
  const totalScore = useMemo(
    () => results.reduce((sum, result) => sum + result.score, 0),
    [results],
  );

  const loadLocations = useCallback((nextCountry: ForeignCountryConfig) => {
    let active = true;
    setLocationLoadState("loading");
    setLocationLoadMessage(
      `正在生成 ${nextCountry.label} Google Street View 点位...`,
    );
    setLocations([]);
    setRound(0);
    setGuess(null);
    setResults([]);
    setPhase("playing");
    roundStartedAtRef.current = Date.now();

    void generateRandomForeignLocations(TUXUN_ROUNDS, nextCountry)
      .then((result) => {
        if (!active) return;

        if (result.locations.length < TUXUN_ROUNDS) {
          setLocations([]);
          setLocationLoadMessage(
            result.message ??
              `只匹配到 ${result.locations.length} / ${TUXUN_ROUNDS} 个 Google 街景点，未开始本局；请重新生成。`,
          );
          setLocationLoadState("error");
          return;
        }

        setLocations(result.locations);
        setLocationLoadMessage(result.message ?? "");
        setLocationLoadState("ready");
      })
      .catch(() => {
        if (!active) return;
        setLocationLoadMessage("国外模式点位生成失败，请稍后重试。");
        setLocationLoadState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    return loadLocations(country);
  }, [country, loadLocations, ready, reloadKey]);

  useEffect(() => {
    if (phase !== "playing" || !current) return;
    roundStartedAtRef.current = Date.now();
  }, [current, phase]);

  function handleSubmit() {
    if (!current || !guess) return;

    const distanceKm = haversineDistance(
      current.lat,
      current.lng,
      guess.lat,
      guess.lng,
    );
    const elapsedSeconds = (Date.now() - roundStartedAtRef.current) / 1000;
    const score = locationRoundScore({ distanceKm, elapsedSeconds });
    setResults((prev) => [
      ...prev,
      {
        location: current,
        guess,
        distanceKm,
        distancePts: score.distancePts,
        speedCompensationPts: score.speedCompensationPts,
        elapsedSeconds,
        score: score.total,
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

  const handleCurrentPanoramaUnavailable = useCallback(() => {
    if (!current) return;

    const nextLocations = locations.filter(
      (location) => location.id !== current.id,
    );
    setLocations(nextLocations);
    setGuess(null);

    if (nextLocations.length <= results.length) {
      if (results.length > 0) {
        setPhase("final");
        return;
      }

      setLocationLoadMessage("当前没有可用的 Google 街景点，请重新生成。");
      setLocationLoadState("error");
      return;
    }

    setRound(Math.min(round, nextLocations.length - 1));
    setPhase("playing");
    setLocationLoadMessage(
      "上一处 Google Street View 渲染失败，已跳过并切换到下一个街景点。",
    );
  }, [current, locations, results.length, round]);

  if (!ready) return <AuthLoading />;

  if (locationLoadState === "loading") {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/50 text-xl font-black text-emerald-200">
          JP
        </div>
        <div className="text-xl font-bold text-emerald-300">
          正在生成国外模式点位
        </div>
        <p className="text-sm text-stone-400">{locationLoadMessage}</p>
      </main>
    );
  }

  if (locationLoadState === "error" || (!current && phase !== "final")) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center text-white">
        <p className="max-w-md text-sm leading-6 text-stone-400">
          {locationLoadMessage || "国外模式点位不足，请稍后重试。"}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="min-h-11 rounded-lg bg-emerald-400 px-4 py-2 font-bold text-stone-950 transition hover:bg-emerald-300 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
          >
            重新生成
          </button>
          <Link
            href="/game/solo"
            className="min-h-11 rounded-lg bg-stone-800 px-4 py-2 leading-7 text-stone-200 transition hover:bg-stone-700 focus:ring-2 focus:ring-emerald-300 focus:outline-none"
          >
            返回个人模式
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "final") {
    const maxScore = results.length * LOCATION_ROUND_SCORE_MAX;
    const rank = getRank(totalScore);

    return (
      <main className="flex min-h-screen flex-col bg-stone-900 text-white">
        <header className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
          <h1 className="text-xl font-bold text-emerald-300">国外模式</h1>
          <Link
            href="/game/solo"
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-300 transition hover:bg-stone-700 focus:ring-2 focus:ring-emerald-300 focus:outline-none"
          >
            返回个人模式
          </Link>
        </header>

        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <div className="mb-6 rounded-xl bg-gradient-to-br from-emerald-600/30 to-stone-800 p-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/60 text-xl font-black text-emerald-100">
              {rank.symbol}
            </div>
            <div className="mb-1 text-2xl font-bold text-emerald-300">
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
                  <div className="font-bold text-emerald-200">
                    {result.location.title}
                  </div>
                  <div className="text-xs text-stone-400">
                    {result.location.province} · {result.location.city} · 偏差{" "}
                    {formatDistance(result.distanceKm)} · 用时{" "}
                    {formatElapsed(result.elapsedSeconds)}
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
              className="flex-1 rounded-xl bg-emerald-400 py-3 font-bold text-stone-950 transition hover:bg-emerald-300 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            >
              再来一局
            </button>
            <Link
              href="/game/solo"
              className="flex-1 rounded-xl bg-stone-700 py-3 text-center font-bold text-stone-300 transition hover:bg-stone-600 focus:ring-2 focus:ring-emerald-300 focus:outline-none"
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
          <h1 className="text-xl font-bold text-emerald-300">
            国外模式 · {country.label}
          </h1>
          <span className="text-sm text-stone-400">
            第 {round + 1} / {locations.length} 轮结果
          </span>
        </header>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_380px]">
          <section className="min-h-0">
            <GoogleResultMap
              country={country}
              actual={latestResult.location}
              guess={latestResult.guess}
              distanceKm={latestResult.distanceKm}
            />
          </section>

          <aside className="flex flex-col gap-4 overflow-y-auto border-l border-stone-700 bg-stone-950/70 p-5">
            <div>
              <div className="text-sm text-stone-500">实际地点</div>
              <h2 className="mt-1 text-2xl font-extrabold text-emerald-300">
                {latestResult.location.title}
              </h2>
              <p className="mt-1 text-sm text-stone-400">
                {latestResult.location.province} · {latestResult.location.city}
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-stone-800 p-5 text-center">
              <div className="text-sm text-stone-400">本轮得分</div>
              <div className="text-6xl font-extrabold text-white">
                {latestResult.score.toLocaleString()}
              </div>
              <div className="text-sm text-stone-500">
                / {LOCATION_ROUND_SCORE_MAX}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">距离分</div>
                <div className="mt-1 font-bold text-stone-100">
                  {latestResult.distancePts}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">速度补偿</div>
                <div className="mt-1 font-bold text-stone-100">
                  +{latestResult.speedCompensationPts}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">用时</div>
                <div className="mt-1 font-bold text-stone-100">
                  {formatElapsed(latestResult.elapsedSeconds)}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-stone-800 p-4 text-sm leading-6 text-stone-300">
              你的猜测距离实际地点{" "}
              <span className="font-bold text-white">
                {formatDistance(latestResult.distanceKm)}
              </span>
              ，本轮满分 100 分，分数只按距离计算，提交越快可获得少量补偿。
              {latestResult.location.hint}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="mt-auto rounded-xl bg-emerald-400 py-3 font-bold text-stone-950 transition hover:bg-emerald-300 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-700 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-emerald-300">
            国外模式 · {country.label}
          </h1>
          <Link
            href="/game/solo"
            className="text-xs text-stone-500 transition hover:text-stone-300 focus:ring-2 focus:ring-emerald-300 focus:outline-none"
          >
            返回个人模式
          </Link>
        </div>
        <span className="text-stone-400">
          第 {round + 1} / {locations.length} 轮
        </span>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <section className="h-full min-h-0">
          {current && (
            <GoogleStreetView
              key={current.id}
              location={current}
              onUnavailable={handleCurrentPanoramaUnavailable}
            />
          )}
        </section>

        <aside className="absolute top-4 left-4 z-20 flex w-[min(calc(100vw-2rem),380px)] flex-col gap-3 rounded-xl border border-stone-700 bg-stone-950/85 p-4 shadow-lg shadow-black/30">
          <div>
            <div className="text-sm font-semibold text-emerald-300">国家</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {FOREIGN_COUNTRIES.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => {
                    setSelectedCountrySlug(item.slug);
                    setReloadKey((value) => value + 1);
                  }}
                  className={`min-h-11 rounded-lg border px-3 text-sm font-semibold transition focus:ring-2 focus:ring-emerald-300 focus:outline-none ${
                    item.slug === selectedCountrySlug
                      ? "border-emerald-300 bg-emerald-400 text-stone-950"
                      : "border-stone-700 bg-stone-900 text-stone-200 hover:border-emerald-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {locationLoadMessage && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-100">
              {locationLoadMessage}
            </div>
          )}

          <div>
            <div className="text-sm font-semibold text-emerald-300">
              观察街景，猜它在{country.label}哪里
            </div>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              先从道路、招牌、地形和城市密度里找线索，再在右下角 Google
              地图中点选位置。
            </p>
          </div>
        </aside>

        <div className="group fixed right-3 bottom-3 z-40 h-44 w-56 transition-all duration-200 ease-out focus-within:h-[min(72dvh,640px)] focus-within:w-[min(calc(100vw-1.5rem),920px)] hover:h-[min(72dvh,640px)] hover:w-[min(calc(100vw-1.5rem),920px)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:right-5 sm:bottom-5 sm:h-48 sm:w-64">
          <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-stone-600 bg-stone-950 shadow-lg shadow-black/40">
            <div className="min-h-0 flex-1 bg-stone-900">
              <GoogleGuessMap
                country={country}
                guess={guess}
                answer={null}
                minHeightClass="min-h-0"
                onGuess={setGuess}
              />
            </div>

            <div className="hidden border-t border-stone-700 bg-stone-900/95 p-2 transition group-focus-within:block group-hover:block">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!guess}
                className="w-full rounded-lg bg-emerald-400 px-3 py-2 text-sm font-bold text-stone-950 transition hover:bg-emerald-300 focus:ring-2 focus:ring-emerald-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                提交猜测
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
