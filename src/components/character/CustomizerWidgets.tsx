"use client";

import { CharacterSVG } from "~/components/CharacterSVG";
import {
  type CharacterConfig,
  SKIN_TONES,
  HAIR_COLORS,
  HAIR_STYLE_NAMES,
  TOP_COLORS,
  TOP_STYLE_NAMES,
  PANTS_COLORS,
  PANTS_STYLE_NAMES,
} from "~/types/character";

const SKIN_LABELS = ["白皙", "自然", "小麦", "深棕", "深色"];
const HAIR_COLOR_LABELS = ["黑", "深棕", "金棕", "金", "红", "紫"];
const TOP_COLOR_LABELS = ["红", "蓝", "绿", "橙", "紫", "白"];
const PANTS_COLOR_LABELS = ["牛仔", "黑", "卡其", "红", "绿"];

export type CustomizerTab = "skin" | "hair" | "top" | "pants";

export const CUSTOMIZER_TABS: { id: CustomizerTab; label: string; icon: string }[] = [
  { id: "skin", label: "肤色", icon: "🎨" },
  { id: "hair", label: "发型", icon: "💇" },
  { id: "top", label: "上衣", icon: "👕" },
  { id: "pants", label: "下装", icon: "👖" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: CustomizerTab;
  onChange: (tab: CustomizerTab) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-stone-950/60 p-1.5 ring-1 ring-stone-700/80">
      {CUSTOMIZER_TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-xl px-2 py-2.5 text-center text-sm font-semibold transition ${
              selected
                ? "bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 shadow-lg shadow-amber-900/30"
                : "text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            }`}
          >
            <span className="block text-lg leading-none">{tab.icon}</span>
            <span className="mt-1 block text-xs">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ColorSwatchGrid({
  colors,
  labels,
  selected,
  onChange,
}: {
  colors: string[];
  labels?: string[];
  selected: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {colors.map((color, index) => {
        const active = selected === index;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onChange(index)}
            className={`group flex flex-col items-center gap-1.5 rounded-xl p-2 transition ${
              active
                ? "bg-amber-500/15 ring-2 ring-amber-400"
                : "bg-stone-800/60 hover:bg-stone-800"
            }`}
          >
            <span
              className="relative h-10 w-10 rounded-full shadow-inner ring-1 ring-white/10"
              style={{ backgroundColor: color }}
            >
              {active && (
                <span className="absolute inset-0 grid place-items-center text-sm font-bold text-white drop-shadow">
                  ✓
                </span>
              )}
            </span>
            {labels?.[index] && (
              <span className="text-[10px] text-stone-500 group-hover:text-stone-300">
                {labels[index]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function StyleCardGrid({
  options,
  selected,
  onChange,
  config,
  previewKey,
}: {
  options: string[];
  selected: number;
  onChange: (index: number) => void;
  config: CharacterConfig;
  previewKey: keyof CharacterConfig;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((name, index) => {
        const active = selected === index;
        const previewConfig: CharacterConfig = { ...config, [previewKey]: index };

        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(index)}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 transition ${
              active
                ? "border-amber-400/80 bg-gradient-to-b from-amber-500/15 to-stone-900 shadow-lg shadow-amber-950/20"
                : "border-stone-700/80 bg-stone-800/50 hover:border-stone-600 hover:bg-stone-800"
            }`}
          >
            <div className="flex h-20 w-full items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-slate-600/30 to-stone-950">
              <CharacterSVG config={previewConfig} size={62} view="bust" />
            </div>
            <span
              className={`text-sm font-medium ${
                active ? "text-amber-300" : "text-stone-300"
              }`}
            >
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PreviewStage({ config }: { config: CharacterConfig }) {
  return (
    <div className="relative w-full max-w-sm">
      <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-amber-400/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-amber-500/25 bg-gradient-to-b from-[#1a2236] via-stone-900 to-stone-950 shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sky-300/10 via-amber-200/5 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-8 h-28 w-28 -translate-x-1/2 rounded-full bg-amber-200/15 blur-2xl" />

        <div className="relative flex min-h-[360px] flex-col items-center justify-end px-4 pb-4 pt-12">
          <div className="pointer-events-none absolute bottom-16 left-1/2 h-6 w-36 -translate-x-1/2 rounded-full bg-black/40 blur-lg" />
          <div className="pointer-events-none absolute bottom-12 left-1/2 w-40 -translate-x-1/2 rounded-t-[100%] border-t border-amber-500/20 bg-gradient-to-b from-stone-800/80 to-stone-900/40 px-8 py-3" />
          <CharacterSVG config={config} size={240} view="full" />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-stone-800/80 bg-stone-950/50 px-4 py-4">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-stone-900/80 px-3 py-3 ring-1 ring-stone-800">
            <div className="flex h-16 w-16 items-end justify-center overflow-hidden rounded-full bg-gradient-to-b from-slate-600/40 to-stone-950 ring-2 ring-amber-400/40">
              <CharacterSVG config={config} size={64} view="bust" />
            </div>
            <span className="text-xs font-medium text-stone-400">对战头像</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-stone-900/80 px-3 py-3 ring-1 ring-stone-800">
            <div className="flex h-[4.5rem] w-14 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-slate-600/40 to-stone-950 ring-1 ring-stone-700">
              <CharacterSVG config={config} size={52} view="full" />
            </div>
            <span className="text-xs font-medium text-stone-400">全身立绘</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PanelSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-700/70 bg-stone-900/70 p-5 shadow-inner shadow-black/20">
      <div className="mb-4">
        <h3 className="text-base font-bold text-stone-100">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export const PALETTE_META = {
  skin: { colors: SKIN_TONES, labels: SKIN_LABELS },
  hair: { colors: HAIR_COLORS, labels: HAIR_COLOR_LABELS },
  top: { colors: TOP_COLORS, labels: TOP_COLOR_LABELS },
  pants: { colors: PANTS_COLORS, labels: PANTS_COLOR_LABELS },
  hairStyles: HAIR_STYLE_NAMES,
  topStyles: TOP_STYLE_NAMES,
  pantsStyles: PANTS_STYLE_NAMES,
} as const;
