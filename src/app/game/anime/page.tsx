"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleGuessMap } from "~/app/game/foreign/_components/GoogleGuessMap";
import { GoogleStreetView } from "~/app/game/foreign/_components/GoogleStreetView";
import {
  ANIME_GUESSR_IMAGE_BASE_URL,
  ANIME_GUESSR_PLACEHOLDER_IMAGE_URL,
  ANIME_GUESSR_ROUNDS,
  buildAnimeGuessrImageUrl,
  fetchAnimeGuessrQuestions,
  pickAnimeGuessrQuestions,
  toAnimeStreetViewLocation,
  type AnimeGuessrQuestion,
} from "~/lib/anime-guessr";
import { DEFAULT_FOREIGN_COUNTRY } from "~/lib/foreign-map";
import { GOOGLE_MAP_AK } from "~/lib/google-street-view";
import {
  haversineDistance,
  locationRoundScore,
  LOCATION_ROUND_SCORE_MAX,
} from "~/lib/scoring";
import { AuthLoading, useEmailSession } from "~/lib/player-session-guard";
import {
  canStartGuestGame,
  getGuestGamesRemaining,
  loadGuestProgress,
  markGuestGameStarted,
  saveGuestGameResult,
  storeGuestProgress,
  type GuestProgress,
} from "~/lib/guest-progress";
import { capturePostHogEvent } from "~/lib/posthog";
import { api } from "~/trpc/react";

type Phase = "playing" | "result" | "final";
type LoadState = "loading" | "ready" | "error";
type AuthPromptReason = "record" | "leaderboard" | "history" | "quota";

interface AnimeRoundResult {
  question: AnimeGuessrQuestion;
  guess: { lat: number; lng: number };
  distanceKm: number;
  distancePts: number;
  speedCompensationPts: number;
  elapsedSeconds: number;
  score: number;
}

const AUTH_PROMPT_COPY: Record<
  AuthPromptReason,
  { title: string; body: string }
> = {
  record: {
    title: "保存这次新纪录",
    body: "登录后可以把本地新纪录保存到账号，后续换设备也能继续追踪成绩。",
  },
  leaderboard: {
    title: "登录查看排行榜",
    body: "排行榜需要账号成绩，登录后会把本局分数写入你的成绩记录。",
  },
  history: {
    title: "保存历史成绩",
    body: "游客成绩只保存在当前浏览器。登录后可以长期保存每局记录。",
  },
  quota: {
    title: "今日游客局数已用完",
    body: "游客每天可以免费玩 3 局。登录后可以继续保存成绩并跨设备查看记录。",
  },
};

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

function AuthPromptModal({
  reason,
  onClose,
}: {
  reason: AuthPromptReason;
  onClose: () => void;
}) {
  const copy = AUTH_PROMPT_COPY[reason];
  const next = "/game/anime";

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="anime-panel w-full max-w-md p-6">
        <div className="anime-chip mb-4 w-fit">账号同步</div>
        <h2 className="text-2xl font-black text-pink-100">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-pink-50/70">{copy.body}</p>

        <div className="mt-6 grid gap-3">
          <Link
            href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
            className="anime-button text-center"
          >
            使用 Google 继续
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="anime-button-secondary text-center"
          >
            使用邮箱登录 / 注册
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl text-sm font-bold text-cyan-100/70 transition hover:bg-white/10 hover:text-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
          >
            继续游客模式
          </button>
        </div>
      </div>
    </div>
  );
}

function AnimeClueImage({ question }: { question: AnimeGuessrQuestion }) {
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
    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displayImageUrl}
        alt={question.title}
        className="h-full w-full object-cover"
        onError={() => {
          if (!showPlaceholder) setShowPlaceholder(true);
        }}
      />
      {(!imageUrl || showPlaceholder) && (
        <div className="absolute right-2 bottom-2 left-2 rounded-lg border border-white/10 bg-slate-950/90 px-2 py-1.5 text-[11px] leading-4 text-pink-50/80">
          {ANIME_GUESSR_IMAGE_BASE_URL
            ? "题目图片暂不可用，已显示占位图"
            : "图片前缀未配置，已显示占位图"}
        </div>
      )}
    </div>
  );
}

