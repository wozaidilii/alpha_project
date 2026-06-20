"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatYear } from "~/lib/scoring";
import {
  MIN_YEAR,
  MAX_YEAR,
  clampYear,
  clampYearInRange,
  yearToPosition,
  yearToSlider,
  yearToSliderInRange,
  sliderToYear,
  sliderToYearInRange,
} from "~/lib/timeline";

interface Props {
  value: number;
  onChange: (year: number) => void;
  /** 自定义下限，默认公元前 3000 */
  minYear?: number;
  /** 自定义上限，默认公元 2026 */
  maxYear?: number;
}

export function TimelineSlider({
  value,
  onChange,
  minYear = MIN_YEAR,
  maxYear = MAX_YEAR,
}: Props) {
  const isModernRange = minYear >= 1900;
  const [inputText, setInputText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const clamp = useCallback(
    (y: number) =>
      isModernRange
        ? clampYearInRange(y, minYear, maxYear)
        : clampYear(y),
    [isModernRange, minYear, maxYear],
  );

  function toSlider(y: number) {
    return isModernRange
      ? yearToSliderInRange(y, minYear, maxYear)
      : yearToSlider(y);
  }

  function fromSlider(s: number) {
    return isModernRange
      ? sliderToYearInRange(s, minYear, maxYear)
      : sliderToYear(s);
  }

  useEffect(() => {
    if (!editing) setInputText(String(value));
  }, [value, editing]);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const delta = e.deltaY > 0 ? -step : step;
      onChange(clamp(value + delta));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [value, onChange, clamp]);

  const percent = isModernRange
    ? ((clamp(value) - minYear) / (maxYear - minYear)) * 100
    : yearToPosition(value) * 100;
  const eraDividerPercent = yearToPosition(0) * 100;

  function commitInput() {
    const parsed = parseInt(inputText, 10);
    if (!Number.isNaN(parsed)) {
      onChange(clamp(parsed));
    } else {
      setInputText(String(value));
    }
    setEditing(false);
  }

  return (
    <div className="rounded-xl bg-stone-800 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-stone-400">选择年份</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={minYear}
            max={maxYear}
            value={inputText}
            onFocus={() => setEditing(true)}
            onChange={(e) => setInputText(e.target.value)}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitInput();
              if (e.key === "Escape") {
                setInputText(String(value));
                setEditing(false);
              }
            }}
            className="w-24 rounded-md border border-stone-600 bg-stone-900 px-2 py-1 text-right text-sm font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
            title="直接输入年份（负数表示公元前）"
          />
          <span className="rounded-md bg-amber-500 px-3 py-1 text-sm font-bold text-stone-900">
            {formatYear(value)}
          </span>
        </div>
      </div>

      <div
        ref={sliderRef}
        className="rounded-lg"
        title="滚轮微调年份，Shift+滚轮步进10年"
      >
        <input
          type="range"
          min={0}
          max={10000}
          step={1}
          value={toSlider(value)}
          onChange={(e) => onChange(fromSlider(parseInt(e.target.value, 10)))}
          className="w-full accent-amber-500"
        />
      </div>

      <div className="mt-1 flex justify-between text-xs text-stone-500">
        {isModernRange ? (
          <>
            <span>公元{minYear}年</span>
            <span>公元{maxYear}年</span>
          </>
        ) : (
          <>
            <span>公元前3000年</span>
            <span>公元元年</span>
            <span>公元2026年</span>
          </>
        )}
      </div>

      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-700">
        <div
          className="absolute left-0 h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-amber-500 transition-all"
          style={{ width: `${percent}%` }}
        />
        {!isModernRange && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/40"
            style={{ left: `${eraDividerPercent}%` }}
          />
        )}
      </div>
    </div>
  );
}
