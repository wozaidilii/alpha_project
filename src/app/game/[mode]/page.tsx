"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { pickQuestions } from "~/data/questions";
import { getGameMode } from "~/lib/game-mode";
import { toHistoricalQuestions } from "~/lib/event-adapters";
import { type HistoricalEvent } from "~/types/event";
import { getTimelineBounds } from "~/lib/question-utils";
import { scoreRound } from "~/lib/scoring";
import {
  type GameQuestion,
  requiresMap,
  getQuestionYearEnd,
  type QuestionType,
} from "~/types/question";
import { type RoundData } from "~/types/game";
import { api } from "~/trpc/react";
import { GameMap } from "../_components/GameMap";
import { TimelineSlider } from "../_components/TimelineSlider";
import { EventCard } from "../_components/EventCard";
import { RoundResult } from "../_components/RoundResult";
import { FinalScore } from "../_components/FinalScore";

const ROUNDS = 5;

type Phase = "playing" | "round-result" | "final";

interface PageProps {
  params: Promise<{ mode: string }>;
}

export default function GamePlayPage({ params }: PageProps) {
  const { mode: modeSlug } = use(params);
  const gameMode = getGameMode(modeSlug);

  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loadError, setLoadError] = useState("");

  const [guessLat, setGuessLat] = useState<number | null>(null);
  const [guessLng, setGuessLng] = useState<number | null>(null);
  const [guessYear, setGuessYear] = useState<number>(1900);

  const questionType = gameMode?.type;
  const isHistorical = questionType === "historical";

  const eventsQuery = api.event.random.useQuery(
    { count: ROUNDS },
    {
      enabled: isHistorical,
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
      loadStaticQuestions(type);
    },
    [applyHistoricalEvents, eventsQuery, loadStaticQuestions],
  );

  useEffect(() => {
    if (!questionType) return;
    if (isHistorical) {
      if (eventsQuery.data) applyHistoricalEvents(eventsQuery.data);
      return;
    }
    loadStaticQuestions(questionType);
  }, [
    questionType,
    isHistorical,
    eventsQuery.data,
    applyHistoricalEvents,
    loadStaticQuestions,
  ]);

  const currentQuestion = questions[round];
  const needsMap = currentQuestion ? requiresMap(currentQuestion) : false;
  const timelineBounds = currentQuestion
    ? getTimelineBounds(currentQuestion)
    : { minYear: -3000, maxYear: 2026, defaultYear: 1900 };

  useEffect(() => {
    if (currentQuestion) {
      setGuessYear(timelineBounds.defaultYear);
      setGuessLat(null);
      setGuessLng(null);
    }
  }, [currentQuestion?.id, timelineBounds.defaultYear]);

  if (!gameMode) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-stone-900 text-white">
        <p className="text-stone-400">未知的游戏类型</p>
        <Link href="/game" className="text-amber-400 hover:underline">
          返回选择页面
        </Link>
      </div>
    );
  }

  const mode = gameMode;

  function handleSubmit() {
    if (!currentQuestion) return;
    if (needsMap && (guessLat === null || guessLng === null)) return;

    const score = scoreRound({
      questionType: currentQuestion.type,
      actualYear: currentQuestion.year,
      guessedYear: guessYear,
      yearEnd: getQuestionYearEnd(currentQuestion),
      actualLat:
        currentQuestion.type === "historical" ? currentQuestion.lat : undefined,
      actualLng:
        currentQuestion.type === "historical" ? currentQuestion.lng : undefined,
      guessLat: guessLat ?? undefined,
      guessLng: guessLng ?? undefined,
    });

    const data: RoundData = {
      question: currentQuestion,
      guessLat,
      guessLng,
      guessYear,
      distanceKm: score.distanceKm,
      locationPts: score.locationPts,
      yearPts: score.yearPts,
      total: score.total,
    };

    setRounds((prev) => [...prev, data]);
    setPhase("round-result");
  }

  function handleNextRound() {
    if (round + 1 >= ROUNDS) {
      setPhase("final");
    } else {
      setRound((r) => r + 1);
      setPhase("playing");
    }
  }

  function handleRestart() {
    setRound(0);
    setPhase("playing");
    setRounds([]);
    void loadQuestions(mode.type);
  }

  const canSubmit = needsMap ? guessLat !== null : true;
  const isLoading =
    phase === "playing" &&
    questions.length === 0 &&
    (isHistorical ? eventsQuery.isLoading : false);

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
              : "题库为空，请先导入题目")}
        </p>
        <Link href="/game" className="text-amber-400 hover:underline">
          返回选择页面
        </Link>
      </div>
    );
  }

  if (phase === "final") {
    return (
      <FinalScore
        rounds={rounds}
        gameMode={mode}
        onRestart={handleRestart}
      />
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

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className={`text-xl font-bold tracking-wide ${mode.accentClass}`}>
            {mode.emoji} {mode.title}
          </h1>
          <Link
            href="/game"
            className="text-xs text-stone-500 transition hover:text-stone-300"
          >
            换类型
          </Link>
        </div>
        <span className="text-stone-400">
          第 {round + 1} / {ROUNDS} 轮
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`flex flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-stone-700 p-4 ${
            needsMap ? "w-96" : "mx-auto w-full max-w-2xl"
          }`}
        >
          {currentQuestion && <EventCard question={currentQuestion} />}

          <TimelineSlider
            value={guessYear}
            onChange={setGuessYear}
            minYear={timelineBounds.minYear}
            maxYear={timelineBounds.maxYear}
          />

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-2 w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-stone-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {needsMap && guessLat === null
              ? "先在地图上点击选择地点"
              : needsMap
                ? "提交猜测"
                : "提交年份猜测"}
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
