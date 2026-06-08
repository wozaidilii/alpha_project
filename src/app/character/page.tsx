"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CharacterPortrait } from "~/components/CharacterPortrait";
import { notifyCharacterUpdated } from "~/lib/character-sync";
import {
  CHARACTER_PORTRAITS,
  CHARACTER_STORAGE_KEY,
  DEFAULT_CHARACTER,
  deserializeCharacter,
  serializeCharacter,
  type CharacterConfig,
} from "~/types/character";

function configForPortrait(portraitId: number): CharacterConfig {
  const portrait = CHARACTER_PORTRAITS[portraitId] ?? CHARACTER_PORTRAITS[0];
  return {
    portraitId: portrait.id,
    ...portrait.defaultConfig,
  };
}

function CharacterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const required = searchParams.get("required") === "1";

  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER);
  const [saved, setSaved] = useState(false);
  const selectedPortrait =
    CHARACTER_PORTRAITS[config.portraitId ?? 0] ?? CHARACTER_PORTRAITS[0];

  useEffect(() => {
    const stored = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (stored) setConfig(deserializeCharacter(stored));
  }, []);

  function handleSelect(portraitId: number) {
    setConfig(configForPortrait(portraitId));
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem(CHARACTER_STORAGE_KEY, serializeCharacter(config));
    notifyCharacterUpdated();
    setSaved(true);
    if (required) {
      void router.replace("/");
    }
  }

  return (
    <div className="min-h-screen bg-stone-950/65 text-white backdrop-blur-[1px]">
      <div className="flex items-center justify-between border-b border-[#c9a46a]/20 bg-stone-950/65 px-6 py-4 backdrop-blur">
        {required ? (
          <span className="text-sm text-stone-500">选择角色后即可进入大厅</span>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-stone-400 transition hover:bg-stone-800 hover:text-white"
          >
            ← 返回首页
          </Link>
        )}
        <div className="text-center">
          <p className="text-xs tracking-[0.2em] text-[#d8bd82]/80 uppercase">
            Character Select
          </p>
          <h1 className="text-xl font-extrabold text-[#e8d7b0]">选择角色</h1>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            saved && !required
              ? "bg-emerald-600 text-white"
              : "bg-gradient-to-r from-[#e8d7b0] to-[#c9a46a] text-stone-950 hover:from-[#f8f4ea] hover:to-[#d8bd82]"
          }`}
        >
          {required ? "确认进入 →" : saved ? "✓ 已保存" : "保存选择"}
        </button>
      </div>

      {required && (
        <div className="border-b border-[#c9a46a]/20 bg-[#c9a46a]/10 px-6 py-3 text-center text-sm text-[#e8d7b0]">
          欢迎加入 HistoGuessr！先选择你的历史探险角色
        </div>
      )}

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[380px_1fr] lg:px-8">
        <section className="lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-[#d8bd82]/25 bg-[#f8f4ea] shadow-2xl shadow-black/45">
            <div className="relative h-[560px]">
              <CharacterPortrait config={config} variant="full" priority />
            </div>
            <div className="border-t border-[#c9a46a]/20 bg-stone-950/90 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#e8d7b0]">
                    {selectedPortrait.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#d8bd82]">
                    {selectedPortrait.archetype}
                  </p>
                </div>
                <span className="rounded-full border border-[#c9a46a]/30 px-3 py-1 text-xs text-stone-400">
                  {selectedPortrait.age} 岁
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-400">
                {selectedPortrait.personality}
              </p>
            </div>
          </div>
        </section>

        <section className="self-center rounded-2xl border border-[#c9a46a]/15 bg-stone-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-stone-100">角色列表</h3>
            <p className="mt-1 text-sm text-stone-500">
              选择一个角色作为大厅、对战和档案中的默认形象
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {CHARACTER_PORTRAITS.map((portrait) => {
              const active = selectedPortrait.id === portrait.id;
              return (
                <button
                  key={portrait.id}
                  type="button"
                  onClick={() => handleSelect(portrait.id)}
                  className={`overflow-hidden rounded-2xl border text-left transition ${
                    active
                      ? "border-[#d8bd82]/80 bg-[#c9a46a]/15 shadow-lg shadow-black/25"
                      : "border-[#c9a46a]/15 bg-[#111827]/70 hover:border-[#c9a46a]/35 hover:bg-[#182033]"
                  }`}
                >
                  <div className="relative h-60 bg-[#f8f4ea]">
                    <Image
                      src={portrait.image}
                      alt={portrait.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 240px"
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="space-y-2 px-4 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-base font-extrabold ${
                          active ? "text-[#e8d7b0]" : "text-stone-100"
                        }`}
                      >
                        {portrait.name}
                      </span>
                      {active && (
                        <span className="rounded-full bg-[#c9a46a] px-2 py-0.5 text-[10px] font-bold text-stone-950">
                          已选择
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#d8bd82]">
                      {portrait.archetype}
                    </p>
                    <p className="min-h-10 text-xs leading-5 text-stone-500">
                      {portrait.personality}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {required && (
            <button
              type="button"
              onClick={handleSave}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#e8d7b0] to-[#c9a46a] py-4 text-center text-lg font-extrabold text-stone-950 shadow-lg shadow-black/30 transition hover:from-[#f8f4ea] hover:to-[#d8bd82]"
            >
              确认角色，进入游戏 →
            </button>
          )}
        </section>
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
