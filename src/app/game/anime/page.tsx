"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleGuessMap } from "~/app/game/foreign/_components/GoogleGuessMap";
import {
  ANIME_GUESSR_IMAGE_BASE_URL,
  ANIME_GUESSR_PLACEHOLDER_IMAGE_URL,
  ANIME_GUESSR_ROUNDS,
  buildAnimeGuessrImageUrl,
  fetchAnimeGuessrQuestions,
  pickAnimeGuessrQuestions,
  type AnimeGuessrQuestion,
} from "~/lib/anime-guessr";
import { DEFAULT_FOREIGN_COUNTRY } from "~/lib/foreign-map";
import {
  haversineDistance,
  locationRoundScore,
  LOCATION_ROUND_SCORE_MAX,
} from "~/lib/scoring";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";

type Phase = "playing" | "result" | "final";
type LoadState = "loading" | "ready" | "error";

interface AnimeRoundResult {
  question: AnimeGuessrQuestion;
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
  if (score >= 450) return { label: "圣地巡礼大师", symbol: "S" };
  if (score >= 360) return { label: "取景地猎手", symbol: "A" };
  if (score >= 240) return { label: "动漫地理通", symbol: "B" };
  if (score >= 120) return { label: "巡礼新手", symbol: "C" };
  return { label: "迷路中", symbol: "D" };
}

function QuestionImage({ question }: { question: AnimeGuessrQuestion }) {
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const imageUrl = buildAnimeGuessrImageUrl(question.imagePath);
  const displayImageUrl =
    !imageUrl || showPlaceholder
      ? ANIME_GUESSR_PLACEHOLDER_IMAGE_URL
      : imageUrl;

  useEffect(() => {
    setShowPlaceholder(false);
  }, [question.id]);

  return (
    <div className="relative h-full min-h-[300px] bg-stone-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displayImageUrl}
        alt={question.title}
        className="h-full min-h-[300px] w-full object-cover"
        onError={() => {
          if (!showPlaceholder) setShowPlaceholder(true);
        }}
      />
      {(!imageUrl || showPlaceholder) && (
        <div className="absolute right-4 bottom-4 max-w-xs rounded-lg border border-stone-700 bg-stone-950/85 px-3 py-2 text-xs leading-5 text-stone-300 shadow-lg shadow-black/30">
          {ANIME_GUESSR_IMAGE_BASE_URL
            ? "题目图片暂不可用，已显示占位图"
            : "图片前缀未配置，已显示占位图"}
        </div>
      )}
    </div>
  );
}

