"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FloatingGuessMap } from "~/app/game/_components/FloatingGuessMap";
import {
  haversineDistance,
  locationScore,
  LOCATION_SCORE_MAX,
} from "~/lib/scoring";
import { CHINA_BOUNDS } from "~/lib/china-map";
import { TUXUN_ROUNDS, type TuxunLocation } from "~/lib/tuxun-locations";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";
import { type HistoricalEvent } from "~/types/event";
import { api } from "~/trpc/react";
import { BaiduPanorama } from "../tuxun/_components/BaiduPanorama";
import { TuxunResultMap } from "../tuxun/_components/TuxunResultMap";

const EVENT_POOL_SIZE = 20;

type Phase = "playing" | "result" | "final";

interface HistoryTuxunRoundResult {
  event: HistoricalEvent;
  location: TuxunLocation;
  guess: { lat: number; lng: number };
  distanceKm: number;
  score: number;
}

function isInsideChina(event: HistoricalEvent) {
  return (
    event.lat >= CHINA_BOUNDS.southWest.lat &&
    event.lat <= CHINA_BOUNDS.northEast.lat &&
    event.lng >= CHINA_BOUNDS.southWest.lng &&
    event.lng <= CHINA_BOUNDS.northEast.lng
  );
}

function isPlayableHistoricalEvent(event: HistoricalEvent) {
  return event.category === "china" && isInsideChina(event);
}

