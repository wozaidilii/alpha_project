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
const HAIR_COLOR_LABELS = ["墨茶", "夜紫", "蜂蜜", "樱粉", "湖蓝", "星紫"];
const TOP_COLOR_LABELS = ["赤红", "学院蓝", "薄荷", "金橙", "魔法紫", "月白"];
const PANTS_COLOR_LABELS = ["樱粉", "梦紫", "晶蓝", "星金", "青绿"];

export type CustomizerTab = "skin" | "hair" | "top" | "pants";

export const CUSTOMIZER_TABS: {
  id: CustomizerTab;
  label: string;
  icon: string;
}[] = [
  { id: "skin", label: "脸部", icon: "✨" },
  { id: "hair", label: "发型", icon: "💫" },
  { id: "top", label: "服装", icon: "🎀" },
  { id: "pants", label: "配饰", icon: "🌙" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: CustomizerTab;
  onChange: (tab: CustomizerTab) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-[#21172b]/70 p-1.5 ring-1 ring-fuchsia-300/20">
      {CUSTOMIZER_TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-xl px-2 py-2.5 text-center text-sm font-semibold transition ${
              selected
                ? "bg-gradient-to-b from-pink-300 to-fuchsia-500 text-stone-950 shadow-lg shadow-fuchsia-950/30"
                : "text-stone-400 hover:bg-fuchsia-950/40 hover:text-stone-100"
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
                ? "bg-pink-500/15 ring-2 ring-pink-300"
                : "bg-[#21172b]/70 hover:bg-[#2b1d39]"
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
        const previewConfig: CharacterConfig = {
          ...config,
          [previewKey]: index,
        };

        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(index)}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 transition ${
              active
                ? "border-pink-300/80 bg-gradient-to-b from-pink-500/15 to-[#17111f] shadow-lg shadow-fuchsia-950/20"
                : "border-fuchsia-300/15 bg-[#21172b]/55 hover:border-fuchsia-300/35 hover:bg-[#2b1d39]"
            }`}
          >
            <div className="flex h-20 w-full items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-pink-300/15 via-violet-500/10 to-stone-950">
              <CharacterSVG config={previewConfig} size={62} view="bust" />
            </div>
            <span
              className={`text-sm font-medium ${
                active ? "text-pink-200" : "text-stone-300"
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
      <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-fuchsia-400/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-pink-300/25 bg-gradient-to-b from-[#27172f] via-[#15111f] to-stone-950 shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-pink-300/15 via-violet-300/8 to-transparent" />
        <div className="pointer-events-none absolute top-8 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-pink-200/20 blur-2xl" />

        <div className="relative flex min-h-[360px] flex-col items-center justify-end px-4 pt-12 pb-4">
          <div className="pointer-events-none absolute bottom-16 left-1/2 h-6 w-36 -translate-x-1/2 rounded-full bg-black/40 blur-lg" />
          <div className="pointer-events-none absolute bottom-12 left-1/2 w-44 -translate-x-1/2 rounded-t-[100%] border-t border-pink-300/20 bg-gradient-to-b from-fuchsia-950/60 to-stone-900/40 px-8 py-3" />
          <CharacterSVG config={config} size={240} view="full" />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-fuchsia-300/10 bg-stone-950/50 px-4 py-4">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#17111f]/90 px-3 py-3 ring-1 ring-fuchsia-300/15">
            <div className="flex h-16 w-16 items-end justify-center overflow-hidden rounded-full bg-gradient-to-b from-pink-300/30 to-stone-950 ring-2 ring-pink-300/40">
              <CharacterSVG config={config} size={64} view="bust" />
            </div>
            <span className="text-xs font-medium text-stone-400">对战头像</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#17111f]/90 px-3 py-3 ring-1 ring-fuchsia-300/15">
            <div className="flex h-[4.5rem] w-14 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-400/25 to-stone-950 ring-1 ring-fuchsia-300/20">
              <CharacterSVG config={config} size={52} view="full" />
            </div>
            <span className="text-xs font-medium text-stone-400">
              Live2D 立绘
            </span>
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
    <section className="rounded-2xl border border-fuchsia-300/15 bg-[#17111f]/75 p-5 shadow-inner shadow-black/20">
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
