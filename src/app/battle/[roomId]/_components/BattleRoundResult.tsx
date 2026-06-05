"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { type BattleRoundResult, type BattlePlayer } from "~/types/battle";
import { formatYear } from "~/lib/scoring";

interface Props {
  result: BattleRoundResult;
  players: Record<string, BattlePlayer>;
  myId: string;
  isLastRound: boolean;
  isHost: boolean;
  onNext: () => void;
}

export function BattleRoundResultView({
  result,
  players,
  myId,
  isLastRound,
  isHost,
  onNext,
}: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    void import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const actualPos: [number, number] = [result.event.lat, result.event.lng];
      const points: [number, number][] = [actualPos];

      for (const g of Object.values(result.guesses)) {
        points.push([g.lat, g.lng]);
      }

      const bounds = L.latLngBounds(points);
      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).fitBounds(bounds, { padding: [40, 40] });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Actual location
      L.circleMarker(actualPos, {
        radius: 12,
        fillColor: "#22c55e",
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("实际地点", { permanent: true, direction: "top" });

      // Each player's guess
      const colors = ["#f59e0b", "#a78bfa"];
      let colorIdx = 0;
      for (const [pid, guess] of Object.entries(result.guesses)) {
        const player = players[pid];
        const color = colors[colorIdx++ % colors.length]!;
        const guessPos: [number, number] = [guess.lat, guess.lng];

        L.circleMarker(guessPos, {
          radius: 10,
          fillColor: color,
          color: "#fff",
          weight: 2,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(player?.name ?? pid, { permanent: true, direction: "top" });

        L.polyline([actualPos, guessPos], {
          color,
          weight: 2,
          opacity: 0.6,
          dashArray: "6 4",
        }).addTo(map);
      }

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playerIds = Object.keys(players);

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <h1 className="font-bold text-red-400">⚔️ 对战</h1>
        <span className="text-stone-400">第 {result.roundIndex + 1} 轮结果</span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Map */}
        <div ref={containerRef} className="w-full border-b border-stone-700" style={{ height: 300 }} />

        <div className="mx-auto max-w-2xl px-5 py-5">
          <h2 className="mb-1 text-xl font-bold text-amber-400">{result.event.title}</h2>
          <p className="mb-5 text-sm text-stone-400">
            {result.event.location} · {formatYear(result.event.year)}
          </p>

          {/* Per-player score + HP */}
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
                    {isMe && <span className="text-xs text-amber-400">(你)</span>}
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {guess?.total.toLocaleString() ?? 0}
                  </div>
                  <div className="mt-1 text-xs text-stone-400">
                    📍 {guess?.locationPts.toLocaleString() ?? 0} + 📅 {guess?.yearPts.toLocaleString() ?? 0}
                  </div>
                  <div className="mt-1 text-xs text-stone-400">
                    年份：{formatYear(guess?.year ?? 1900)}
                    {guess && guess.speedMultiplier > 1.01 && (
                      <span className="ml-2 font-bold text-amber-400">
                        ⚡×{guess.speedMultiplier.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-700">
                      <div
                        className={`h-full rounded-full transition-all ${hpAfter > 50 ? "bg-green-500" : hpAfter > 20 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${hpAfter}%` }}
                      />
                    </div>
                    <span className="text-xs text-white">{hpAfter} HP</span>
                    {dmg > 0 && (
                      <span className="text-xs font-bold text-red-400">-{dmg}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Damage info */}
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
                分差 <span className="text-white">{diff.toLocaleString()}</span>，
                <span className="font-semibold text-red-400">{players[loser]?.name}</span>{" "}
                损失 <span className="font-bold text-red-400">{result.damage[loser] ?? 0} HP</span>
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
              onClick={onNext}
              className="w-full rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-400"
            >
              查看最终结果 →
            </button>
          )}
          {!isHost && (
            <p className="text-center text-stone-400">等待房主进入下一轮…</p>
          )}
        </div>
      </div>
    </div>
  );
}
