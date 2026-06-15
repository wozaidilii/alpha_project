"use client";

import { useState } from "react";
import { BaiduGuessMap } from "./BaiduGuessMap";

interface FloatingGuessMapProps {
  guessLat: number | null;
  guessLng: number | null;
  onGuess: (lat: number, lng: number) => void;
  onSubmit: () => void;
  disabled: boolean;
  submitLabel?: string;
  title?: string;
  helper?: string;
}

export function FloatingGuessMap({
  guessLat,
  guessLng,
  onGuess,
  onSubmit,
  disabled,
  submitLabel = "提交猜测",
  title = "猜点地图",
  helper = "靠近展开，点击百度地图选择位置",
}: FloatingGuessMapProps) {
  const [expanded, setExpanded] = useState(false);
  const hasGuess = guessLat !== null && guessLng !== null;
  const guess = hasGuess ? { lat: guessLat, lng: guessLng } : null;

  return (
    <div
      className={`group fixed right-3 bottom-3 z-40 transition-all duration-200 ease-out focus-within:h-[min(58dvh,460px)] focus-within:w-[min(calc(100vw-1.5rem),640px)] hover:h-[min(58dvh,460px)] hover:w-[min(calc(100vw-1.5rem),640px)] sm:right-5 sm:bottom-5 ${
        expanded
          ? "h-[min(58dvh,460px)] w-[min(calc(100vw-1.5rem),640px)]"
          : "h-44 w-56 sm:h-48 sm:w-64"
      }`}
      onPointerEnter={() => setExpanded(true)}
      onPointerLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setExpanded(false);
        }
      }}
    >
      <section
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-stone-600 bg-stone-950 shadow-lg shadow-black/40"
        aria-label={title}
      >
        <div className="flex min-h-10 items-center justify-between gap-3 border-b border-stone-700 bg-stone-900/95 px-3 py-2">
          <div>
            <div className="text-sm font-bold text-amber-200">{title}</div>
            <div
              className={`text-xs text-stone-500 transition ${
                expanded
                  ? "block opacity-100"
                  : "hidden opacity-0 group-focus-within:block group-focus-within:opacity-100 group-hover:block group-hover:opacity-100 sm:block"
              }`}
            >
              {helper}
            </div>
          </div>
          <button
            type="button"
            aria-label={expanded ? "收起猜点地图" : "展开猜点地图"}
            onClick={() => setExpanded((value) => !value)}
            className="grid h-8 w-8 flex-none place-items-center rounded-md border border-stone-700 text-sm font-bold text-stone-300 transition hover:border-amber-400 hover:text-amber-200 focus:ring-2 focus:ring-amber-300 focus:outline-none"
          >
            {expanded ? "-" : "+"}
          </button>
        </div>

        <div className="min-h-0 flex-1 bg-stone-900">
          <BaiduGuessMap
            guess={guess}
            answer={null}
            minHeightClass="min-h-0"
            onGuess={(point) => onGuess(point.lat, point.lng)}
          />
        </div>

        <div
          className={`border-t border-stone-700 bg-stone-900/95 px-3 py-2 transition ${
            expanded
              ? "block"
              : "hidden group-focus-within:block group-hover:block sm:block"
          }`}
        >
          <div className="mb-2 text-xs text-stone-400">
            {hasGuess ? (
              <>
                已选：
                <span className="font-mono text-stone-200">
                  {guessLat.toFixed(3)}, {guessLng.toFixed(3)}
                </span>
              </>
            ) : (
              "先在地图上点击你猜测的位置"
            )}
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled}
            className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-stone-950 transition hover:bg-amber-400 focus:ring-2 focus:ring-amber-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
