"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  type CharacterConfig,
  DEFAULT_CHARACTER,
  CHARACTER_PRESETS,
  CHARACTER_STORAGE_KEY,
  serializeCharacter,
  deserializeCharacter,
} from "~/types/character";
import { notifyCharacterUpdated } from "~/lib/character-sync";
import {
  TabBar,
  PreviewStage,
  PanelSection,
  ColorSwatchGrid,
  StyleCardGrid,
  PALETTE_META,
  type CustomizerTab,
} from "~/components/character/CustomizerWidgets";

function CharacterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const required = searchParams.get("required") === "1";

  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomizerTab>("skin");

  useEffect(() => {
    const stored = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (stored) setConfig(deserializeCharacter(stored));
  }, []);

  function update<K extends keyof CharacterConfig>(
    key: K,
    value: CharacterConfig[K],
  ) {
    setSaved(false);
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    localStorage.setItem(CHARACTER_STORAGE_KEY, serializeCharacter(config));
    notifyCharacterUpdated();
    setSaved(true);
    if (required) {
      void router.replace("/");
    }
  }

  function handleReset() {
    setConfig(DEFAULT_CHARACTER);
    setSaved(false);
  }

  function handleRandomize() {
    const preset =
      CHARACTER_PRESETS[Math.floor(Math.random() * CHARACTER_PRESETS.length)]!;
    setConfig(preset);
    setSaved(false);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#34203f_0%,_#0c0a12_58%)] text-white">
      <div className="flex items-center justify-between border-b border-fuchsia-300/10 bg-stone-950/55 px-6 py-4 backdrop-blur">
        {required ? (
          <span className="text-sm text-stone-500">创建角色后即可进入大厅</span>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-stone-400 transition hover:bg-stone-800 hover:text-white"
          >
            ← 返回首页
          </Link>
        )}
        <div className="text-center">
          <p className="text-xs tracking-[0.2em] text-pink-300/80 uppercase">
            Live2D Style Studio
          </p>
          <h1 className="text-xl font-extrabold text-pink-200">
            二次元角色捏脸
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRandomize}
            className="rounded-xl border border-fuchsia-300/15 bg-stone-900 px-3 py-2 text-sm text-stone-300 transition hover:border-pink-300/50 hover:bg-fuchsia-950/40 hover:text-pink-200"
          >
            🎲 随机
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-fuchsia-300/15 bg-stone-900 px-3 py-2 text-sm text-stone-300 transition hover:border-stone-600 hover:bg-stone-800"
          >
            重置
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              saved && !required
                ? "bg-emerald-600 text-white"
                : "bg-gradient-to-r from-pink-300 to-fuchsia-500 text-stone-950 hover:from-pink-200 hover:to-fuchsia-400"
            }`}
          >
            {required ? "完成 →" : saved ? "✓ 已保存" : "保存形象"}
          </button>
        </div>
      </div>

      {required && (
        <div className="border-b border-pink-300/20 bg-pink-500/10 px-6 py-3 text-center text-sm text-pink-100">
          欢迎加入 HistoGuessr！先创建你的 Live2D 风格角色
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:px-8">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <PreviewStage config={config} />
        </div>

        <div className="flex flex-col gap-5">
          <TabBar active={activeTab} onChange={setActiveTab} />

          {activeTab === "skin" && (
            <PanelSection
              title="脸部基调"
              subtitle="选择角色的基础肤色与整体气质"
            >
              <ColorSwatchGrid
                colors={[...PALETTE_META.skin.colors]}
                labels={[...PALETTE_META.skin.labels]}
                selected={config.skinTone}
                onChange={(value) => update("skinTone", value)}
              />
            </PanelSection>
          )}

          {activeTab === "hair" && (
            <>
              <PanelSection
                title="发型轮廓"
                subtitle="点击卡片预览不同二次元发型"
              >
                <StyleCardGrid
                  options={[...PALETTE_META.hairStyles]}
                  selected={config.hairStyle}
                  onChange={(value) => update("hairStyle", value)}
                  config={config}
                  previewKey="hairStyle"
                />
              </PanelSection>
              {config.hairStyle !== 4 && (
                <PanelSection title="发色" subtitle="为发型搭配高饱和发色">
                  <ColorSwatchGrid
                    colors={[...PALETTE_META.hair.colors]}
                    labels={[...PALETTE_META.hair.labels]}
                    selected={config.hairColor}
                    onChange={(value) => update("hairColor", value)}
                  />
                </PanelSection>
              )}
            </>
          )}

          {activeTab === "top" && (
            <>
              <PanelSection
                title="服装款式"
                subtitle="制服、偶像外套、连衣裙或幻想披肩"
              >
                <StyleCardGrid
                  options={[...PALETTE_META.topStyles]}
                  selected={config.topStyle}
                  onChange={(value) => update("topStyle", value)}
                  config={config}
                  previewKey="topStyle"
                />
              </PanelSection>
              <PanelSection title="服装主色">
                <ColorSwatchGrid
                  colors={[...PALETTE_META.top.colors]}
                  labels={[...PALETTE_META.top.labels]}
                  selected={config.topColor}
                  onChange={(value) => update("topColor", value)}
                />
              </PanelSection>
            </>
          )}

          {activeTab === "pants" && (
            <>
              <PanelSection title="配饰款式">
                <StyleCardGrid
                  options={[...PALETTE_META.pantsStyles]}
                  selected={config.pantsStyle}
                  onChange={(value) => update("pantsStyle", value)}
                  config={config}
                  previewKey="pantsStyle"
                />
              </PanelSection>
              <PanelSection title="配饰颜色">
                <ColorSwatchGrid
                  colors={[...PALETTE_META.pants.colors]}
                  labels={[...PALETTE_META.pants.labels]}
                  selected={config.pantsColor}
                  onChange={(value) => update("pantsColor", value)}
                />
              </PanelSection>
            </>
          )}

          {required && (
            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-300 to-fuchsia-500 py-4 text-center text-lg font-extrabold text-stone-950 shadow-lg shadow-fuchsia-950/30 transition hover:from-pink-200 hover:to-fuchsia-400"
            >
              完成，进入游戏 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CharacterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
          加载中…
        </div>
      }
    >
      <CharacterPageInner />
    </Suspense>
  );
}
