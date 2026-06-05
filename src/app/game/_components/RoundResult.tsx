"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { type RoundData } from "~/app/game/page";
import { formatYear } from "~/lib/scoring";

interface Props {
  data: RoundData;
  roundNumber: number;
  totalRounds: number;
  onNext: () => void;
}

export function RoundResult({ data, roundNumber, totalRounds, onNext }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const isLastRound = roundNumber >= totalRounds;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    void import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const actualPos: [number, number] = [data.event.lat, data.event.lng];
      const guessPos: [number, number] = [data.guessLat, data.guessLng];

      // Fit bounds to show both markers
      const bounds = L.latLngBounds([actualPos, guessPos]);

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).fitBounds(bounds, { padding: [40, 40] });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Actual location — green
      L.circleMarker(actualPos, {
        radius: 12,
        fillColor: "#22c55e",
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("实际地点", { permanent: true, direction: "top" });

      // Guess — amber
      L.circleMarker(guessPos, {
        radius: 10,
        fillColor: "#f59e0b",
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("你的猜测", { permanent: true, direction: "top" });

      // Line between them
      L.polyline([actualPos, guessPos], {
        color: "#f59e0b",
        weight: 2,
        opacity: 0.7,
        dashArray: "6 4",
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col bg-stone-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <h1 className="text-xl font-bold tracking-wide text-amber-400">
          HistoGuessr
        </h1>
        <span className="text-stone-400">
          第 {roundNumber} / {totalRounds} 轮结果
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-auto">
        {/* Map */}
        <div
          ref={containerRef}
          className="w-full border-b border-stone-700"
          style={{ height: 360 }}
        />

        {/* Score breakdown */}
        <div className="mx-auto w-full max-w-2xl px-6 py-6">
          <h2 className="mb-1 text-2xl font-bold text-amber-400">
            {data.event.title}
          </h2>
          <p className="mb-6 text-sm text-stone-400">{data.event.location}</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Location score */}
            <div className="rounded-xl bg-stone-800 p-4">
              <div className="mb-1 text-sm text-stone-400">📍 地点分</div>
              <div className="text-3xl font-bold text-white">
                {data.locationPts.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-stone-400">
                距实际地点{" "}
                <span className="text-white">
                  {data.distanceKm < 1
                    ? `${Math.round(data.distanceKm * 1000)} 米`
                    : `${Math.round(data.distanceKm).toLocaleString()} 公里`}
                </span>
              </div>
            </div>

            {/* Year score */}
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
                <span className="text-green-400">
                  {formatYear(data.event.year)}
                </span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-600/20 to-amber-500/10 p-5 text-center">
            <div className="text-sm text-stone-400">本轮总分</div>
            <div className="text-5xl font-extrabold text-amber-400">
              {data.total.toLocaleString()}
            </div>
            <div className="text-sm text-stone-500">/ 10,000</div>
          </div>

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
