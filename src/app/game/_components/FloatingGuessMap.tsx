"use client";

import { useMemo, useState } from "react";
import { BaiduGuessMap } from "./BaiduGuessMap";

interface FloatingGuessMapProps {
  guessLat: number | null;
  guessLng: number | null;
  onGuess: (lat: number, lng: number) => void;
  onSubmit: () => void;
  disabled: boolean;
  submitLabel?: string;
  title?: string;
}

export function FloatingGuessMap({
  guessLat,
  guessLng,
  onGuess,
  onSubmit,
  disabled,
  submitLabel = "提交猜测",
  title = "猜点地图",
}: FloatingGuessMapProps) {
  const [expanded, setExpanded] = useState(false);
  const hasGuess = guessLat !== null && guessLng !== null;
  const guess = useMemo(
    () => (hasGuess ? { lat: guessLat, lng: guessLng } : null),
    [guessLat, guessLng, hasGuess],
  );

  return (
    <div
      className={`group fixed right-3 bottom-3 z-40 transition-all duration-200 ease-out focus-within:h-[min(72dvh,640px)] focus-within:w-[min(calc(100vw-1.5rem),920px)] hover:h-[min(72dvh,640px)] hover:w-[min(calc(100vw-1.5rem),920px)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:right-5 sm:bottom-5 ${
        expanded
          ? "h-[min(72dvh,640px)] w-[min(calc(100vw-1.5rem),920px)]"
          : "h-44 w-56 sm:h-48 sm:w-64"
      }`}
      role="group"
      aria-label={title}
      tabIndex={0}
      onPointerEnter={() => setExpanded(true)}
      onPointerLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setExpanded(false);
        }
      }}
    >
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-stone-600 bg-stone-950 shadow-lg shadow-black/40">
        <div className="min-h-0 flex-1 bg-stone-900">
          <BaiduGuessMap
            guess={guess}
            answer={null}
            minHeightClass="min-h-0"
            onGuess={(point) => onGuess(point.lat, point.lng)}
          />
        </div>

        <div
          className={`border-t border-stone-700 bg-stone-900/95 p-2 transition ${
            expanded
              ? "block"
              : "hidden group-focus-within:block group-hover:block"
          }`}
        >
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

      {!expanded && (
        <button
          type="button"
          aria-label={`展开${title}`}
          onClick={() => setExpanded(true)}
          onFocus={() => setExpanded(true)}
          onPointerEnter={() => setExpanded(true)}
          className="absolute inset-0 z-10 cursor-crosshair bg-transparent focus:outline-none"
        />
      )}
    </div>
  );
}
