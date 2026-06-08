"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { type RoundData } from "~/types/game";
import {
  requiresMap,
  requiresQuizAnswer,
  isFunfactQuestion,
  isHistoricalQuestion,
  getQuestionYearEnd,
} from "~/types/question";
import { type GameModeConfig } from "~/lib/game-mode";
import { getQuestionResultSubtitle } from "~/lib/question-utils";
import { formatYear, formatAnswerYear } from "~/lib/scoring";
import { mountResultMap, type ChinaResultMapHandle } from "~/lib/china-leaflet";
import { FunfactPanel } from "./FunfactPanel";

interface Props {
  data: RoundData;
  roundNumber: number;
  totalRounds: number;
  gameMode: GameModeConfig;
  onNext: () => void;
}

export function RoundResult({
  data,
  roundNumber,
  totalRounds,
  gameMode,
  onNext,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ChinaResultMapHandle | null>(null);
  const isLastRound = roundNumber >= totalRounds;
  const isQuiz = requiresQuizAnswer(data.question);
  const historicalQuestion = isHistoricalQuestion(data.question)
    ? data.question
    : null;
  const showMap =
    requiresMap(data.question) &&
    data.guessLat !== null &&
    data.guessLng !== null &&
    historicalQuestion !== null;
  const yearEnd = getQuestionYearEnd(data.question);
  const funfactQuestion = isFunfactQuestion(data.question)
    ? data.question
    : null;

  useEffect(() => {
    if (
      !showMap ||
      !historicalQuestion ||
      !containerRef.current ||
      mapRef.current
    )
      return;

    const container = containerRef.current;
    let active = true;

    void mountResultMap(
      container,
      [
        {
          point: { lat: historicalQuestion.lat, lng: historicalQuestion.lng },
          color: "#22c55e",
          label: "实际地点",
          radius: 12,
        },
        {
          point: { lat: data.guessLat!, lng: data.guessLng! },
          color: "#f59e0b",
          label: "你的猜测",
          radius: 10,
        },
      ],
      [
        {
          from: { lat: historicalQuestion.lat, lng: historicalQuestion.lng },
          to: { lat: data.guessLat!, lng: data.guessLng! },
          color: "#f59e0b",
        },
      ],
      () => active,
    ).then((handle) => {
      if (!active) {
        handle.destroy();
        return;
      }
      mapRef.current = handle;
    });

    return () => {
      active = false;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap, historicalQuestion]);

  const actualYearLabel = formatAnswerYear(data.question.year, yearEnd);

  function formatGuessAnswer(): string {
    if (!funfactQuestion || data.guessIndex === null) return "未作答";
    return funfactQuestion.options[data.guessIndex] ?? "未作答";
  }

  function formatCorrectAnswer(): string {
    if (!funfactQuestion) return "";
    return funfactQuestion.options[funfactQuestion.correctIndex] ?? "";
  }

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <h1
          className={`text-xl font-bold tracking-wide ${gameMode.accentClass}`}
        >
          {gameMode.emoji} {gameMode.title}
        </h1>
        <span className="text-stone-400">
          第 {roundNumber} / {totalRounds} 轮结果
        </span>
        <Link
          href="/"
          className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-300 transition hover:bg-stone-700"
        >
          退出
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-auto">
        {showMap && (
          <div
            ref={containerRef}
            className="w-full border-b border-stone-700"
            style={{ height: 360 }}
          />
        )}

        <div className="mx-auto w-full max-w-2xl px-6 py-6">
          <h2 className="mb-1 text-2xl font-bold text-amber-400">
            {data.question.title}
          </h2>
          <p className="mb-6 text-sm text-stone-400">
            {getQuestionResultSubtitle(data.question)}
          </p>
          {data.timedOut && (
            <p className="mb-4 rounded-lg bg-red-950/40 px-4 py-2 text-sm text-red-300">
              本轮超时，已按当前选择自动结算
            </p>
          )}

          {isQuiz && funfactQuestion && (
            <div className="mb-4 rounded-xl bg-stone-800 p-4">
              <p className="mb-3 text-sm leading-relaxed text-stone-300">
                {funfactQuestion.stem}
              </p>
              <div
                className={`mb-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                  data.isCorrect
                    ? "bg-green-950/60 text-green-300"
                    : "bg-red-950/60 text-red-300"
                }`}
              >
                {data.isCorrect ? "✓ 回答正确" : "✗ 回答错误"}
              </div>
              <div className="space-y-1 text-sm text-stone-400">
                <div>
                  你的答案：
                  <span className="text-amber-400">{formatGuessAnswer()}</span>
                </div>
                <div>
                  正确答案：
                  <span className="text-green-400">
                    {formatCorrectAnswer()}
                  </span>
                </div>
              </div>
              {funfactQuestion.explanation && (
                <p className="mt-3 text-sm leading-relaxed text-stone-300">
                  {funfactQuestion.explanation}
                </p>
              )}
            </div>
          )}

          <div
            className={`grid gap-4 ${showMap ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {showMap && (
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="mb-1 text-sm text-stone-400">📍 地点分</div>
                <div className="text-3xl font-bold text-white">
                  {data.locationPts.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-stone-400">
                  距实际地点{" "}
                  <span className="text-white">
                    {data.distanceKm !== null && data.distanceKm < 1
                      ? `${Math.round(data.distanceKm * 1000)} 米`
                      : `${Math.round(data.distanceKm ?? 0).toLocaleString()} 公里`}
                  </span>
                </div>
              </div>
            )}

            {isQuiz ? (
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="mb-1 text-sm text-stone-400">📚 答题分</div>
                <div className="text-3xl font-bold text-white">
                  {data.quizPts.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-stone-400">
                  {data.isCorrect ? "答对得满分" : "答错不得分"}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-stone-800 p-4">
                <div className="mb-1 text-sm text-stone-400">📅 年份分</div>
                <div className="text-3xl font-bold text-white">
                  {data.yearPts.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-stone-400">
                  你猜{" "}
                  <span className="text-amber-400">
                    {formatYear(data.guessYear)}
                  </span>
                  ，实际{" "}
                  <span className="text-green-400">{actualYearLabel}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-600/20 to-amber-500/10 p-5 text-center">
            <div className="text-sm text-stone-400">本轮总分</div>
            <div className="text-5xl font-extrabold text-amber-400">
              {data.total.toLocaleString()}
            </div>
            <div className="text-sm text-stone-500">/ 10,000</div>
          </div>

          {data.question.type === "historical" && data.question.funfact && (
            <FunfactPanel funfacts={data.question.funfact} />
          )}

          {funfactQuestion?.funfact && funfactQuestion.funfact.length > 0 && (
            <FunfactPanel funfacts={funfactQuestion.funfact} />
          )}

          {showMap && (
            <div className="mt-3 flex justify-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-stone-400">
                <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                实际地点
              </div>
              <div className="flex items-center gap-1.5 text-sm text-stone-400">
                <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
                你的猜测
              </div>
            </div>
          )}

          <button
            onClick={onNext}
            className="mt-6 w-full rounded-xl bg-amber-500 py-3 font-bold text-stone-900 transition hover:bg-amber-400"
          >
            {isLastRound
              ? "查看最终得分 →"
              : `下一轮 (${roundNumber + 1}/${totalRounds}) →`}
          </button>
        </div>
      </div>
    </div>
  );
}