function formatYear(year: number) {
  if (year < 0) return `公元前 ${Math.abs(year)} 年`;
  return `${year} 年`;
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} 米`;
  return `${Math.round(distanceKm).toLocaleString()} 公里`;
}

function getRank(score: number) {
  if (score >= 22000) return { label: "历史街景猎手", mark: "S" };
  if (score >= 18000) return { label: "古今定位家", mark: "A" };
  if (score >= 12000) return { label: "线索读得准", mark: "B" };
  if (score >= 6000) return { label: "方向感不错", mark: "C" };
  return { label: "还在辨认古今", mark: "D" };
}

function eventToTuxunLocation(event: HistoricalEvent): TuxunLocation {
  return {
    id: `history-tuxun-${event.id}`,
    title: event.location || event.title,
    province: "中国历史地点",
    city: event.location,
    lat: event.lat,
    lng: event.lng,
    heading: 0,
    pitch: 0,
    source: "historical-event",
    hint: event.description,
  };
}

export default function HistoryTuxunGamePage() {
  const { ready } = useCompletedPlayerSession();
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [loadMessage, setLoadMessage] = useState("");
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<HistoryTuxunRoundResult[]>([]);

  const eventsQuery = api.event.random.useQuery(
    { count: EVENT_POOL_SIZE },
    {
      enabled: ready,
      refetchOnWindowFocus: false,
    },
  );

  const applyEvents = useCallback((records: HistoricalEvent[]) => {
    const playable = records
      .filter(isPlayableHistoricalEvent)
      .slice(0, TUXUN_ROUNDS);

    setEvents(playable);
    setRound(0);
    setGuess(null);
    setResults([]);
    setPhase("playing");

    if (playable.length >= TUXUN_ROUNDS) {
      setLoadMessage("");
      return;
    }

    setLoadMessage(
      playable.length > 0
        ? `本局只找到 ${playable.length} 个中国历史点位；继续使用可用轮次。`
        : "没有找到可用于百度全景的中国历史点位，请先导入更多中国历史事件。",
    );
  }, []);

  useEffect(() => {
    if (!ready || !eventsQuery.data) return;
    applyEvents(eventsQuery.data);
  }, [applyEvents, eventsQuery.data, ready]);

  const currentEvent = events[round];
  const currentLocation = useMemo(
    () => (currentEvent ? eventToTuxunLocation(currentEvent) : null),
    [currentEvent],
  );
  const latestResult = results[results.length - 1];
  const totalScore = useMemo(
    () => results.reduce((sum, result) => sum + result.score, 0),
    [results],
  );

  function handleSubmit() {
    if (!currentEvent || !currentLocation || !guess) return;

    const distanceKm = haversineDistance(
      currentLocation.lat,
      currentLocation.lng,
      guess.lat,
      guess.lng,
    );
    const score = locationScore(distanceKm);

    setResults((prev) => [
      ...prev,
      {
        event: currentEvent,
        location: currentLocation,
        guess,
        distanceKm,
        score,
      },
    ]);
    setPhase("result");
  }

  function handleNext() {
    if (round + 1 >= events.length) {
      setPhase("final");
      return;
    }

    setRound((value) => value + 1);
    setGuess(null);
    setPhase("playing");
  }

  function handleRestart() {
    setEvents([]);
    setGuess(null);
    setResults([]);
    setRound(0);
    setPhase("playing");
    setLoadMessage("正在重新抽取中国历史点位...");
    void eventsQuery.refetch().then((result) => {
      applyEvents(result.data ?? []);
    });
  }

  if (!ready) return <AuthLoading />;

  if (
    (eventsQuery.isLoading || eventsQuery.isFetching) &&
    events.length === 0
  ) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 text-white">
        <div className="text-xl font-bold text-amber-300">
          正在抽取历史图寻线索
        </div>
        <p className="text-sm text-stone-400">
          筛选可用于百度全景的中国历史点位...
        </p>
      </main>
    );
  }

  if (eventsQuery.isError || (!currentEvent && phase !== "final")) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center text-white">
        <p className="max-w-md text-stone-400">
          {eventsQuery.isError
            ? "历史题库加载失败，请检查数据库连接。"
            : loadMessage || "没有可用历史图寻点位。"}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-stone-950 transition hover:bg-amber-400"
          >
            重新抽取
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
          <h1 className="text-xl font-bold text-amber-300">历史图寻模式</h1>
          <Link
            href="/"
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-300 transition hover:bg-stone-700"
          >
            退出
          </Link>
        </header>

        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-stone-800 p-8 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-amber-500 text-2xl font-black text-stone-950">
              {rank.mark}
            </div>
            <div className="mb-1 text-2xl font-bold text-amber-200">
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
                key={result.event.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-stone-800 px-4 py-3"
              >
                <div>
                  <div className="text-sm text-stone-500">
                    第 {index + 1} 轮
                  </div>
                  <div className="font-bold text-amber-100">
                    {result.event.title}
                  </div>
                  <div className="text-xs text-stone-400">
                    {formatYear(result.event.year)} · {result.event.location} ·
                    偏差 {formatDistance(result.distanceKm)}
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
              className="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-stone-950 transition hover:bg-amber-400"
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
          <h1 className="text-xl font-bold text-amber-300">历史图寻模式</h1>
          <span className="text-sm text-stone-400">
            第 {round + 1} / {events.length} 轮结果
          </span>
        </header>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_390px]">
          <section className="min-h-0">
            <TuxunResultMap
              actual={latestResult.location}
              guess={latestResult.guess}
            />
          </section>

          <aside className="flex flex-col gap-4 overflow-y-auto border-l border-stone-700 bg-stone-950/70 p-5">
            <div>
              <div className="text-sm text-stone-500">历史线索</div>
              <h2 className="mt-1 text-2xl font-extrabold text-amber-200">
                {latestResult.event.title}
              </h2>
              <p className="mt-1 text-sm text-stone-400">
                {formatYear(latestResult.event.year)} ·{" "}
                {latestResult.event.location}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
              <div className="text-sm text-stone-400">本轮得分</div>
              <div className="text-6xl font-extrabold text-white">
                {latestResult.score.toLocaleString()}
              </div>
              <div className="text-sm text-stone-500">
                / {LOCATION_SCORE_MAX.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl bg-stone-800 p-4 text-sm leading-6 text-stone-300">
              你的猜测距离现代对应地点{" "}
              <span className="font-bold text-white">
                {formatDistance(latestResult.distanceKm)}
              </span>
              。{latestResult.event.description}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="mt-auto rounded-xl bg-amber-500 py-3 font-bold text-stone-950 transition hover:bg-amber-400"
            >
              {round + 1 >= events.length ? "查看最终得分" : "下一轮"}
            </button>
          </aside>
        </div>
      </main>
    );
  }

  if (!currentEvent || !currentLocation) return null;

  return (
    <main className="flex h-screen flex-col bg-stone-900 text-white">
      <header className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-amber-300">历史图寻模式</h1>
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
          第 {round + 1} / {events.length} 轮
        </span>
      </header>

      <div className="grid flex-1 overflow-hidden lg:grid-cols-[340px_1fr]">
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-r border-stone-700 bg-stone-950/85 p-5">
          {loadMessage && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
              {loadMessage}
            </div>
          )}

          <div>
            <div className="text-sm font-semibold text-amber-300">历史线索</div>
            <h2 className="mt-2 text-2xl font-extrabold text-stone-50">
              {currentEvent.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              {currentEvent.description}
            </p>
          </div>

          <div className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3">
            <div className="text-xs text-stone-500">发生时间</div>
            <div className="mt-1 text-lg font-bold text-amber-200">
              {formatYear(currentEvent.year)}
            </div>
          </div>

          <div className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3">
            <div className="text-xs text-stone-500">任务</div>
            <p className="mt-1 text-sm leading-6 text-stone-300">
              观察中间的现代街景，把它与左侧历史线索对应起来，在右下角地图中选择你认为的地点。
            </p>
          </div>
        </aside>

        <section className="relative min-h-0">
          <BaiduPanorama key={currentLocation.id} location={currentLocation} />
          <FloatingGuessMap
            guessLat={guess?.lat ?? null}
            guessLng={guess?.lng ?? null}
            onGuess={(lat, lng) => setGuess({ lat, lng })}
            onSubmit={handleSubmit}
            disabled={!guess}
            title="历史猜点"
            helper="靠近展开，结合历史线索选择现代地点"
          />
        </section>
      </div>
    </main>
  );
}
