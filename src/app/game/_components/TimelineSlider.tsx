"use client";

import { formatYear } from "~/lib/scoring";

const MIN_YEAR = -3000;
const MAX_YEAR = 2024;

interface Props {
  value: number;
  onChange: (year: number) => void;
}

export function TimelineSlider({ value, onChange }: Props) {
  const percent = ((value - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  return (
    <div className="rounded-xl bg-stone-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-stone-400">选择年份</span>
        <span className="rounded-md bg-amber-500 px-3 py-1 text-sm font-bold text-stone-900">
          {formatYear(value)}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={MIN_YEAR}
        max={MAX_YEAR}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-amber-500"
      />

      {/* Era labels */}
      <div className="mt-1 flex justify-between text-xs text-stone-500">
        <span>公元前3000年</span>
        <span>公元元年</span>
        <span>公元2024年</span>
      </div>

      {/* Timeline bar with era markers */}
      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-700">
        <div
          className="absolute left-0 h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-amber-500 transition-all"
          style={{ width: `${percent}%` }}
        />
        {/* BCE/CE divider at 50% ≈ year 0 */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/40"
          style={{ left: `${((0 - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%` }}
        />
      </div>
    </div>
  );
}
