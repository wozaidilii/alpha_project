"use client";

import { useEffect, useState } from "react";
import { type HistoricalEvent } from "~/types/event";
import { GameMap } from "./_components/GameMap";
import { TimelineSlider } from "./_components/TimelineSlider";
import { EventCard } from "./_components/EventCard";
import { RoundResult } from "./_components/RoundResult";
import { FinalScore } from "./_components/FinalScore";
import { api } from "~/trpc/react";
import {
  haversineDistance,
  locationScore,
  yearScore,
  totalScore,
} from "~/lib/scoring";

const ROUNDS = 5;

export interface RoundData {
  event: HistoricalEvent;
  guessLat: number;
  guessLng: number;
  guessYear: number;
  distanceKm: number;
  locationPts: number;
  yearPts: number;
  total: number;
}

type Phase = "playing" | "round-result" | "final";

export default function GamePage() {
  const eventsQuery = api.event.random.useQuery(
    { count: ROUNDS },
    { refetchOnWindowFocus: false },
  );
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [rounds, setRounds] = useState<RoundData[]>([]);

  // current guess state
  const [guessLat, setGuessLat] = useState<number | null>(null);
  const [guessLng, setGuessLng] = useState<number | null>(null);
  const [guessYear, setGuessYear] = useState<number>(1900);

  useEffect(() => {
    if (eventsQuery.data) setEvents(eventsQuery.data);
  }, [eventsQuery.data]);

  const currentEvent = events[round];

  function handleSubmit() {
    if (!currentEvent || guessLat === null || guessLng === null) return;

    const distanceKm = haversineDistance(
      currentEvent.lat,
      currentEvent.lng,
      guessLat,
      guessLng,
    );
    const locPts = locationScore(distanceKm);
    const yrPts = yearScore(currentEvent.year, guessYear);

    const data: RoundData = {
      event: currentEvent,
      guessLat,
      guessLng,
      guessYear,
      distanceKm,
      locationPts: locPts,
      yearPts: yrPts,
      total: totalScore(locPts, yrPts),
    };

    setRounds((prev) => [...prev, data]);
    setPhase("round-result");
  }

  function handleNextRound() {
    if (round + 1 >= ROUNDS) {
      setPhase("final");
    } else {
      setRound((r) => r + 1);
      setGuessLat(null);
      setGuessLng(null);
      setGuessYear(1900);
      setPhase("playing");
    }
  }

  async function handleRestart() {
    const nextEvents = await eventsQuery.refetch();
    setEvents(nextEvents.data ?? []);
    setRound(0);
    setPhase("playing");
    setRounds([]);
    setGuessLat(null);
    setGuessLng(null);
    setGuessYear(1900);
  }

  if (!currentEvent && phase === "playing") {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-900 text-white">
        {eventsQuery.isError
          ? "题库加载失败，请检查数据库连接"
          : eventsQuery.isLoading
            ? "加载中..."
            : "题库为空，请先导入题目"}
      </div>
    );
  }

  if (phase === "final") {
    return <FinalScore rounds={rounds} onRestart={handleRestart} />;
  }

  if (phase === "round-result" && rounds.length > 0) {
    const last = rounds[rounds.length - 1]!;
    return (
      <RoundResult
        data={last}
        roundNumber={round + 1}
        totalRounds={ROUNDS}
        onNext={handleNextRound}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <h1 className="text-xl font-bold tracking-wide text-amber-400">
          HistoGuessr
        </h1>
        <span className="text-stone-400">
          第 {round + 1} / {ROUNDS} 轮
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: event info + timeline */}
        <div className="flex w-96 flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-stone-700 p-4">
          {currentEvent && <EventCard event={currentEvent} />}

          <TimelineSlider value={guessYear} onChange={setGuessYear} />

          <button
            onClick={handleSubmit}
            disabled={guessLat === null}
            className="mt-2 w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-stone-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guessLat === null ? "先在地图上点击选择地点" : "提交猜测"}
          </button>
        </div>

        {/* Right panel: map */}
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
      </div>
    </div>
  );
}
