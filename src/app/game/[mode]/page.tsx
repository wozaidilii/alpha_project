"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { pickQuestions } from "~/data/questions";
import { getGameMode } from "~/lib/game-mode";
import {
  toFunfactQuestions,
  toHistoricalQuestions,
} from "~/lib/event-adapters";
import { type HistoricalEvent } from "~/types/event";
import { getTimelineBounds } from "~/lib/question-utils";
import { scoreRound } from "~/lib/scoring";
import { playCountdownTick } from "~/lib/countdown-audio";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";
import {
  type GameQuestion,
  requiresMap,
  requiresQuizAnswer,
  getQuestionYearEnd,
  isFunfactQuestion,
  type QuestionType,
} from "~/types/question";
import { type RoundData } from "~/types/game";
import { api } from "~/trpc/react";
import { GameMap } from "../_components/GameMap";
import { TimelineSlider } from "../_components/TimelineSlider";
import { EventCard } from "../_components/EventCard";
import { QuizPanel } from "../_components/QuizPanel";
import { RoundResult } from "../_components/RoundResult";
import { FinalScore } from "../_components/FinalScore";
import { DifficultySetup } from "../_components/DifficultySetup";
import { getDifficultyLabel } from "~/lib/difficulty";

const ROUNDS = 5;
const ROUND_TIME_SECONDS = 30;

type Phase = "playing" | "round-result" | "final";

interface PageProps {
  params: Promise<{ mode: string }>;
}

