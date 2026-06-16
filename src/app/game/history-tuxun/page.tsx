"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BaiduGuessMap } from "~/app/game/_components/BaiduGuessMap";
import { BaiduPanoramaView } from "~/app/game/_components/BaiduPanoramaView";
import { FloatingGuessMap } from "~/app/game/_components/FloatingGuessMap";
import {
  buildHistoryTuxunPlayState,
  findHistoryTuxunScene,
  HISTORY_TUXUN_CLUE_INTERVAL_SECONDS,
  type HistoryTuxunPlayState,
} from "~/lib/history-tuxun-puzzle";
import {
  haversineDistance,
  locationRoundScore,
  LOCATION_ROUND_SCORE_MAX,
} from "~/lib/scoring";
import { api } from "~/trpc/react";

type Phase = "playing" | "result";
const MAX_PUZZLE_MATCH_FAILURES = 12;

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} 米`;
  return `${Math.round(distanceKm).toLocaleString()} 公里`;
}

function formatElapsed(seconds: number) {
  return `${Math.max(0, Math.round(seconds))} 秒`;
}

function useElapsedSeconds(active: boolean, resetKey: string) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;

    setElapsed(0);
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active, resetKey]);

  return elapsed;
}

export default function HistoryTuxunPage() {
  const [playState, setPlayState] = useState<HistoryTuxunPlayState | null>(
    null,
  );
  const [excludeLocation, setExcludeLocation] = useState<string | undefined>();
  const [phase, setPhase] = useState<Phase>("playing");
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [submittedElapsed, setSubmittedElapsed] = useState<number | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const streetViewFailureCountRef = useRef(0);
  const elapsed = useElapsedSeconds(
    phase === "playing" && playState != null,
    playState?.puzzleId ?? "loading",
  );

  const puzzleQuery = api.locationTuxun.random.useQuery(
    { excludeLocation },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  );

  useEffect(() => {
    if (puzzleQuery.isLoading || puzzleQuery.isFetching) return;
    if (!puzzleQuery.data) return;

    const puzzle = puzzleQuery.data;
    let active = true;
    setPlayState(null);
    setGuess(null);
    setSubmittedElapsed(null);
    setPhase("playing");
    setMatchError(null);

    void findHistoryTuxunScene(puzzle)
      .then((scene) => {
        if (!active) return;

        if (!scene) {
          streetViewFailureCountRef.current += 1;
          if (streetViewFailureCountRef.current >= MAX_PUZZLE_MATCH_FAILURES) {
            setMatchError(
              "连续多道历史题都没有匹配到百度街景，请稍后重试或检查题库点位覆盖。",
            );
            return;
          }

          setExcludeLocation(puzzle.location);
          return;
        }

        streetViewFailureCountRef.current = 0;
        setPlayState(buildHistoryTuxunPlayState(puzzle, scene));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMatchError(
          error instanceof Error
            ? error.message
            : "百度街景匹配失败，请稍后重试。",
        );
      });

    return () => {
      active = false;
    };
  }, [puzzleQuery.data, puzzleQuery.isFetching, puzzleQuery.isLoading]);

  const loadError =
    !puzzleQuery.isLoading &&
    !puzzleQuery.isFetching &&
    (puzzleQuery.isError || puzzleQuery.data === null)
      ? "历史寻图题库未就绪，请先执行 npm run db:migrate 与 npm run db:import-location"
      : null;
  const blockingError = loadError ?? matchError;

  const revealedClueCount = playState
    ? phase === "result"
      ? playState.clues.length
      : Math.min(
          playState.clues.length,
          Math.floor(elapsed / HISTORY_TUXUN_CLUE_INTERVAL_SECONDS) + 1,
        )
    : 0;
  const visibleClues = playState?.clues.slice(0, revealedClueCount) ?? [];
  const nextClueIn =
    phase === "playing" &&
    playState &&
    revealedClueCount < playState.clues.length
      ? HISTORY_TUXUN_CLUE_INTERVAL_SECONDS -
        (elapsed % HISTORY_TUXUN_CLUE_INTERVAL_SECONDS)
      : null;

  const result = useMemo(() => {
    if (!guess || !playState) return null;
    const distanceKm = haversineDistance(
      playState.centerLat,
      playState.centerLng,
      guess.lat,
      guess.lng,
    );
    const elapsedSeconds = submittedElapsed ?? elapsed;
    const score = locationRoundScore({
      distanceKm,
      elapsedSeconds,
      speedCompensationWindowSeconds: Math.max(
        HISTORY_TUXUN_CLUE_INTERVAL_SECONDS,
        playState.clues.length * HISTORY_TUXUN_CLUE_INTERVAL_SECONDS,
      ),
    });
    return {
      distanceKm,
      distancePts: score.distancePts,
      speedCompensationPts: score.speedCompensationPts,
      elapsedSeconds,
      score: score.total,
    };
  }, [elapsed, guess, playState, submittedElapsed]);

  function handleSubmit() {
    if (!guess) return;
    setSubmittedElapsed(elapsed);
    setPhase("result");
  }

  function handleNextPuzzle() {
    if (playState) {
      setExcludeLocation(playState.location);
    }
    setGuess(null);
    setSubmittedElapsed(null);
    setPhase("playing");
  }

  const handlePanoramaUnavailable = useCallback(() => {
    if (!playState) return;
    setPlayState(null);
    setGuess(null);
    setSubmittedElapsed(null);
    setPhase("playing");
    setExcludeLocation(playState.location);
  }, [playState]);

  if (blockingError) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-950 px-6 text-stone-100">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-black text-amber-200">历史寻图题</h1>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            {blockingError}
          </p>
          <button
            type="button"
            onClick={() => {
              streetViewFailureCountRef.current = 0;
              setMatchError(null);
              void puzzleQuery.refetch();
            }}
            className="mt-6 min-h-11 rounded-lg bg-amber-400 px-5 font-bold text-stone-950 transition hover:bg-amber-300"
          >
            重新匹配
          </button>
        </div>
      </main>
    );
  }

  if (!playState || puzzleQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-950 text-stone-100">
        <div className="text-center">
          <h1 className="text-xl font-black text-amber-200">历史寻图题</h1>
          <p className="mt-3 text-sm text-stone-400">
            {puzzleQuery.isLoading || puzzleQuery.isFetching
              ? "正在从题库加载题目..."
              : "正在匹配有街景的历史题..."}
          </p>
        </div>
      </main>
    );
  }

  if (phase === "result" && guess && result) {
    return (
      <main className="flex min-h-screen flex-col bg-stone-900 text-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-700 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-xl font-bold text-amber-300">历史图寻模式</h1>
            <p className="mt-0.5 text-sm text-stone-400">本题结算</p>
          </div>

          <Link
            href="/game/solo"
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-300 transition hover:bg-stone-700 focus:ring-2 focus:ring-amber-300 focus:outline-none"
          >
            返回个人模式
          </Link>
        </header>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_400px]">
          <section className="min-h-[420px]">
            <BaiduGuessMap
              guess={guess}
              answer={{ lat: playState.centerLat, lng: playState.centerLng }}
              answerLabel={playState.answerName}
              distanceKm={result.distanceKm}
              disabled
              onGuess={setGuess}
            />
          </section>

          <aside className="flex flex-col gap-4 overflow-y-auto border-t border-stone-700 bg-stone-950/70 p-5 lg:border-t-0 lg:border-l">
            <div>
              <div className="text-sm text-stone-500">实际地点</div>
              <h2 className="mt-1 text-2xl font-extrabold text-amber-300">
                {playState.answerName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                {playState.answerContext}
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-amber-500/20 to-stone-800 p-5 text-center">
              <div className="text-sm text-stone-400">本题得分</div>
              <div className="text-6xl font-extrabold text-white">
                {result.score.toLocaleString()}
              </div>
              <div className="text-sm text-stone-500">
                / {LOCATION_ROUND_SCORE_MAX}
              </div>
            </div>

            <p className="rounded-xl bg-stone-800 p-4 text-sm leading-6 text-stone-300">
              本题不猜年份，满分 100
              分；基础分只看答案距离，提交越快可获得少量速度补偿。
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">偏差</div>
                <div className="mt-1 font-bold text-stone-100">
                  {formatDistance(result.distanceKm)}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">用时</div>
                <div className="mt-1 font-bold text-stone-100">
                  {formatElapsed(result.elapsedSeconds)}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">距离分</div>
                <div className="mt-1 font-bold text-stone-100">
                  {result.distancePts}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">速度补偿</div>
                <div className="mt-1 font-bold text-stone-100">
                  +{result.speedCompensationPts}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">已解锁线索</div>
                <div className="mt-1 font-bold text-stone-100">
                  {visibleClues.length} / {playState.clues.length}
                </div>
              </div>
            </div>

            {playState.funfact.length > 0 ? (
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="mb-3 text-sm font-semibold text-amber-300">
                  冷知识
                </div>
                <ul className="space-y-2 text-sm leading-6 text-stone-300">
                  {playState.funfact.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl bg-stone-800 p-4">
              <div className="mb-3 text-sm font-semibold text-amber-300">
                本题线索
              </div>
              <ol className="space-y-2 text-sm leading-6 text-stone-300">
                {playState.clues.map((clue, index) => (
                  <li key={clue} className="flex gap-2">
                    <span className="font-mono text-xs text-amber-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{clue}</span>
                  </li>
                ))}
              </ol>
            </div>

            <button
              type="button"
              onClick={handleNextPuzzle}
              className="mt-auto min-h-11 rounded-xl bg-amber-400 py-3 font-bold text-stone-950 transition hover:bg-amber-300 focus:ring-2 focus:ring-amber-200 focus:outline-none"
            >
              下一题
            </button>
          </aside>
        </div>
      </main>
    );
  }

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
            disabled={puzzleQuery.isFetching}
            className="min-h-11 rounded-lg border border-stone-700 px-4 text-sm font-semibold text-stone-200 transition hover:border-amber-300 hover:text-amber-100 focus:ring-2 focus:ring-amber-300 focus:outline-none disabled:cursor-wait disabled:opacity-60"
          >
            换一题
          </button>
        </header>

        <div className="grid min-h-0 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-b border-stone-800 bg-stone-900 px-4 py-5 sm:px-6 lg:border-r lg:border-b-0">
            <section>
              <div className="text-sm font-semibold text-amber-200">
                历史线索
              </div>
              <ol className="mt-4 space-y-3">
                {visibleClues.map((clue, index) => (
                  <li
                    key={`${playState.puzzleId}-${index}`}
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
                根据左侧逐步出现的历史线索和中间的百度图像，在右下角百度地图中选出对应城市的位置。
              </p>
            </section>
          </aside>

          <section className="relative min-h-[420px] overflow-hidden bg-black">
            <BaiduPanoramaView
              key={`${playState.puzzleId}-${playState.scenePanoId ?? `${playState.sceneLat}-${playState.sceneLng}`}`}
              point={{ lat: playState.sceneLat, lng: playState.sceneLng }}
              panoId={playState.scenePanoId}
              heading={playState.heading}
              pitch={playState.pitch}
              onUnavailable={handlePanoramaUnavailable}
            />

            <div className="absolute top-4 left-4 rounded-md border border-black/40 bg-stone-950/80 px-3 py-2 text-xs font-semibold text-stone-200 shadow-lg shadow-black/30">
              百度 JS 全景图
            </div>
          </section>

          <FloatingGuessMap
            guessLat={guess?.lat ?? null}
            guessLng={guess?.lng ?? null}
            onGuess={(lat, lng) => setGuess({ lat, lng })}
            onSubmit={handleSubmit}
            disabled={!guess}
            submitLabel="提交答案"
            title="历史图寻猜点"
          />
        </div>
      </div>
    </main>
  );
}
