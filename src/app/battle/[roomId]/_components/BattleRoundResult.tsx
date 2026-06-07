"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { type BattleRoundResult, type BattlePlayer } from "~/types/battle";
import {
  formatAnswerYear,
  formatYear,
} from "~/lib/scoring";
import {
  getQuestionResultSubtitle,
} from "~/lib/question-utils";
import {
  getQuestionYearEnd,
  isFunfactQuestion,
  isHistoricalQuestion,
} from "~/types/question";
import {
  mountResultMap,
  type ChinaResultLine,
  type ChinaResultMapHandle,
  type ChinaResultMarker,
} from "~/lib/china-leaflet";
import { FunfactPanel } from "~/app/game/_components/FunfactPanel";

interface Props {
  result: BattleRoundResult;
  players: Record<string, BattlePlayer>;
  myId: string;
  isLastRound: boolean;
  isHost: boolean;
  onNext: () => void;
  onViewResults: () => void;
}

export function BattleRoundResultView({
  result,
  players,
  myId,
  isLastRound,
  isHost,
  onNext,
  onViewResults,
}: Props) {
  const [mapSlot, setMapSlot] = useState(0);
  const mapRef = useRef<ChinaResultMapHandle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { question } = result;
  const showMap = result.question.type === "historical";
  const yearEnd = getQuestionYearEnd(question);

  useEffect(() => {
    if (!showMap || !isHistoricalQuestion(question) || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    let active = true;

    const actual = { lat: question.lat, lng: question.lng };
    const markers: ChinaResultMarker[] = [
      {
        point: actual,
        color: "#22c55e",
        label: "实际地点",
        radius: 12,
      },
    ];
    const lines: ChinaResultLine[] = [];
    const colors = ["#f59e0b", "#a78bfa"];
    let colorIdx = 0;

    for (const [pid, guess] of Object.entries(result.guesses)) {
      const player = players[pid];
      const color = colors[colorIdx++ % colors.length]!;
      const guessPoint = { lat: guess.lat, lng: guess.lng };

      markers.push({
        point: guessPoint,
        color,
        label: player?.name ?? pid,
        radius: 10,
      });
      lines.push({ from: guessPoint, to: actual, color });
    }

    void mountResultMap(container, markers, lines, () => active).then(
      (handle) => {
        if (!active) {
          handle.destroy();
          return;
        }
        mapRef.current = handle;
      },
    );

    return () => {
      active = false;
      mapRef.current?.destroy();
      mapRef.current = null;
      setMapSlot((slot) => slot + 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap, mapSlot]);

  const playerIds = Object.keys(players);

  function renderScoreBreakdown(guess: (typeof result.guesses)[string]) {
    if (isFunfactQuestion(question)) {
      return (
        <div className="mt-1 text-xs text-stone-400">
          {guess.isCorrect ? "✓ 答对" : "✗ 答错"} · 冷知识分{" "}
          {guess.quizPts.toLocaleString()}
        </div>
      );
    }
    if (showMap) {
      return (
        <>
          <div className="mt-1 text-xs text-stone-400">
            📍 {guess.locationPts.toLocaleString()} + 📅{" "}
            {guess.yearPts.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-stone-400">
            年份：{formatYear(guess.year)}
            {guess.speedMultiplier > 1.01 && (
              <span className="ml-2 font-bold text-amber-400">
                ⚡×{guess.speedMultiplier.toFixed(2)}
              </span>
            )}
          </div>
        </>
      );
    }
    return (
      <div className="mt-1 text-xs text-stone-400">
        年份：{formatYear(guess.year)} · 年份分{" "}
        {guess.yearPts.toLocaleString()}
        {guess.speedMultiplier > 1.01 && (
          <span className="ml-2 font-bold text-amber-400">
            ⚡×{guess.speedMultiplier.toFixed(2)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <h1 className="font-bold text-red-400">⚔️ 对战</h1>
        <span className="text-stone-400">第 {result.roundIndex + 1} 轮结果</span>
      </div>

      <div className="flex-1 overflow-auto">
        {showMap && (
          <div
            key={mapSlot}
            ref={containerRef}
            className="w-full border-b border-stone-700"
            style={{ height: 300 }}
          />
        )}

        <div className="mx-auto max-w-2xl px-5 py-5">
          <h2 className="mb-1 text-xl font-bold text-amber-400">
            {question.title}
          </h2>
          <p className="mb-5 text-sm text-stone-400">
            {getQuestionResultSubtitle(question)}
            {!isFunfactQuestion(question) && question.year !== 0 && (
              <> · 实际 {formatAnswerYear(question.year, yearEnd)}</>
            )}
          </p>

          <div className="mb-5 grid grid-cols-2 gap-3">
            {playerIds.map((pid) => {
              const player = players[pid]!;
              const guess = result.guesses[pid];
              const dmg = result.damage[pid] ?? 0;
              const hpAfter = result.hpAfter[pid] ?? 0;
              const isMe = pid === myId;

              return (
                <div
                  key={pid}
                  className={`rounded-xl p-4 ${isMe ? "bg-amber-900/30 ring-1 ring-amber-500" : "bg-stone-800"}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-semibold">{player.name}</span>
                    {isMe && (
                      <span className="text-xs text-amber-400">(你)</span>
                    )}
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {guess?.total.toLocaleString() ?? 0}
                  </div>
                  {guess && renderScoreBreakdown(guess)}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-700">
                      <div
                        className={`h-full rounded-full transition-all ${hpAfter > 50 ? "bg-green-500" : hpAfter > 20 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${hpAfter}%` }}
                      />
                    </div>
                    <span className="text-xs text-white">{hpAfter} HP</span>
                    {dmg > 0 && (
                      <span className="text-xs font-bold text-red-400">
                        -{dmg}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isFunfactQuestion(question) && question.explanation && (
            <p className="mb-4 rounded-lg bg-stone-800 px-4 py-3 text-sm text-stone-300">
              {question.explanation}
            </p>
          )}

          {(question.type === "historical" || question.type === "funfact") &&
            question.funfact &&
            question.funfact.length > 0 && (
              <FunfactPanel funfacts={question.funfact} />
            )}

          {(() => {
            const [a, b] = playerIds;
            if (!a || !b) return null;
            const scoreA = result.guesses[a]?.total ?? 0;
            const scoreB = result.guesses[b]?.total ?? 0;
            const diff = Math.abs(scoreA - scoreB);
            const loser = scoreA < scoreB ? a : scoreB < scoreA ? b : null;
            if (!loser) {
              return (
                <p className="mb-4 text-center text-sm text-stone-400">
                  本轮平局，无扣血
                </p>
              );
            }
            return (
              <p className="mb-4 text-center text-sm text-stone-400">
                分差 <span className="text-white">{diff.toLocaleString()}</span>
                ，
                <span className="font-semibold text-red-400">
                  {players[loser]?.name}
                </span>{" "}
                损失{" "}
                <span className="font-bold text-red-400">
                  {result.damage[loser] ?? 0} HP
                </span>
              </p>
            );
          })()}

          {isHost && !isLastRound && (
            <button
              onClick={onNext}
              className="w-full rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-400"
            >
              下一轮 →
            </button>
          )}
          {isHost && isLastRound && (
            <button
              onClick={onViewResults}
              className="w-full rounded-xl bg-amber-500 py-3 font-bold text-stone-900 transition hover:bg-amber-400"
            >
              查看最终结果 🏆
            </button>
          )}
          {!isHost && (
            <p className="text-center text-stone-400">
              {isLastRound ? "等待房主查看最终结果…" : "等待房主进入下一轮…"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