export default function GamePlayPage({ params }: PageProps) {
  const { mode: modeSlug } = use(params);
  const gameMode = getGameMode(modeSlug);
  const { ready: authReady } = useCompletedPlayerSession();

  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loadError, setLoadError] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SECONDS);

  const [guessLat, setGuessLat] = useState<number | null>(null);
  const [guessLng, setGuessLng] = useState<number | null>(null);
  const [guessYear, setGuessYear] = useState<number>(1900);
  const [guessIndex, setGuessIndex] = useState<number | null>(null);
  const currentQuestionRef = useRef<GameQuestion | undefined>(undefined);
  const guessLatRef = useRef<number | null>(null);
  const guessLngRef = useRef<number | null>(null);
  const guessYearRef = useRef<number>(1900);
  const guessIndexRef = useRef<number | null>(null);
  const resolvedRoundRef = useRef(false);
  const lastCountdownTickRef = useRef<number | null>(null);

  const questionType = gameMode?.type;
  const isHistorical = questionType === "historical";
  const isFunfact = questionType === "funfact";
  const needsDifficultySetup = isHistorical || isFunfact;

  const [selectedDifficulty, setSelectedDifficulty] = useState<
    number | undefined
  >(undefined);
  const [gameStarted, setGameStarted] = useState(!needsDifficultySetup);

  const eventsQuery = api.event.random.useQuery(
    { count: ROUNDS, difficulty: selectedDifficulty },
    {
      enabled: authReady && isHistorical && gameStarted,
      refetchOnWindowFocus: false,
    },
  );

  const funfactQuery = api.funfact.random.useQuery(
    { count: ROUNDS, difficulty: selectedDifficulty },
    {
      enabled: authReady && isFunfact && gameStarted,
      refetchOnWindowFocus: false,
    },
  );

  const applyHistoricalEvents = useCallback((events: HistoricalEvent[]) => {
    if (events.length < ROUNDS) {
      setLoadError("题库题目不足，请先导入更多历史题目");
      setQuestions([]);
      return;
    }
    setLoadError("");
    setQuestions(toHistoricalQuestions(events));
  }, []);

  const applyFunfactQuestions = useCallback(
    (records: Parameters<typeof toFunfactQuestions>[0]) => {
      if (records.length < ROUNDS) {
        setLoadError("冷知识题库不足，请先运行导入脚本");
        setQuestions([]);
        return;
      }
      setLoadError("");
      setQuestions(toFunfactQuestions(records));
    },
    [],
  );

  const loadStaticQuestions = useCallback((type: QuestionType) => {
    const picked = pickQuestions({ count: ROUNDS, type });
    if (picked.length < ROUNDS) {
      setLoadError("静态题库题目不足");
      setQuestions([]);
      return;
    }
    setLoadError("");
    setQuestions(picked);
  }, []);

  const loadQuestions = useCallback(
    async (type: QuestionType) => {
      if (type === "historical") {
        const result = await eventsQuery.refetch();
        applyHistoricalEvents(result.data ?? []);
        return;
      }
      if (type === "funfact") {
        const result = await funfactQuery.refetch();
        applyFunfactQuestions(result.data ?? []);
        return;
      }
      loadStaticQuestions(type);
    },
    [
      applyHistoricalEvents,
      applyFunfactQuestions,
      eventsQuery,
      funfactQuery,
      loadStaticQuestions,
    ],
  );

  useEffect(() => {
    if (!authReady || !gameStarted) return;
    if (!questionType) return;
    if (isHistorical) {
      if (eventsQuery.data) applyHistoricalEvents(eventsQuery.data);
      return;
    }
    if (isFunfact) {
      if (funfactQuery.data) applyFunfactQuestions(funfactQuery.data);
      return;
    }
    loadStaticQuestions(questionType);
  }, [
    authReady,
    gameStarted,
    questionType,
    isHistorical,
    isFunfact,
    eventsQuery.data,
    funfactQuery.data,
    applyHistoricalEvents,
    applyFunfactQuestions,
    loadStaticQuestions,
  ]);

  const currentQuestion = questions[round];
  const needsMap = currentQuestion ? requiresMap(currentQuestion) : false;
  const needsQuiz = currentQuestion
    ? requiresQuizAnswer(currentQuestion)
    : false;
  const timelineBounds = currentQuestion
    ? getTimelineBounds(currentQuestion)
    : { minYear: -3000, maxYear: 2026, defaultYear: 1900 };

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    guessLatRef.current = guessLat;
  }, [guessLat]);

  useEffect(() => {
    guessLngRef.current = guessLng;
  }, [guessLng]);

  useEffect(() => {
    guessYearRef.current = guessYear;
  }, [guessYear]);

  useEffect(() => {
    guessIndexRef.current = guessIndex;
  }, [guessIndex]);

  useEffect(() => {
    if (currentQuestion) {
      setGuessYear(timelineBounds.defaultYear);
      guessYearRef.current = timelineBounds.defaultYear;
      setGuessLat(null);
      guessLatRef.current = null;
      setGuessLng(null);
      guessLngRef.current = null;
      setGuessIndex(null);
      guessIndexRef.current = null;
      setTimeLeft(ROUND_TIME_SECONDS);
      resolvedRoundRef.current = false;
      lastCountdownTickRef.current = null;
    }
  }, [currentQuestion, timelineBounds.defaultYear]);

  const settleRound = useCallback((timedOut: boolean) => {
    const question = currentQuestionRef.current;
    if (!question || resolvedRoundRef.current) return;

    const roundNeedsMap = requiresMap(question);
    const roundNeedsQuiz = requiresQuizAnswer(question);
    const currentGuessLat = guessLatRef.current;
    const currentGuessLng = guessLngRef.current;
    const currentGuessYear = guessYearRef.current;
    const currentGuessIndex = guessIndexRef.current;

    if (roundNeedsQuiz && currentGuessIndex === null) {
      if (!timedOut) return;

      resolvedRoundRef.current = true;
      setRounds((prev) => [
        ...prev,
        {
          question,
          guessLat: null,
          guessLng: null,
          guessYear: 0,
          guessIndex: null,
          distanceKm: null,
          locationPts: 0,
          yearPts: 0,
          quizPts: 0,
          total: 0,
          isCorrect: false,
          timedOut: true,
        },
      ]);
      setPhase("round-result");
      return;
    }

    if (
      roundNeedsMap &&
      (currentGuessLat === null || currentGuessLng === null)
    ) {
      if (!timedOut) return;

      resolvedRoundRef.current = true;
      setRounds((prev) => [
        ...prev,
        {
          question,
          guessLat: null,
          guessLng: null,
          guessYear: currentGuessYear,
          guessIndex: null,
          distanceKm: null,
          locationPts: 0,
          yearPts: 0,
          quizPts: 0,
          total: 0,
          timedOut: true,
        },
      ]);
      setPhase("round-result");
      return;
    }

    const score = scoreRound({
      questionType: question.type,
      actualYear: question.year,
      guessedYear: currentGuessYear,
      yearEnd: getQuestionYearEnd(question),
      actualLat: question.type === "historical" ? question.lat : undefined,
      actualLng: question.type === "historical" ? question.lng : undefined,
      guessLat: currentGuessLat ?? undefined,
      guessLng: currentGuessLng ?? undefined,
      correctIndex:
        question.type === "funfact" ? question.correctIndex : undefined,
      guessedIndex: currentGuessIndex ?? undefined,
    });

    const data: RoundData = {
      question,
      guessLat: currentGuessLat,
      guessLng: currentGuessLng,
      guessYear: roundNeedsQuiz ? 0 : currentGuessYear,
      guessIndex: currentGuessIndex,
      distanceKm: score.distanceKm,
      locationPts: score.locationPts,
      yearPts: score.yearPts,
      quizPts: score.quizPts,
      total: score.total,
      isCorrect: score.isCorrect,
      timedOut,
    };

    resolvedRoundRef.current = true;
    setRounds((prev) => [...prev, data]);
    setPhase("round-result");
  }, []);

  useEffect(() => {
    if (phase !== "playing" || !currentQuestion) return;

    const startedAt = Date.now();
    setTimeLeft(ROUND_TIME_SECONDS);

    const timerId = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const nextTimeLeft = Math.max(0, ROUND_TIME_SECONDS - elapsedSeconds);

      setTimeLeft(nextTimeLeft);

      if (nextTimeLeft <= 0) {
        window.clearInterval(timerId);
        settleRound(true);
      }
    }, 250);

    return () => window.clearInterval(timerId);
  }, [phase, round, currentQuestion, settleRound]);

  useEffect(() => {
    if (phase !== "playing" || timeLeft <= 0 || timeLeft > 10) return;
    if (lastCountdownTickRef.current === timeLeft) return;

    lastCountdownTickRef.current = timeLeft;
    playCountdownTick(timeLeft);
  }, [phase, timeLeft]);

  function handleSubmit() {
    settleRound(false);
  }

  function handleNextRound() {
    if (round + 1 >= ROUNDS) {
      setPhase("final");
    } else {
      setRound((r) => r + 1);
      setTimeLeft(ROUND_TIME_SECONDS);
      setPhase("playing");
    }
  }

  function handleRestart() {
    if (!gameMode) return;

    setRound(0);
    setPhase("playing");
    setRounds([]);
    setTimeLeft(ROUND_TIME_SECONDS);
    resolvedRoundRef.current = false;
    lastCountdownTickRef.current = null;
    void loadQuestions(gameMode.type);
  }

  function handleStartGame() {
    setGameStarted(true);
    setRound(0);
    setPhase("playing");
    setRounds([]);
    setQuestions([]);
    setLoadError("");
    setTimeLeft(ROUND_TIME_SECONDS);
    resolvedRoundRef.current = false;
    lastCountdownTickRef.current = null;
  }

  const canSubmit = needsQuiz
    ? guessIndex !== null
    : needsMap
      ? guessLat !== null
      : true;
  const isLoading =
    phase === "playing" &&
    questions.length === 0 &&
    (isHistorical
      ? eventsQuery.isLoading
      : isFunfact
        ? funfactQuery.isLoading
        : false);

  if (!authReady) return <AuthLoading />;

  if (!gameMode || gameMode.enabled === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 text-white">
        <p className="text-stone-400">未知的游戏类型</p>
        <Link href="/game/solo" className="text-amber-400 hover:underline">
          返回个人模式
        </Link>
      </div>
    );
  }

  if (needsDifficultySetup && !gameStarted) {
    return (
      <DifficultySetup
        gameMode={gameMode}
        selectedDifficulty={selectedDifficulty}
        onSelectDifficulty={setSelectedDifficulty}
        onStart={handleStartGame}
      />
    );
  }

  const mode = gameMode;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-900 text-white">
        加载中...
      </div>
    );
  }

  if (!currentQuestion && phase === "playing") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 text-white">
        <p className="text-stone-400">
          {loadError ||
            (isHistorical && eventsQuery.isError
              ? "题库加载失败，请检查数据库连接"
              : isFunfact && funfactQuery.isError
                ? "冷知识题库加载失败，请检查数据库连接"
                : "题库为空，请先导入题目")}
        </p>
        <Link href="/game/solo" className="text-amber-400 hover:underline">
          返回个人模式
        </Link>
      </div>
    );
  }

  if (phase === "final") {
    return (
      <FinalScore rounds={rounds} gameMode={mode} onRestart={handleRestart} />
    );
  }

  if (phase === "round-result" && rounds.length > 0) {
    const last = rounds[rounds.length - 1]!;
    return (
      <RoundResult
        data={last}
        roundNumber={round + 1}
        totalRounds={ROUNDS}
        gameMode={mode}
        onNext={handleNextRound}
      />
    );
  }

  const submitLabel = needsQuiz
    ? guessIndex === null
      ? "请先选择答案"
      : "提交答案"
    : needsMap && guessLat === null
      ? "先在地图上点击选择地点"
      : needsMap
        ? "提交猜测"
        : "提交年份猜测";

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className={`text-xl font-bold tracking-wide ${mode.accentClass}`}>
            {mode.emoji} {mode.title}
          </h1>
          <Link
            href="/game/solo"
            className="text-xs text-stone-500 transition hover:text-stone-300"
          >
            换类型
          </Link>
          <Link
            href="/game/solo"
            className="text-xs text-stone-500 transition hover:text-stone-300"
          >
            返回个人模式
          </Link>
        </div>
        <div className="flex items-center gap-4 text-stone-400">
          {needsDifficultySetup && (
            <span className="text-xs text-stone-500">
              {getDifficultyLabel(selectedDifficulty)}
            </span>
          )}
          <span>
            第 {round + 1} / {ROUNDS} 轮
          </span>
        </div>
      </div>
      <div className="h-1 bg-stone-800">
        <div
          className={`h-full transition-[width] duration-300 ${
            timeLeft <= 10 ? "bg-red-500" : "bg-amber-500"
          }`}
          style={{ width: `${(timeLeft / ROUND_TIME_SECONDS) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`flex flex-shrink-0 flex-col gap-3 overflow-y-auto border-r border-stone-700 p-3 ${
            needsMap ? "w-80" : "mx-auto w-full max-w-2xl"
          }`}
        >
          {currentQuestion && (
            <EventCard key={currentQuestion.id} question={currentQuestion} />
          )}

          {currentQuestion && isFunfactQuestion(currentQuestion) && (
            <QuizPanel
              question={currentQuestion}
              selectedIndex={guessIndex}
              onSelect={setGuessIndex}
            />
          )}

          <div
            className={`rounded-lg border px-3 py-2 ${
              timeLeft <= 10
                ? "border-red-500/50 bg-red-950/30"
                : "border-stone-700 bg-stone-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-400">倒计时</span>
              <span
                className={`text-2xl font-bold ${
                  timeLeft <= 10 ? "text-red-300" : "text-amber-300"
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>

          {!needsQuiz && (
            <TimelineSlider
              value={guessYear}
              onChange={setGuessYear}
              minYear={timelineBounds.minYear}
              maxYear={timelineBounds.maxYear}
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-2 w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-stone-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>

        {needsMap && (
          <div className="flex-1">
            <GameMap
              guessLat={guessLat}
              guessLng={guessLng}
              onGuess={(lat, lng) => {
                setGuessLat(lat);
                setGuessLng(lng);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
