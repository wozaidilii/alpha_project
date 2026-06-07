"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CharacterSVG } from "~/components/CharacterSVG";
import {
  type CharacterConfig,
  DEFAULT_CHARACTER,
  CHARACTER_STORAGE_KEY,
  SKIN_TONES,
  HAIR_COLORS,
  HAIR_STYLE_NAMES,
  TOP_COLORS,
  TOP_STYLE_NAMES,
  PANTS_COLORS,
  PANTS_STYLE_NAMES,
  serializeCharacter,
  deserializeCharacter,
} from "~/types/character";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorPicker({
  colors,
  selected,
  onChange,
}: {
  colors: string[];
  selected: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className="h-8 w-8 rounded-full transition hover:scale-110"
          style={{
            backgroundColor: color,
            outline: selected === i ? "3px solid #f59e0b" : "2px solid transparent",
            outlineOffset: "2px",
          }}
        />
      ))}
    </div>
  );
}

function StylePicker({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((name, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            selected === i
              ? "bg-amber-500 text-stone-900"
              : "bg-stone-700 text-stone-300 hover:bg-stone-600"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-stone-800 p-4">
      <h3 className="mb-3 text-sm font-semibold text-stone-400">{title}</h3>
      {children}
    </div>
  );
}

// ─── Inner page (needs searchParams) ─────────────────────────────────────────

function CharacterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const required = searchParams.get("required") === "1";

  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (stored) setConfig(deserializeCharacter(stored));
  }, []);

  function update<K extends keyof CharacterConfig>(key: K, value: CharacterConfig[K]) {
    setSaved(false);
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    localStorage.setItem(CHARACTER_STORAGE_KEY, serializeCharacter(config));
    setSaved(true);
    if (required) {
      void router.replace("/");
    }
  }

  function handleReset() {
    setConfig(DEFAULT_CHARACTER);
    setSaved(false);
  }

  return (
    <div className="min-h-screen bg-stone-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        {required ? (
          <span className="text-sm text-stone-500">创建你的角色后才能开始游戏</span>
        ) : (
          <Link href="/" className="text-sm text-stone-400 hover:text-white">
            ← 返回首页
          </Link>
        )}
        <h1 className="font-bold text-amber-400">✨ 角色捏脸</h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="rounded-lg bg-stone-700 px-3 py-1.5 text-sm text-stone-300 transition hover:bg-stone-600"
          >
            重置
          </button>
          <button
            onClick={handleSave}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
              saved && !required
                ? "bg-green-600 text-white"
                : "bg-amber-500 text-stone-900 hover:bg-amber-400"
            }`}
          >
            {required ? "完成，进入游戏 →" : saved ? "✓ 已保存" : "保存"}
          </button>
        </div>
      </div>

      {required && (
        <div className="border-b border-amber-900/50 bg-amber-900/20 px-6 py-2 text-center text-sm text-amber-400">
          👋 欢迎！先捏一个专属角色，然后就可以开始游戏了
        </div>
      )}

      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:flex-row">
        {/* Left: Preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-72 w-48 items-end justify-center rounded-2xl bg-gradient-to-b from-stone-700 to-stone-800">
            <CharacterSVG config={config} size={160} view="full" />
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-12 w-12 items-end justify-center overflow-hidden rounded-full bg-stone-700">
                <CharacterSVG config={config} size={52} view="bust" />
              </div>
              <span className="text-xs text-stone-500">头像</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-16 w-12 items-end justify-center overflow-hidden rounded-xl bg-stone-700 pb-1">
                <CharacterSVG config={config} size={44} view="full" />
              </div>
              <span className="text-xs text-stone-500">全身</span>
            </div>
          </div>
        </div>

        {/* Right: Options */}
        <div className="flex flex-1 flex-col gap-4">
          <Section title="🎨 肤色">
            <ColorPicker colors={SKIN_TONES} selected={config.skinTone} onChange={(v) => update("skinTone", v)} />
          </Section>

          <Section title="💇 发型">
            <StylePicker options={HAIR_STYLE_NAMES} selected={config.hairStyle} onChange={(v) => update("hairStyle", v)} />
            {config.hairStyle !== 4 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-stone-500">发色</p>
                <ColorPicker colors={HAIR_COLORS} selected={config.hairColor} onChange={(v) => update("hairColor", v)} />
              </div>
            )}
          </Section>

          <Section title="👕 上衣">
            <StylePicker options={TOP_STYLE_NAMES} selected={config.topStyle} onChange={(v) => update("topStyle", v)} />
            <div className="mt-3">
              <p className="mb-2 text-xs text-stone-500">颜色</p>
              <ColorPicker colors={TOP_COLORS} selected={config.topColor} onChange={(v) => update("topColor", v)} />
            </div>
          </Section>

          <Section title="👖 下装">
            <StylePicker options={PANTS_STYLE_NAMES} selected={config.pantsStyle} onChange={(v) => update("pantsStyle", v)} />
            <div className="mt-3">
              <p className="mb-2 text-xs text-stone-500">颜色</p>
              <ColorPicker colors={PANTS_COLORS} selected={config.pantsColor} onChange={(v) => update("pantsColor", v)} />
            </div>
          </Section>

          {required && (
            <button
              onClick={handleSave}
              className="w-full rounded-xl bg-amber-500 py-3 text-center font-bold text-stone-900 transition hover:bg-amber-400"
            >
              完成，进入游戏 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page (wrapped in Suspense for useSearchParams) ───────────────────────────

export default function CharacterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">加载中…</div>}>
      <CharacterPageInner />
    </Suspense>
  );
}
