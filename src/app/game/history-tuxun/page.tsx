"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BaiduGuessMap } from "~/app/game/history-tuxun/_components/BaiduGuessMap";
import { BaiduSceneMap } from "~/app/game/history-tuxun/_components/BaiduSceneMap";
import {
  buildBaiduStaticMapUrl,
  buildBaiduStaticPanoramaUrl,
} from "~/lib/baidu-panorama";
import {
  DEFAULT_HISTORY_TUXUN_PUZZLE,
  pickHistoryTuxunPuzzle,
  type HistoryTuxunPuzzle,
} from "~/lib/history-tuxun-demo";
import { haversineDistance, locationScore } from "~/lib/scoring";

type Phase = "playing" | "result";
type SceneImageMode = "panorama" | "static-map" | "base-map" | "error";

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} 米`;
  return `${Math.round(distanceKm).toLocaleString()} 公里`;
}

function useElapsedSeconds(active: boolean, resetKey: string) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    if (!active) return;

    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active, resetKey]);

  return elapsed;
}

export default function HistoryTuxunDemoPage() {
  const [puzzle, setPuzzle] = useState<HistoryTuxunPuzzle>(
    DEFAULT_HISTORY_TUXUN_PUZZLE,
  );
  const [phase, setPhase] = useState<Phase>("playing");
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [imageMode, setImageMode] = useState<SceneImageMode>("panorama");
  const elapsed = useElapsedSeconds(phase === "playing", puzzle.id);

  useEffect(() => {
    setPuzzle(pickHistoryTuxunPuzzle());
  }, []);

  const revealedClueCount = Math.min(
    puzzle.clues.length,
    Math.floor(elapsed / 10) + 1,
  );
  const visibleClues = puzzle.clues.slice(0, revealedClueCount);
  const nextClueIn =
    revealedClueCount < puzzle.clues.length ? 10 - (elapsed % 10) : null;

  const panoramaUrl = useMemo(
    () =>
      buildBaiduStaticPanoramaUrl({
        lng: puzzle.lng,
        lat: puzzle.lat,
        heading: puzzle.heading,
        pitch: puzzle.pitch,
        fov: puzzle.fov,
      }),
    [puzzle],
  );
  const staticMapUrl = useMemo(
    () =>
      buildBaiduStaticMapUrl({
        lng: puzzle.lng,
        lat: puzzle.lat,
      }),
    [puzzle.lat, puzzle.lng],
  );
  const sceneImageUrl =
    imageMode === "panorama"
      ? panoramaUrl
      : imageMode === "static-map"
        ? staticMapUrl
        : null;

  const result = useMemo(() => {
    if (!guess) return null;
    const distanceKm = haversineDistance(
      puzzle.lat,
      puzzle.lng,
      guess.lat,
      guess.lng,
    );
    return {
      distanceKm,
      score: locationScore(distanceKm),
    };
  }, [guess, puzzle.lat, puzzle.lng]);

  function handleSubmit() {
    if (!guess) return;
    setPhase("result");
  }

  function handleNextPuzzle() {
    setPuzzle((current) => pickHistoryTuxunPuzzle(current.id));
    setGuess(null);
    setImageMode("panorama");
    setPhase("playing");
  }

  const handleSceneImageError = useCallback(() => {
    if (imageMode === "panorama" && staticMapUrl) {
      setImageMode("static-map");
      return;
    }

    if (imageMode === "static-map") {
      setImageMode("base-map");
      return;
    }

    setImageMode("error");
  }, [imageMode, staticMapUrl]);

  useEffect(() => {
    if (!sceneImageUrl || imageMode === "error") return;

    let active = true;
    const image = new Image();
    const fail = () => {
      if (!active) return;
      handleSceneImageError();
    };
    const timer = window.setTimeout(() => {
      if (image.complete && image.naturalWidth === 0) fail();
    }, 2500);

    image.onload = () => {
      if (image.naturalWidth === 0) fail();
    };
    image.onerror = fail;
    image.src = sceneImageUrl;

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [handleSceneImageError, imageMode, sceneImageUrl]);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <div className="grid min-h-screen grid-rows-[auto_1fr]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 bg-stone-950/95 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-xl font-black text-amber-200">历史寻图题</h1>
            <p className="mt-0.5 text-sm text-stone-400">
              第 {revealedClueCount} 条线索已解锁
              {nextClueIn
                ? `，下一条 ${nextClueIn} 秒后出现`
                : "，线索已全部给出"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleNextPuzzle}
            className="min-h-11 rounded-lg border border-stone-700 px-4 text-sm font-semibold text-stone-200 transition hover:border-amber-300 hover:text-amber-100 focus:ring-2 focus:ring-amber-300 focus:outline-none"
          >
            换一题
          </button>
        </header>

        <div className="grid min-h-0 lg:grid-cols-[340px_minmax(0,1fr)_420px]">
          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-b border-stone-800 bg-stone-900 px-4 py-5 sm:px-6 lg:border-r lg:border-b-0">
            <section>
              <div className="text-sm font-semibold text-amber-200">
                历史线索
              </div>
              <ol className="mt-4 space-y-3">
                {visibleClues.map((clue, index) => (
                  <li
                    key={clue}
                    className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm leading-6 text-stone-200"
                  >
                    <span className="mr-2 font-mono text-amber-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {clue}
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-auto rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <div className="text-sm font-semibold text-amber-100">任务</div>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                根据左侧逐步出现的历史线索和中间的百度地图图像，在右侧地图中选出对应地点。
              </p>
            </section>
          </aside>

          <section className="relative min-h-[420px] overflow-hidden bg-black">
            {imageMode === "base-map" ? (
              <BaiduSceneMap center={{ lat: puzzle.lat, lng: puzzle.lng }} />
            ) : sceneImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${puzzle.id}-${imageMode}`}
                src={sceneImageUrl}
                alt={
                  imageMode === "panorama"
                    ? "待猜地点的百度全景静态图"
                    : "待猜地点附近的百度静态地图"
                }
                className="h-full min-h-[420px] w-full object-cover"
                onError={handleSceneImageError}
              />
            ) : (
              <div className="grid h-full min-h-[420px] place-items-center px-6 text-center">
                <div className="max-w-md">
                  <div className="text-lg font-bold text-stone-100">
                    无法加载百度地图图像
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-400">
                    请确认 NEXT_PUBLIC_BAIDU_MAP_AK 已配置，并且该 AK
                    至少开通了基础静态图服务。
                  </p>
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 rounded-md border border-black/40 bg-stone-950/80 px-3 py-2 text-xs font-semibold text-stone-200 shadow-lg shadow-black/30">
              {imageMode === "base-map"
                ? "百度 JS 底图占位"
                : imageMode === "static-map"
                  ? "百度静态图占位"
                  : "百度全景静态图"}
            </div>
            {(imageMode === "static-map" || imageMode === "base-map") && (
              <div className="absolute right-4 bottom-4 max-w-xs rounded-md border border-amber-500/40 bg-stone-950/85 px-3 py-2 text-xs leading-5 text-amber-100 shadow-lg shadow-black/30">
                当前 AK
                未返回可用全景图，已降级为基础地图服务；这不是街景等价替代。
              </div>
            )}
          </section>

          <aside className="grid min-h-[420px] grid-rows-[1fr_auto] border-t border-stone-800 bg-stone-900 lg:border-t-0 lg:border-l">
            <BaiduGuessMap
              guess={guess}
              answer={
                phase === "result" ? { lat: puzzle.lat, lng: puzzle.lng } : null
              }
              disabled={phase === "result"}
              onGuess={setGuess}
            />

            <section className="border-t border-stone-800 px-4 py-4">
              {phase === "result" && result ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-stone-400">答案</div>
                    <div className="mt-1 text-xl font-black text-amber-200">
                      {puzzle.answerName}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-stone-300">
                      {puzzle.answerContext}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-stone-950 px-3 py-3">
                      <div className="text-xs text-stone-500">偏差</div>
                      <div className="mt-1 font-bold text-stone-100">
                        {formatDistance(result.distanceKm)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-stone-950 px-3 py-3">
                      <div className="text-xs text-stone-500">得分</div>
                      <div className="mt-1 font-bold text-stone-100">
                        {result.score.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextPuzzle}
                    className="min-h-11 w-full rounded-lg bg-amber-400 px-4 font-bold text-stone-950 transition hover:bg-amber-300 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                  >
                    下一题
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm leading-6 text-stone-300">
                    {guess
                      ? `已选择：${guess.lat.toFixed(3)}, ${guess.lng.toFixed(3)}`
                      : "还未选择地点"}
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!guess}
                    className="min-h-11 w-full rounded-lg bg-amber-400 px-4 font-bold text-stone-950 transition hover:bg-amber-300 focus:ring-2 focus:ring-amber-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    提交答案
                  </button>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
