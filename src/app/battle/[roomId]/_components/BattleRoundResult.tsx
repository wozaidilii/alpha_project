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
import { type AnimeLocale } from "~/lib/anime-locale";
import { formatBattleDistance, getBattleCopy } from "~/lib/battle-copy";

interface Props {
  result: BattleRoundResult;
  players: Record<string, BattlePlayer>;
  myId: string;
  questionType: GameModeSlug;
  roundReady: Record<string, boolean>;
  isLastRound: boolean;
  locale: AnimeLocale;
  onReady: () => void;
}

export function BattleRoundResultView({
  result,
  players,
  myId,
  questionType,
  roundReady,
  isLastRound,
  locale,
  onReady,
}: Props) {
  const copy = getBattleCopy(locale);
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
        label: copy.actualLocation,
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
  }, [
    copy.actualLocation,
    showMap,
    result.roundIndex,
    historicalQuestion,
    players,
    result.guesses,
  ]);

  function renderScoreBreakdown(guess: (typeof result.guesses)[string]) {
    if (standardQuestion && isFunfactQuestion(standardQuestion)) {
      return (
        <div className="mt-3 rounded-lg bg-stone-950/30 px-3 py-2 text-xs text-stone-400">
          <div className="flex justify-between gap-2">
            <span>{copy.quizScore}</span>
            <span className="font-bold text-white">
              {guess.quizPts.toLocaleString()}
            </span>
          </div>
          <div className="mt-1">
            {guess.isCorrect ? copy.correct : copy.incorrect}
          </div>
        </div>
      );
    }
    if (isLocationOnlyBattleQuestion(question)) {
      if (!guess.submitted) {
        return (
          <div className="mt-3 rounded-lg bg-stone-950/30 px-3 py-2 text-xs text-stone-400">
            {copy.noSubmission}
          </div>
        );
      }

      return (
        <div className="mt-3 space-y-2 rounded-lg bg-stone-950/30 px-3 py-2 text-xs text-stone-400">
          <div className="flex justify-between gap-2">
            <span>{copy.distanceScore}</span>
            <span className="font-bold text-white">
              {guess.locationPts.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span>{copy.speedBonus}</span>
            <span className="font-bold text-white">
              +{(guess.speedCompensationPts ?? 0).toLocaleString()}
            </span>
          </div>
          <div>
            {copy.distanceAndElapsed(
              formatBattleDistance(guess.distanceKm, locale),
              guess.elapsedSeconds == null
                ? undefined
                : Math.round(guess.elapsedSeconds),
            )}
          </div>
        </div>
      );
    }
    if (showMap) {
      return (
        <div className="mt-3 space-y-2 rounded-lg bg-stone-950/30 px-3 py-2 text-xs text-stone-400">
          <div className="flex justify-between gap-2">
            <span>{copy.locationScore}</span>
            <span className="font-bold text-white">
              {guess.locationPts.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span>{copy.yearScore}</span>
            <span className="font-bold text-white">
              {guess.yearPts.toLocaleString()}
            </span>
          </div>
          <div>
            {copy.selectedYear}: {formatYear(guess.year)}
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
          <span>{copy.yearScore}</span>
          <span className="font-bold text-white">
            {guess.yearPts.toLocaleString()}
          </span>
        </div>
        <div className="mt-1">
          {copy.selectedYear}: {formatYear(guess.year)}
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
    <div className="anime-shell flex h-screen flex-col text-white">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0d081a]/90 px-6 py-3 backdrop-blur">
        <h1 className="font-bold text-pink-100">{copy.roundResultTitle}</h1>
        <span className="text-pink-100/60">
          {copy.roundResultSubtitle(result.roundIndex + 1)}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {showMap && (
          <div
            ref={containerRef}
            className="w-full border-b border-white/10"
            style={{ height: "min(42vh, 420px)", minHeight: 320 }}
          />
        )}
        {showLocationOnlyMap && (
          <div
            className="w-full border-b border-white/10"
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
          <p className="mb-5 text-sm text-pink-100/60">
            {getBattleQuestionSubtitle(question)}
            {standardQuestion &&
              !isFunfactQuestion(standardQuestion) &&
              standardQuestion.year !== 0 && (
                <>
                  {" "}
                  · {copy.actualYear}{" "}
                  {formatAnswerYear(standardQuestion.year, yearEnd)}
                </>
              )}
          </p>

          <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {playerIds.map((pid) => {
              const player = players[pid]!;
              const guess = result.guesses[pid];
              const dmg = result.damage[pid] ?? 0;
              const hpAfter = result.hpAfter[pid] ?? 0;
              const isMe = pid === myId;

              return (
                <div
                  key={pid}
                  className={`anime-panel p-4 ${isMe ? "ring-1 ring-pink-300/60" : ""}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-semibold">{player.name}</span>
                    {isMe && (
                      <span className="text-xs text-amber-400">
                        ({copy.me})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-pink-100/50">
                    {copy.roundTotalScore}
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {guess?.total.toLocaleString() ?? 0}
                  </div>
                  {guess && renderScoreBreakdown(guess)}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
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
              <p className="anime-panel mb-4 px-4 py-3 text-sm text-pink-100/75">
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
            const topScore = Math.max(
              ...playerIds.map((pid) => result.guesses[pid]?.total ?? 0),
            );
            const damagedPlayers = playerIds.filter(
              (pid) => (result.damage[pid] ?? 0) > 0,
            );
            if (damagedPlayers.length === 0) {
              return (
                <p className="mb-4 text-center text-sm text-pink-100/60">
                  {copy.noDamage}
                </p>
              );
            }
            return (
              <div className="anime-panel mb-4 flex flex-wrap justify-center gap-2 px-4 py-3 text-sm text-pink-100/70">
                <span>{copy.topScore(topScore.toLocaleString())}</span>
                {damagedPlayers.map((pid) => (
                  <span
                    key={pid}
                    className="rounded-full bg-red-400/12 px-3 py-1 text-red-100"
                  >
                    {players[pid]?.name} -{result.damage[pid] ?? 0} HP
                  </span>
                ))}
              </div>
            );
          })()}

          <div className="mb-4 flex flex-wrap justify-center gap-3">
            {playerIds.map((pid) => (
              <span
                key={pid}
                className={`rounded-full px-3 py-1 text-xs ${
                  roundReady[pid]
                    ? "bg-green-400/15 text-green-200"
                    : "bg-white/8 text-pink-100/55"
                }`}
              >
                {players[pid]?.name}
                {roundReady[pid] ? ` ✓ ${copy.ready}` : ` · ${copy.notReady}`}
              </span>
            ))}
          </div>

          <button
            onClick={onReady}
            disabled={iAmReady || allReady}
            className={`w-full rounded-xl py-3 font-bold transition ${
              iAmReady
                ? "cursor-default bg-green-500/20 text-green-200"
                : "bg-pink-300 text-zinc-950 hover:bg-pink-200"
            }`}
          >
            {iAmReady
              ? copy.readyWaiting
              : isLastRound
                ? copy.readyFinal
                : copy.readyNext}
          </button>

          {allReady && (
            <p className="mt-3 text-center text-sm text-cyan-100">
              {copy.allReady}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
