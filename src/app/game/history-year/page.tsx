"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TimelineSlider } from "~/app/game/_components/TimelineSlider";
import { HISTORY_TUXUN_CLUE_INTERVAL_SECONDS } from "~/lib/history-tuxun-puzzle";
import {
  HISTORY_YEAR_SCORE_MAX,
  formatAnswerYear,
  formatYear,
  historyYearRoundScore,
} from "~/lib/scoring";
import { api } from "~/trpc/react";
import { type HistoryYearPuzzle } from "~/types/location-tuxun";

type Phase = "playing" | "result";

const DEFAULT_YEAR_GUESS = 1900;

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

function getRevealedClueCount(
  puzzle: HistoryYearPuzzle | null,
  phase: Phase,
  elapsed: number,
) {
  if (!puzzle) return 0;
  if (phase === "result") return puzzle.clues.length;
  return Math.min(
    puzzle.clues.length,
    Math.floor(elapsed / HISTORY_TUXUN_CLUE_INTERVAL_SECONDS) + 1,
  );
}

function formatClueMultiplier(multiplier: number) {
  return `${Math.round(multiplier * 100)}%`;
}

export default function HistoryYearPage() {
  const [excludePuzzleId, setExcludePuzzleId] = useState<string | undefined>();
  const [phase, setPhase] = useState<Phase>("playing");
  const [guessYear, setGuessYear] = useState(DEFAULT_YEAR_GUESS);
  const [submittedElapsed, setSubmittedElapsed] = useState<number | null>(null);
  const [submittedClueCount, setSubmittedClueCount] = useState<number | null>(
    null,
  );

  const puzzleQueryInput = useMemo(
    () => (excludePuzzleId ? { excludePuzzleId } : {}),
    [excludePuzzleId],
  );
  const puzzleQuery = api.locationTuxun.randomYear.useQuery(puzzleQueryInput, {
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const puzzle = puzzleQuery.data ?? null;
  const puzzleId = puzzle?.puzzleId;
  const elapsed = useElapsedSeconds(
    phase === "playing" && puzzle != null,
    puzzleId ?? "loading",
  );

  useEffect(() => {
    if (!puzzleId) return;
    setPhase("playing");
    setGuessYear(DEFAULT_YEAR_GUESS);
    setSubmittedElapsed(null);
    setSubmittedClueCount(null);
  }, [puzzleId]);

  const revealedClueCount = getRevealedClueCount(puzzle, phase, elapsed);
  const visibleClues = puzzle?.clues.slice(0, revealedClueCount) ?? [];
  const nextClueIn =
    phase === "playing" && puzzle && revealedClueCount < puzzle.clues.length
      ? HISTORY_TUXUN_CLUE_INTERVAL_SECONDS -
        (elapsed % HISTORY_TUXUN_CLUE_INTERVAL_SECONDS)
      : null;

  const currentClueMultiplier = puzzle
    ? historyYearRoundScore({
        actualYear: 0,
        guessedYear: 0,
        revealedClueCount,
        totalClues: puzzle.clues.length,
      }).clueMultiplier
    : 1;

  const result = useMemo(() => {
    if (!puzzle) return null;
    const usedClues = submittedClueCount ?? revealedClueCount;
    const score = historyYearRoundScore({
      actualYear: puzzle.answerYear,
      guessedYear: guessYear,
      yearEnd: puzzle.answerYearEnd,
      revealedClueCount: usedClues,
      totalClues: puzzle.clues.length,
    });

    return {
      ...score,
      usedClues,
      elapsedSeconds: submittedElapsed ?? elapsed,
      yearDiff: Math.round(
        Math.abs(
          guessYear -
            (puzzle.answerYearEnd === undefined
              ? puzzle.answerYear
              : (puzzle.answerYear + puzzle.answerYearEnd) / 2),
        ),
      ),
    };
  }, [
    elapsed,
    guessYear,
    puzzle,
    revealedClueCount,
    submittedClueCount,
    submittedElapsed,
  ]);

  function handleSubmit() {
    setSubmittedElapsed(elapsed);
    setSubmittedClueCount(revealedClueCount);
    setPhase("result");
  }

  function handleNextPuzzle() {
    if (puzzle) setExcludePuzzleId(puzzle.puzzleId);
    setPhase("playing");
    setGuessYear(DEFAULT_YEAR_GUESS);
    setSubmittedElapsed(null);
    setSubmittedClueCount(null);
  }

  const loadError =
    !puzzleQuery.isLoading &&
    !puzzleQuery.isFetching &&
    (puzzleQuery.isError || puzzleQuery.data === null)
      ? "历史猜年份题库未就绪，请确认历史寻图题已导入且包含年份。"
      : null;

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-950 px-6 text-stone-100">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-black text-fuchsia-200">历史猜年份</h1>
          <p className="mt-4 text-sm leading-7 text-stone-300">{loadError}</p>
          <button
            type="button"
            onClick={() => void puzzleQuery.refetch()}
            className="mt-6 min-h-11 rounded-lg bg-fuchsia-400 px-5 font-bold text-stone-950 transition hover:bg-fuchsia-300 focus:ring-2 focus:ring-fuchsia-200 focus:outline-none"
          >
            重新加载
          </button>
        </div>
      </main>
    );
  }

  if (!puzzle || puzzleQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-950 text-stone-100">
        <div className="text-center">
          <h1 className="text-xl font-black text-fuchsia-200">历史猜年份</h1>
          <p className="mt-3 text-sm text-stone-400">正在抽取历史年份题...</p>
        </div>
      </main>
    );
  }

  if (phase === "result" && result) {
    return (
      <main className="flex min-h-screen flex-col bg-stone-900 text-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-700 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-xl font-bold text-fuchsia-300">历史猜年份</h1>
            <p className="mt-0.5 text-sm text-stone-400">本题结算</p>
          </div>

          <Link
            href="/game/solo"
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-300 transition hover:bg-stone-700 focus:ring-2 focus:ring-fuchsia-300 focus:outline-none"
          >
            返回个人模式
          </Link>
        </header>

        <div className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 rounded-xl border border-stone-700 bg-stone-950 p-5">
            <div className="text-sm text-stone-500">实际事件</div>
            <h2 className="mt-1 text-2xl font-extrabold text-fuchsia-300">
              {puzzle.answerName}
            </h2>
            <div className="mt-2 text-sm text-stone-400">
              {puzzle.location} · {puzzle.category}
            </div>
            <p className="mt-4 text-sm leading-7 text-stone-300">
              {puzzle.answerContext}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">你的年份</div>
                <div className="mt-1 font-bold text-stone-100">
                  {formatYear(guessYear)}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">标准答案</div>
                <div className="mt-1 font-bold text-green-300">
                  {formatAnswerYear(puzzle.answerYear, puzzle.answerYearEnd)}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">年份偏差</div>
                <div className="mt-1 font-bold text-stone-100">
                  {result.yearDiff.toLocaleString()} 年
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">提交用时</div>
                <div className="mt-1 font-bold text-stone-100">
                  {Math.round(result.elapsedSeconds)} 秒
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-stone-800 p-4">
              <div className="mb-3 text-sm font-semibold text-fuchsia-300">
                本题线索
              </div>
              <ol className="space-y-2 text-sm leading-6 text-stone-300">
                {puzzle.clues.map((clue, index) => (
                  <li key={clue} className="flex gap-2">
                    <span className="font-mono text-xs text-fuchsia-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{clue}</span>
                  </li>
                ))}
              </ol>
            </div>

            {puzzle.funfact.length > 0 ? (
              <div className="mt-5 rounded-xl bg-stone-800 p-4">
                <div className="mb-3 text-sm font-semibold text-fuchsia-300">
                  冷知识
                </div>
                <ul className="space-y-2 text-sm leading-6 text-stone-300">
                  {puzzle.funfact.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <aside className="flex flex-col gap-4 rounded-xl border border-stone-700 bg-stone-950 p-5">
            <div className="rounded-xl bg-gradient-to-br from-fuchsia-500/25 to-stone-800 p-5 text-center">
              <div className="text-sm text-stone-400">本题得分</div>
              <div className="text-6xl font-extrabold text-white">
                {result.total.toLocaleString()}
              </div>
              <div className="text-sm text-stone-500">
                / {HISTORY_YEAR_SCORE_MAX.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">年份准确分</div>
                <div className="mt-1 font-bold text-stone-100">
                  {result.accuracyPts.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">线索扣分</div>
                <div className="mt-1 font-bold text-red-300">
                  -{result.cluePenaltyPts.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">提交线索</div>
                <div className="mt-1 font-bold text-stone-100">
                  {result.usedClues} / {puzzle.clues.length}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">线索倍率</div>
                <div className="mt-1 font-bold text-stone-100">
                  {formatClueMultiplier(result.clueMultiplier)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextPuzzle}
              disabled={puzzleQuery.isFetching}
              className="mt-auto min-h-11 rounded-xl bg-fuchsia-400 py-3 font-bold text-stone-950 transition hover:bg-fuchsia-300 focus:ring-2 focus:ring-fuchsia-200 focus:outline-none disabled:cursor-wait disabled:opacity-60"
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
            <h1 className="text-xl font-black text-fuchsia-200">历史猜年份</h1>
            <p className="mt-0.5 text-sm text-stone-400">
              第 {revealedClueCount} 条线索已解锁
              {nextClueIn
                ? `，下一条 ${nextClueIn} 秒后出现`
                : "，线索已全部给出"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/game/solo"
              className="min-h-11 rounded-lg border border-stone-700 px-4 py-2.5 text-sm font-semibold text-stone-200 transition hover:border-fuchsia-300 hover:text-fuchsia-100 focus:ring-2 focus:ring-fuchsia-300 focus:outline-none"
            >
              返回个人模式
            </Link>
            <button
              type="button"
              onClick={handleNextPuzzle}
              disabled={puzzleQuery.isFetching}
              className="min-h-11 rounded-lg border border-stone-700 px-4 text-sm font-semibold text-stone-200 transition hover:border-fuchsia-300 hover:text-fuchsia-100 focus:ring-2 focus:ring-fuchsia-300 focus:outline-none disabled:cursor-wait disabled:opacity-60"
            >
              换一题
            </button>
          </div>
        </header>

        <div className="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-h-0 overflow-y-auto border-b border-stone-800 bg-stone-900 px-4 py-5 sm:px-6 lg:border-r lg:border-b-0">
            <div className="text-sm font-semibold text-fuchsia-200">
              历史线索
            </div>
            <ol className="mt-4 space-y-3">
              {visibleClues.map((clue, index) => (
                <li
                  key={`${puzzle.puzzleId}-${index}`}
                  className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm leading-6 text-stone-200"
                >
                  <span className="mr-2 font-mono text-fuchsia-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {clue}
                </li>
              ))}
            </ol>
          </section>

          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto bg-stone-950 px-4 py-5 sm:px-6">
            <section className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-3">
              <div className="text-sm font-semibold text-fuchsia-100">
                当前线索倍率
              </div>
              <div className="mt-2 text-4xl font-black text-white">
                {formatClueMultiplier(currentClueMultiplier)}
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                现在提交会按已解锁线索数量折算得分。
              </p>
            </section>

            <TimelineSlider value={guessYear} onChange={setGuessYear} />

            <button
              type="button"
              onClick={handleSubmit}
              className="min-h-11 rounded-xl bg-fuchsia-400 py-3 font-bold text-stone-950 transition hover:bg-fuchsia-300 focus:ring-2 focus:ring-fuchsia-200 focus:outline-none"
            >
              提交年份
            </button>

            <section className="mt-auto rounded-xl border border-stone-700 bg-stone-900 px-4 py-3">
              <div className="text-sm font-semibold text-stone-200">
                当前猜测
              </div>
              <div className="mt-2 text-2xl font-black text-fuchsia-300">
                {formatYear(guessYear)}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
