"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { type BattleRoundResult, type BattlePlayer } from "~/types/battle";
import { formatAnswerYear, formatYear } from "~/lib/scoring";
import { getQuestionResultSubtitle } from "~/lib/question-utils";
import {
  getQuestionYearEnd,
  isFunfactQuestion,
  isHistoricalQuestion,
  type QuestionType,
} from "~/types/question";
import { FunfactPanel } from "~/app/game/_components/FunfactPanel";

interface Props {
  result: BattleRoundResult;
  players: Record<string, BattlePlayer>;
  myId: string;
  questionType: QuestionType;
  roundReady: Record<string, boolean>;
  isLastRound: boolean;
  onReady: () => void;
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
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { question } = result;
  const showMap =
    questionType === "historical" && isHistoricalQuestion(question);
  const yearEnd = getQuestionYearEnd(question);
  const playerIds = Object.keys(players);
  const iAmReady = roundReady[myId] === true;
  const allReady =
    playerIds.length >= 2 && playerIds.every((id) => roundReady[id] === true);

  useEffect(() => {
    if (!showMap || !containerRef.current) return;

    const container = containerRef.current;
    let active = true;

    void import("leaflet").then((L) => {
      if (!active || !containerRef.current || mapRef.current) return;

      const actualPos: [number, number] = [question.lat, question.lng];
      const guessEntries = Object.entries(result.guesses);
      const guessPositions = guessEntries.map(
        ([, guess]) => [guess.lat, guess.lng] as [number, number],
      );
      const allPositions = [actualPos, ...guessPositions];

      const map = L.map(container, {
        zoomControl: true,
        scrollWheelZoom: false,
        worldCopyJump: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds(allPositions);
      if (allPositions.length > 1 && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
      } else {
        map.setView(actualPos, 4);
      }

      L.circleMarker(actualPos, {
        radius: 12,
        fillColor: "#22c55e",
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("实际地点", { permanent: true, direction: "top" });

      const colors = ["#f59e0b", "#a78bfa"];
      guessEntries.forEach(([pid, guess], index) => {
        const color = colors[index % colors.length]!;
        const guessPos: [number, number] = [guess.lat, guess.lng];

        L.circleMarker(guessPos, {
          radius: 10,
          fillColor: color,
          color: "#fff",
          weight: 2,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(players[pid]?.name ?? pid, {
            permanent: true,
            direction: "top",
          });

        L.polyline([guessPos, actualPos], {
          color,
          weight: 2,
          opacity: 0.7,
          dashArray: "6 4",
        }).addTo(map);
      });

      window.setTimeout(() => map.invalidateSize(), 0);
      mapRef.current = map;
    });

    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [showMap, result.roundIndex, question, players, result.guesses]);

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
        年份：{formatYear(guess.year)} · 年份分 {guess.yearPts.toLocaleString()}
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
        <span className="text-stone-400">
          第 {result.roundIndex + 1} 轮结果
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {showMap && (
          <div
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
