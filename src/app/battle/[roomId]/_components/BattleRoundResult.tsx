"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { type BattleRoundResult, type BattlePlayer } from "~/types/battle";
import { formatAnswerYear, formatYear } from "~/lib/scoring";
import {
  mountResultMap,
  type ChinaResultLine,
  type ChinaResultMapHandle,
  type ChinaResultMarker,
} from "~/lib/china-leaflet";
import {
  getBattleAnswerPoint,
  getBattleQuestionSubtitle,
  getBattleQuestionTitle,
  isAnimeTuxunBattleQuestion,
  isForeignBattleQuestion,
  isLocationOnlyBattleQuestion,
  isStandardBattleQuestion,
} from "~/lib/battle-question";
import {
  getQuestionYearEnd,
  isFunfactQuestion,
  isHistoricalQuestion,
} from "~/types/question";
import { type GameModeSlug } from "~/lib/game-mode";
import { FunfactPanel } from "~/app/game/_components/FunfactPanel";
import { BaiduGuessMap } from "~/app/game/_components/BaiduGuessMap";
import { GoogleGuessMap } from "~/app/game/foreign/_components/GoogleGuessMap";
import { DEFAULT_FOREIGN_COUNTRY } from "~/lib/foreign-map";

interface Props {
  result: BattleRoundResult;
  players: Record<string, BattlePlayer>;
  myId: string;
  questionType: GameModeSlug;
  roundReady: Record<string, boolean>;
  isLastRound: boolean;
  onReady: () => void;
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} 米`;
  return `${Math.round(distanceKm).toLocaleString()} 公里`;
}

export function BattleRoundResultView({
  result,
  players,
  myId,
  questionType,
  roundReady,
  isLastRound,
  onReady,
}: Props) {
  const mapRef = useRef<ChinaResultMapHandle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { question } = result;
  const standardQuestion = isStandardBattleQuestion(question) ? question : null;
  const historicalQuestion =
    standardQuestion && isHistoricalQuestion(standardQuestion)
      ? standardQuestion
      : null;
  const locationOnlyAnswer = isLocationOnlyBattleQuestion(question)
    ? getBattleAnswerPoint(question)
    : null;
  const myGuess = result.guesses[myId];
  const locationOnlyGuess =
    myGuess?.submitted && locationOnlyAnswer
      ? { lat: myGuess.lat, lng: myGuess.lng }
      : null;
  const showMap = questionType === "historical" && historicalQuestion !== null;
  const showLocationOnlyMap = locationOnlyAnswer !== null;
  const showForeignMap =
    isForeignBattleQuestion(question) || isAnimeTuxunBattleQuestion(question);
  const yearEnd = standardQuestion
    ? getQuestionYearEnd(standardQuestion)
    : undefined;
  const playerIds = Object.keys(players);
  const iAmReady = roundReady[myId] === true;
  const allReady =
    playerIds.length >= 2 && playerIds.every((id) => roundReady[id] === true);

  useEffect(() => {
    if (!showMap || !historicalQuestion || !containerRef.current) return;

    const container = containerRef.current;
    let active = true;

    const guessEntries = Object.entries(result.guesses);
    const markers: ChinaResultMarker[] = [
      {
        point: { lat: historicalQuestion.lat, lng: historicalQuestion.lng },
        color: "#22c55e",
        label: "实际地点",
        radius: 12,
      },
    ];
    const lines: ChinaResultLine[] = [];
    const colors = ["#f59e0b", "#a78bfa"];

    guessEntries.forEach(([pid, guess], index) => {
      const color = colors[index % colors.length]!;
      markers.push({
        point: { lat: guess.lat, lng: guess.lng },
        color,
        label: players[pid]?.name ?? pid,
        radius: 10,
      });
      lines.push({
        from: { lat: guess.lat, lng: guess.lng },
        to: { lat: historicalQuestion.lat, lng: historicalQuestion.lng },
        color,
      });
    });

    void mountResultMap(
      container,
      markers,
      lines,
      () => active && containerRef.current === container,
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
  }, [showMap, result.roundIndex, historicalQuestion, players, result.guesses]);

  function renderScoreBreakdown(guess: (typeof result.guesses)[string]) {
    if (standardQuestion && isFunfactQuestion(standardQuestion)) {
      return (
        <div className="mt-3 rounded-lg bg-stone-950/30 px-3 py-2 text-xs text-stone-400">
          <div className="flex justify-between gap-2">
            <span>答题分</span>
            <span className="font-bold text-white">
              {guess.quizPts.toLocaleString()}
            </span>
          </div>
          <div className="mt-1">{guess.isCorrect ? "答对" : "答错"}</div>
        </div>
      );
    }
    if (isLocationOnlyBattleQuestion(question)) {
      if (!guess.submitted) {
        return (
          <div className="mt-3 rounded-lg bg-stone-950/30 px-3 py-2 text-xs text-stone-400">
            本轮未提交答案
          </div>
        );
      }

      return (
        <div className="mt-3 space-y-2 rounded-lg bg-stone-950/30 px-3 py-2 text-xs text-stone-400">
          <div className="flex justify-between gap-2">
            <span>距离分</span>
            <span className="font-bold text-white">
              {guess.locationPts.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span>速度补偿</span>
            <span className="font-bold text-white">
              +{(guess.speedCompensationPts ?? 0).toLocaleString()}
            </span>
          </div>
          <div>
            偏差 {formatDistance(guess.distanceKm)}
            {guess.elapsedSeconds != null && (
              <span className="ml-2">
                用时 {Math.round(guess.elapsedSeconds)} 秒
              </span>
            )}
          </div>
        </div>
      );
    }
    if (showMap) {
      return (
        <div className="mt-3 space-y-2 rounded-lg bg-stone-950/30 px-3 py-2 text-xs text-stone-400">
          <div className="flex justify-between gap-2">
            <span>地点分</span>
            <span className="font-bold text-white">
              {guess.locationPts.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span>年份分</span>
            <span className="font-bold text-white">
              {guess.yearPts.toLocaleString()}
            </span>
          </div>
          <div>
            选择年份：{formatYear(guess.year)}
            {guess.speedMultiplier > 1.01 && (
              <span className="ml-2 font-bold text-amber-400">
                ⚡×{guess.speedMultiplier.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="mt-3 rounded-lg bg-stone-950/30 px-3 py-2 text-xs text-stone-400">
        <div className="flex justify-between gap-2">
          <span>年份分</span>
          <span className="font-bold text-white">
            {guess.yearPts.toLocaleString()}
          </span>
        </div>
        <div className="mt-1">
          选择年份：{formatYear(guess.year)}
          {guess.speedMultiplier > 1.01 && (
            <span className="ml-2 font-bold text-amber-400">
              ⚡×{guess.speedMultiplier.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <h1 className="font-bold text-red-400">⚔️ 对战</h1>
        <span className="text-stone-400">
          第 {result.roundIndex + 1} 轮结果
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {showMap && (
          <div
            ref={containerRef}
            className="w-full border-b border-stone-700"
            style={{ height: "min(42vh, 420px)", minHeight: 320 }}
          />
        )}
        {showLocationOnlyMap && (
          <div
            className="w-full border-b border-stone-700"
            style={{ height: "min(42vh, 420px)", minHeight: 320 }}
          >
            {showForeignMap ? (
              <GoogleGuessMap
                country={DEFAULT_FOREIGN_COUNTRY}
                guess={locationOnlyGuess}
                answer={locationOnlyAnswer}
                answerLabel={locationOnlyAnswer.label}
                distanceKm={myGuess?.submitted ? myGuess.distanceKm : undefined}
                disabled
                minHeightClass="min-h-0"
                onGuess={() => undefined}
              />
            ) : (
              <BaiduGuessMap
                guess={locationOnlyGuess}
                answer={locationOnlyAnswer}
                answerLabel={locationOnlyAnswer.label}
                distanceKm={myGuess?.submitted ? myGuess.distanceKm : undefined}
                disabled
                minHeightClass="min-h-0"
                onGuess={() => undefined}
              />
            )}
          </div>
        )}

        <div className="mx-auto max-w-5xl px-5 py-4">
          <h2 className="mb-1 text-xl font-bold text-amber-400">
            {getBattleQuestionTitle(question)}
          </h2>
          <p className="mb-5 text-sm text-stone-400">
            {getBattleQuestionSubtitle(question)}
            {standardQuestion &&
              !isFunfactQuestion(standardQuestion) &&
              standardQuestion.year !== 0 && (
                <> · 实际 {formatAnswerYear(standardQuestion.year, yearEnd)}</>
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
                  <div className="text-xs text-stone-500">本轮总分</div>
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

          {standardQuestion &&
            isFunfactQuestion(standardQuestion) &&
            standardQuestion.explanation && (
              <p className="mb-4 rounded-lg bg-stone-800 px-4 py-3 text-sm text-stone-300">
                {standardQuestion.explanation}
              </p>
            )}

          {standardQuestion &&
            (standardQuestion.type === "historical" ||
              standardQuestion.type === "funfact") &&
            standardQuestion.funfact &&
            standardQuestion.funfact.length > 0 && (
              <FunfactPanel funfacts={standardQuestion.funfact} />
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

          <div className="mb-4 flex flex-wrap justify-center gap-3">
            {playerIds.map((pid) => (
              <span
                key={pid}
                className={`rounded-full px-3 py-1 text-xs ${
                  roundReady[pid]
                    ? "bg-green-900/40 text-green-300"
                    : "bg-stone-800 text-stone-400"
                }`}
              >
                {players[pid]?.name}
                {roundReady[pid] ? " ✓ 已准备" : " · 未准备"}
              </span>
            ))}
          </div>

          <button
            onClick={onReady}
            disabled={iAmReady || allReady}
            className={`w-full rounded-xl py-3 font-bold transition ${
              iAmReady
                ? "cursor-default bg-green-800 text-green-200"
                : "bg-red-500 text-white hover:bg-red-400"
            }`}
          >
            {iAmReady
              ? "✓ 已准备，等待对手…"
              : isLastRound
                ? "准备 · 查看最终结果"
                : "准备 · 下一轮"}
          </button>

          {allReady && (
            <p className="mt-3 text-center text-sm text-amber-300">
              双方已准备，即将继续…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