export default function AnimeGuessrPage() {
  const { ready } = useCompletedPlayerSession();
  const [questions, setQuestions] = useState<AnimeGuessrQuestion[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadMessage, setLoadMessage] = useState("正在加载动漫巡礼题库...");
  const [reloadKey, setReloadKey] = useState(0);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<AnimeRoundResult[]>([]);
  const roundStartedAtRef = useRef(Date.now());

  const current = questions[round];
  const latestResult = results[results.length - 1];
  const roundResult = phase === "result" ? latestResult : undefined;
  const mapGuess = roundResult?.guess ?? guess;
  const mapAnswer = useMemo(
    () =>
      roundResult
        ? { lat: roundResult.question.lat, lng: roundResult.question.lng }
        : null,
    [roundResult],
  );
  const totalScore = useMemo(
    () => results.reduce((sum, result) => sum + result.score, 0),
    [results],
  );

  const loadQuestions = useCallback(() => {
    let active = true;
    setLoadState("loading");
    setLoadMessage("正在加载动漫巡礼题库...");
    setQuestions([]);
    setRound(0);
    setGuess(null);
    setResults([]);
    setPhase("playing");
    roundStartedAtRef.current = Date.now();

    void fetchAnimeGuessrQuestions()
      .then((pool) => {
        if (!active) return;
        const picked = pickAnimeGuessrQuestions(pool, ANIME_GUESSR_ROUNDS);
        if (picked.length < ANIME_GUESSR_ROUNDS) {
          setLoadState("error");
          setLoadMessage(
            `只找到 ${picked.length} / ${ANIME_GUESSR_ROUNDS} 道可用动漫题，请重新生成题库。`,
          );
          return;
        }
        setQuestions(picked);
        setLoadMessage("");
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadState("error");
        setLoadMessage(
          error instanceof Error ? error.message : "动漫题库加载失败",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    return loadQuestions();
  }, [loadQuestions, ready, reloadKey]);

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
        question: current,
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
    if (round + 1 >= questions.length) {
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

  if (loadState === "loading") {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-pink-300/60 text-xl font-black text-pink-100">
          Ani
        </div>
        <div className="text-xl font-bold text-pink-300">猜动漫模式</div>
        <p className="text-sm text-stone-400">{loadMessage}</p>
      </main>
    );
  }

  if (loadState === "error" || (!current && phase !== "final")) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center text-white">
        <p className="max-w-md text-sm leading-6 text-stone-400">
          {loadMessage || "动漫题库为空，请重新生成题库。"}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="min-h-11 rounded-lg bg-pink-400 px-4 py-2 font-bold text-stone-950 transition hover:bg-pink-300 focus:ring-2 focus:ring-pink-200 focus:outline-none"
          >
            重新加载
          </button>
          <Link
            href="/game/solo"
            className="min-h-11 rounded-lg bg-stone-800 px-4 py-2 leading-7 text-stone-200 transition hover:bg-stone-700 focus:ring-2 focus:ring-pink-300 focus:outline-none"
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
          <h1 className="text-xl font-bold text-pink-300">猜动漫模式</h1>
          <Link
            href="/game/solo"
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-300 transition hover:bg-stone-700 focus:ring-2 focus:ring-pink-300 focus:outline-none"
          >
            返回个人模式
          </Link>
        </header>

        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <div className="mb-6 rounded-xl bg-gradient-to-br from-pink-600/25 to-stone-800 p-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-pink-300/60 text-xl font-black text-pink-100">
              {rank.symbol}
            </div>
            <div className="mb-1 text-2xl font-bold text-pink-300">
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
                key={result.question.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-stone-800 px-4 py-3"
              >
                <div>
                  <div className="text-sm text-stone-500">
                    第 {index + 1} 轮
                  </div>
                  <div className="font-bold text-pink-200">
                    {result.question.animeTitle} · {result.question.title}
                  </div>
                  <div className="text-xs text-stone-400">
                    {result.question.location} · 偏差{" "}
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
              className="flex-1 rounded-xl bg-pink-400 py-3 font-bold text-stone-950 transition hover:bg-pink-300 focus:ring-2 focus:ring-pink-200 focus:outline-none"
            >
              再来一局
            </button>
            <Link
              href="/game/solo"
              className="flex-1 rounded-xl bg-stone-700 py-3 text-center font-bold text-stone-300 transition hover:bg-stone-600 focus:ring-2 focus:ring-pink-300 focus:outline-none"
            >
              换模式
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-stone-900 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-700 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-pink-300">猜动漫模式</h1>
          <Link
            href="/game/solo"
            className="text-xs text-stone-500 transition hover:text-stone-300 focus:ring-2 focus:ring-pink-300 focus:outline-none"
          >
            返回个人模式
          </Link>
        </div>
        <span className="text-stone-400">
          第 {round + 1} / {questions.length} 轮{roundResult ? "结果" : ""}
        </span>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <section
          className={`h-full min-h-0 ${roundResult ? "opacity-35" : ""}`}
        >
          {current && <QuestionImage question={current} />}
        </section>

        {!roundResult && current && (
          <aside className="absolute top-4 left-4 z-20 flex w-[min(calc(100vw-2rem),400px)] flex-col gap-3 rounded-xl border border-stone-700 bg-stone-950/90 p-4 shadow-lg shadow-black/30">
            <div>
              <div className="text-sm text-stone-500">作品</div>
              <h2 className="mt-1 text-2xl font-extrabold text-pink-300">
                {current.animeTitle}
              </h2>
              <div className="mt-1 text-sm text-stone-400">
                {current.year} · {current.location}
              </div>
            </div>

            <div className="rounded-lg border border-pink-500/20 bg-pink-500/10 px-3 py-2 text-sm leading-6 text-pink-50">
              {current.description}
            </div>

            {current.aspect && (
              <div className="text-sm leading-6 text-stone-400">
                场景：{current.aspect}
              </div>
            )}
          </aside>
        )}

        {roundResult && (
          <aside className="absolute top-[42%] right-0 bottom-0 left-0 z-30 flex flex-col gap-4 overflow-y-auto border-t border-stone-700 bg-stone-950/92 p-5 lg:top-0 lg:left-auto lg:w-[400px] lg:border-t-0 lg:border-l">
            <div>
              <div className="text-sm text-stone-500">答案</div>
              <h2 className="mt-1 text-2xl font-extrabold text-pink-300">
                {roundResult.question.answerName}
              </h2>
              <p className="mt-1 text-sm text-stone-400">
                {roundResult.question.animeTitle} ·{" "}
                {roundResult.question.location}
              </p>
              {roundResult.question.episodeContext && (
                <p className="mt-2 text-sm text-stone-500">
                  {roundResult.question.episodeContext}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-gradient-to-br from-pink-500/20 to-stone-800 p-5 text-center">
              <div className="text-sm text-stone-400">本轮得分</div>
              <div className="text-6xl font-extrabold text-white">
                {roundResult.score.toLocaleString()}
              </div>
              <div className="text-sm text-stone-500">
                / {LOCATION_ROUND_SCORE_MAX}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">距离分</div>
                <div className="mt-1 font-bold text-stone-100">
                  {roundResult.distancePts}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">速度补偿</div>
                <div className="mt-1 font-bold text-stone-100">
                  +{roundResult.speedCompensationPts}
                </div>
              </div>
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="text-xs text-stone-500">用时</div>
                <div className="mt-1 font-bold text-stone-100">
                  {formatElapsed(roundResult.elapsedSeconds)}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-stone-800 p-4 text-sm leading-6 text-stone-300">
              你的猜测距离实际地点{" "}
              <span className="font-bold text-white">
                {formatDistance(roundResult.distanceKm)}
              </span>
              。
              {roundResult.question.funfact.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-stone-400">
                  {roundResult.question.funfact.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            {roundResult.question.sourceUrl && (
              <a
                href={roundResult.question.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-pink-300 underline-offset-4 hover:underline"
              >
                查看 Anitabi 来源
              </a>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="mt-auto rounded-xl bg-pink-400 py-3 font-bold text-stone-950 transition hover:bg-pink-300 focus:ring-2 focus:ring-pink-200 focus:outline-none"
            >
              {round + 1 >= questions.length ? "查看最终得分" : "下一轮"}
            </button>
          </aside>
        )}

        <div
          className={
            roundResult
              ? "absolute inset-x-0 top-0 z-10 h-[42%] lg:inset-y-0 lg:right-[400px] lg:left-0 lg:h-auto"
              : "group fixed right-3 bottom-3 z-40 h-44 w-56 transition-all duration-200 ease-out focus-within:h-[min(72dvh,640px)] focus-within:w-[min(calc(100vw-1.5rem),920px)] hover:h-[min(72dvh,640px)] hover:w-[min(calc(100vw-1.5rem),920px)] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 sm:right-5 sm:bottom-5 sm:h-48 sm:w-64"
          }
        >
          <section
            className={`flex h-full min-h-0 flex-col overflow-hidden bg-stone-950 shadow-lg shadow-black/40 ${
              roundResult
                ? "border-b border-stone-700 lg:border-r lg:border-b-0"
                : "rounded-xl border border-stone-600"
            }`}
          >
            <div className="min-h-0 flex-1 bg-stone-900">
              <GoogleGuessMap
                country={DEFAULT_FOREIGN_COUNTRY}
                guess={mapGuess}
                answer={mapAnswer}
                answerLabel={roundResult?.question.answerName}
                distanceKm={roundResult?.distanceKm}
                disabled={Boolean(roundResult)}
                minHeightClass="min-h-0"
                onGuess={setGuess}
              />
            </div>

            {!roundResult && (
              <div className="hidden border-t border-stone-700 bg-stone-900/95 p-2 transition group-focus-within:block group-hover:block">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!guess}
                  className="w-full rounded-lg bg-pink-400 px-3 py-2 text-sm font-bold text-stone-950 transition hover:bg-pink-300 focus:ring-2 focus:ring-pink-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  提交猜测
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