export default function AnimeGuessrPage() {
  const { ready, session } = useEmailSession();
  const [questions, setQuestions] = useState<AnimeGuessrQuestion[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadMessage, setLoadMessage] = useState("正在加载动漫巡礼题库...");
  const [guestProgress, setGuestProgress] = useState<GuestProgress | null>(
    null,
  );
  const [authPromptReason, setAuthPromptReason] =
    useState<AuthPromptReason | null>(null);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<AnimeRoundResult[]>([]);
  const roundStartedAtRef = useRef(Date.now());
  const recordedStartKeyRef = useRef<string | null>(null);
  const recordedCompletionKeyRef = useRef<string | null>(null);
  const recordActivity = api.player.recordActivity.useMutation();
  const recordGameSession = api.player.recordGameSession.useMutation();

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
  const currentStreetViewLocation = useMemo(
    () => (current ? toAnimeStreetViewLocation(current) : null),
    [current],
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
    setGuestBlocked(false);
    setShareMessage("");
    roundStartedAtRef.current = Date.now();
    recordedCompletionKeyRef.current = null;

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
    setGuestProgress(loadGuestProgress());
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    return loadQuestions();
  }, [loadQuestions, ready, reloadKey]);

  useEffect(() => {
    if (phase !== "playing" || !current) return;
    roundStartedAtRef.current = Date.now();
  }, [current, phase]);

  useEffect(() => {
    if (loadState !== "ready" || questions.length === 0) return;
    const key = `${reloadKey}:${questions.map((question) => question.id).join(",")}`;
    if (recordedStartKeyRef.current === key) return;
    recordedStartKeyRef.current = key;

    if (session) {
      recordActivity.mutate({
        token: session.token,
        eventType: "anime_game_started",
        payload: { rounds: questions.length },
        route: "/game/anime",
      });
      capturePostHogEvent(
        "anime_game_started",
        { rounds: questions.length, auth_state: "logged_in" },
        session.user.id,
      );
      return;
    }

    const progress = loadGuestProgress();
    if (!canStartGuestGame(progress)) {
      setGuestProgress(progress);
      setGuestBlocked(true);
      setAuthPromptReason("quota");
      capturePostHogEvent("guest_quota_blocked", {
        games_started_today: progress.startedToday,
      });
      return;
    }

    const nextProgress = markGuestGameStarted(progress);
    storeGuestProgress(nextProgress);
    setGuestProgress(nextProgress);
    capturePostHogEvent("anime_game_started", {
      rounds: questions.length,
      auth_state: "guest",
      games_remaining: getGuestGamesRemaining(nextProgress),
    });
  }, [loadState, questions, recordActivity, reloadKey, session]);

  function handleSubmit() {
    if (!current || !guess || guestBlocked) return;

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
    const roundPayload = {
      round: round + 1,
      questionId: current.id,
      score: score.total,
      distanceKm: Number(distanceKm.toFixed(3)),
      elapsedSeconds: Math.round(elapsedSeconds),
    };
    if (session) {
      recordActivity.mutate({
        token: session.token,
        eventType: "anime_round_submitted",
        payload: roundPayload,
        route: "/game/anime",
      });
    }
    capturePostHogEvent(
      "anime_round_submitted",
      {
        ...roundPayload,
        auth_state: session ? "logged_in" : "guest",
      },
      session?.user.id,
    );
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

  async function handleShareScore() {
    const text = `我在 AniGuessr 猜动漫模式拿到 ${totalScore.toLocaleString()} 分，你也来试试：${window.location.origin}/game/anime`;
    capturePostHogEvent(
      "anime_score_shared",
      { score: totalScore, auth_state: session ? "logged_in" : "guest" },
      session?.user.id,
    );

    try {
      if (navigator.share) {
        await navigator.share({ title: "AniGuessr 成绩", text });
        setShareMessage("分享面板已打开。");
        return;
      }

      await navigator.clipboard.writeText(text);
      setShareMessage("成绩文案已复制。");
    } catch {
      setShareMessage("分享未完成，可以稍后再试。");
    }
  }

  useEffect(() => {
    if (phase !== "final" || results.length === 0) return;
    const key = `${reloadKey}:${results.map((result) => result.question.id).join(",")}:${totalScore}`;
    if (recordedCompletionKeyRef.current === key) return;
    recordedCompletionKeyRef.current = key;

    const maxScore = results.length * LOCATION_ROUND_SCORE_MAX;
    const summary = {
      id: key,
      score: totalScore,
      maxScore,
      rounds: results.length,
      playedAt: new Date().toISOString(),
    };

    if (session) {
      recordActivity.mutate({
        token: session.token,
        eventType: "anime_game_completed",
        payload: {
          rounds: results.length,
          totalScore,
        },
        route: "/game/anime",
      });
      recordGameSession.mutate({
        token: session.token,
        score: totalScore,
        country: "global",
        mode: "anime",
        rounds: results.length,
      });
      capturePostHogEvent(
        "anime_game_completed",
        { score: totalScore, rounds: results.length, auth_state: "logged_in" },
        session.user.id,
      );
      return;
    }

    const currentProgress = loadGuestProgress();
    const saved = saveGuestGameResult(currentProgress, summary);
    storeGuestProgress(saved.progress);
    setGuestProgress(saved.progress);
    recordGameSession.mutate({
      guestId: saved.progress.guestId,
      score: totalScore,
      country: "global",
      mode: "anime",
      rounds: results.length,
    });
    capturePostHogEvent("anime_game_completed", {
      score: totalScore,
      rounds: results.length,
      auth_state: "guest",
      is_new_best: saved.isNewBest,
    });

    if (saved.isNewBest) {
      setAuthPromptReason("record");
    }
  }, [
    phase,
    recordActivity,
    recordGameSession,
    reloadKey,
    results,
    session,
    totalScore,
  ]);

  const handleCurrentStreetViewUnavailable = useCallback(() => {
    if (!current) return;

    if (!GOOGLE_MAP_AK) {
      setLoadState("error");
      setLoadMessage(
        "未配置 Google Maps AK，无法加载猜动漫模式的现实街景；请配置 NEXT_PUBLIC_GOOGLE_MAP_AK 后重试。",
      );
      return;
    }

    const nextQuestions = questions.filter(
      (question) => question.id !== current.id,
    );
    setQuestions(nextQuestions);
    setGuess(null);

    if (nextQuestions.length <= results.length) {
      if (results.length > 0) {
        setPhase("final");
        return;
      }

      setLoadState("error");
      setLoadMessage("当前没有可用的 Google 街景题目，请重新加载题库。");
      return;
    }

    setRound(Math.min(round, nextQuestions.length - 1));
    setPhase("playing");
    setLoadMessage(
      "上一道动漫巡礼题的现实街景加载失败，已跳过并切换到下一题。",
    );
  }, [current, questions, results.length, round]);

  if (!ready) return <AuthLoading />;

  if (guestBlocked) {
    return (
      <main className="anime-shell grid min-h-screen place-items-center px-5 text-center text-white">
        {authPromptReason && (
          <AuthPromptModal
            reason={authPromptReason}
            onClose={() => setAuthPromptReason(null)}
          />
        )}
        <div className="anime-panel w-full max-w-md p-7">
          <div className="anime-chip mx-auto mb-4 w-fit">游客模式</div>
          <h1 className="text-3xl font-black text-pink-100">
            今日免费局数已用完
          </h1>
          <p className="mt-3 text-sm leading-6 text-pink-50/70">
            未登录每天可以免费玩 3
            局，并保存在当前浏览器。登录后可以继续保存成绩和历史记录。
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              href="/api/auth/google/start?next=/game/anime"
              className="anime-button"
            >
              使用 Google 继续
            </Link>
            <Link
              href="/login?next=/game/anime"
              className="anime-button-secondary"
            >
              使用邮箱登录 / 注册
            </Link>
            <Link href="/" className="text-sm font-bold text-cyan-100/70">
              返回主页
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loadState === "loading") {
    return (
      <main className="anime-shell flex h-screen flex-col items-center justify-center gap-4 text-white">
        <div className="grid h-16 w-16 place-items-center rounded-full border border-cyan-200/40 bg-cyan-200/10 text-xl font-black text-cyan-100">
          Ani
        </div>
        <div className="text-xl font-black text-pink-200">猜动漫模式</div>
        <p className="text-sm text-pink-50/70">{loadMessage}</p>
      </main>
    );
  }

  if (loadState === "error" || (!current && phase !== "final")) {
    return (
      <main className="anime-shell flex h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <p className="max-w-md text-sm leading-6 text-pink-50/70">
          {loadMessage || "动漫题库为空，请重新生成题库。"}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="anime-button"
          >
            重新加载
          </button>
          <Link href="/" className="anime-button-secondary">
            返回主页
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "final") {
    const maxScore = results.length * LOCATION_ROUND_SCORE_MAX;
    const rank = getRank(totalScore);

    return (
      <main className="anime-shell flex min-h-screen flex-col text-white">
        {authPromptReason && (
          <AuthPromptModal
            reason={authPromptReason}
            onClose={() => setAuthPromptReason(null)}
          />
        )}
        <header className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-6 py-3 backdrop-blur">
          <h1 className="text-xl font-black text-pink-200">AniGuessr</h1>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-bold text-pink-50 transition hover:bg-white/15 focus:ring-2 focus:ring-cyan-200 focus:outline-none"
          >
            返回主页
          </Link>
        </header>

        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <div className="anime-panel mb-6 p-8 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-cyan-200/40 bg-cyan-200/10 text-xl font-black text-cyan-100">
              {rank.symbol}
            </div>
            <div className="mb-1 text-2xl font-black text-pink-200">
              {rank.label}
            </div>
            <div className="text-7xl font-extrabold text-white">
              {totalScore.toLocaleString()}
            </div>
            <div className="mt-1 text-pink-50/60">
              / {maxScore.toLocaleString()} 分
            </div>
            {!session && guestProgress && (
              <div className="mt-4 rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-sm text-cyan-50">
                游客今日剩余 {getGuestGamesRemaining(guestProgress)} 局 ·
                本地最高 {guestProgress.bestScore.toLocaleString()} 分
              </div>
            )}
          </div>

          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={result.question.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/10 px-4 py-3"
              >
                <div>
                  <div className="text-sm text-cyan-100/70">
                    第 {index + 1} 轮
                  </div>
                  <div className="font-black text-pink-100">
                    {result.question.animeTitle} · {result.question.title}
                  </div>
                  <div className="text-xs text-pink-50/60">
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

          {shareMessage && (
            <div className="mt-6 rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-4 py-3 text-sm text-cyan-50">
              {shareMessage}
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleShareScore}
              className="anime-button-secondary"
            >
              分享成绩
            </button>
            <button
              type="button"
              onClick={() =>
                session
                  ? setShareMessage("排行榜即将开放，当前成绩已保存。")
                  : setAuthPromptReason("leaderboard")
              }
              className="anime-button-secondary"
            >
              查看排行榜
            </button>
            <button
              type="button"
              onClick={() =>
                session
                  ? setShareMessage("历史成绩已保存到账号。")
                  : setAuthPromptReason("history")
              }
              className="anime-button-secondary"
            >
              保存历史成绩
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="anime-button"
            >
              再来一局
            </button>
            <Link href="/" className="anime-button-secondary sm:col-span-2">
              返回主页
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="anime-shell flex h-screen flex-col text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-pink-200">AniGuessr</h1>
          <Link
            href="/"
            className="text-xs font-bold text-cyan-100/60 transition hover:text-cyan-100 focus:ring-2 focus:ring-cyan-200 focus:outline-none"
          >
            返回主页
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!session && guestProgress && (
            <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-bold text-cyan-50">
              游客 · 今日剩余 {getGuestGamesRemaining(guestProgress)} 局
            </span>
          )}
          <span className="anime-chip">
            第 {round + 1} / {questions.length} 轮{roundResult ? "结果" : ""}
          </span>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <section
          className={`h-full min-h-0 ${
            roundResult ? "pointer-events-none opacity-0" : ""
          }`}
          aria-hidden={Boolean(roundResult)}
        >
          {currentStreetViewLocation && !roundResult && (
            <GoogleStreetView
              key={currentStreetViewLocation.id}
              location={currentStreetViewLocation}
              onUnavailable={handleCurrentStreetViewUnavailable}
            />
          )}
        </section>

        {!roundResult && current && (
          <aside className="anime-panel absolute top-4 left-4 z-20 flex max-h-[calc(100dvh-7rem)] w-[min(calc(100vw-2rem),400px)] flex-col gap-3 overflow-y-auto p-4">
            <AnimeClueImage question={current} />

            <div>
              <div className="text-sm font-bold text-cyan-100/70">动漫线索</div>
              <h2 className="mt-1 text-2xl font-black text-pink-100">
                {current.animeTitle}
              </h2>
              <div className="mt-1 text-sm text-pink-50/60">
                {current.year} · {current.location}
              </div>
            </div>

            <div className="rounded-xl border border-pink-300/20 bg-pink-300/10 px-3 py-2 text-sm leading-6 text-pink-50">
              {current.description}
            </div>

            {current.aspect && (
              <div className="text-sm leading-6 text-pink-50/70">
                场景：{current.aspect}
              </div>
            )}

            {loadMessage && (
              <div className="rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs leading-5 text-cyan-50">
                {loadMessage}
              </div>
            )}
          </aside>
        )}

        {roundResult && (
          <aside className="absolute top-[42%] right-0 bottom-0 left-0 z-30 flex flex-col gap-4 overflow-y-auto border-t border-white/10 bg-slate-950/95 p-5 backdrop-blur lg:top-0 lg:left-auto lg:w-[400px] lg:border-t-0 lg:border-l">
            <div>
              <div className="text-sm font-bold text-cyan-100/70">答案</div>
              <h2 className="mt-1 text-2xl font-black text-pink-100">
                {roundResult.question.answerName}
              </h2>
              <p className="mt-1 text-sm text-pink-50/60">
                {roundResult.question.animeTitle} ·{" "}
                {roundResult.question.location}
              </p>
              {roundResult.question.episodeContext && (
                <p className="mt-2 text-sm text-pink-50/50">
                  {roundResult.question.episodeContext}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-5 text-center">
              <div className="text-sm text-cyan-100/70">本轮得分</div>
              <div className="text-6xl font-extrabold text-white">
                {roundResult.score.toLocaleString()}
              </div>
              <div className="text-sm text-pink-50/50">
                / {LOCATION_ROUND_SCORE_MAX}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                <div className="text-xs text-pink-50/50">距离分</div>
                <div className="mt-1 font-bold text-white">
                  {roundResult.distancePts}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                <div className="text-xs text-pink-50/50">速度补偿</div>
                <div className="mt-1 font-bold text-white">
                  +{roundResult.speedCompensationPts}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                <div className="text-xs text-pink-50/50">用时</div>
                <div className="mt-1 font-bold text-white">
                  {formatElapsed(roundResult.elapsedSeconds)}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-sm leading-6 text-pink-50/70">
              你的猜测距离实际地点{" "}
              <span className="font-bold text-white">
                {formatDistance(roundResult.distanceKm)}
              </span>
              。
              {roundResult.question.funfact.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-pink-50/60">
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
                className="text-sm font-bold text-cyan-100 underline-offset-4 hover:underline"
              >
                查看 Anitabi 来源
              </a>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="anime-button mt-auto"
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
            className={`flex h-full min-h-0 flex-col overflow-hidden bg-slate-950 shadow-lg shadow-black/40 ${
              roundResult
                ? "border-b border-white/10 lg:border-r lg:border-b-0"
                : "rounded-xl border border-white/15"
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
                restrictToCountry={false}
                onGuess={setGuess}
              />
            </div>

            {!roundResult && (
              <div className="hidden border-t border-white/10 bg-slate-950/95 p-2 transition group-focus-within:block group-hover:block">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!guess}
                  className="anime-button w-full text-sm disabled:cursor-not-allowed disabled:opacity-40"
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
