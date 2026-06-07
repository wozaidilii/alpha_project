"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";
import { CharacterSVG } from "~/components/CharacterSVG";
import {
  type CharacterConfig,
  CHARACTER_UPDATED_EVENT,
} from "~/types/character";
import { readStoredCharacter } from "~/lib/character-sync";

type GameMode = "solo" | "battle";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, session } = useCompletedPlayerSession();

  const [character, setCharacter] = useState<CharacterConfig | null>(null);
  const [characterChecked, setCharacterChecked] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>("solo");
  const redirectedRef = useRef(false);

  const syncCharacter = useCallback(() => {
    const stored = readStoredCharacter();
    setCharacter(stored);
    setCharacterChecked(true);
    return stored;
  }, []);

  useEffect(() => {
    syncCharacter();
  }, [syncCharacter]);

  useEffect(() => {
    if (pathname === "/") {
      syncCharacter();
    }
  }, [pathname, syncCharacter]);

  useEffect(() => {
    const onCharacterUpdated = () => syncCharacter();
    window.addEventListener(CHARACTER_UPDATED_EVENT, onCharacterUpdated);
    return () =>
      window.removeEventListener(CHARACTER_UPDATED_EVENT, onCharacterUpdated);
  }, [syncCharacter]);

  useEffect(() => {
    if (!ready || !characterChecked || redirectedRef.current) return;
    if (!character) {
      redirectedRef.current = true;
      void router.replace("/character?required=1");
    }
  }, [ready, characterChecked, character, router]);

  function handleStart() {
    if (selectedMode === "solo") {
      void router.push("/game");
    } else {
      void router.push("/battle");
    }
  }

  function handleEditCharacter() {
    void router.push("/character");
  }

  if (!ready || !characterChecked || (!character && ready)) {
    return <AuthLoading />;
  }

  if (!session) return <AuthLoading />;

  return (
    <div className="flex h-screen overflow-hidden bg-stone-950 text-white">
      <aside className="relative z-20 flex w-20 flex-col items-center border-r border-stone-800 bg-stone-900 py-5">
        <div className="text-3xl" title="HistoGuessr">
          🗺️
        </div>

        <div className="flex-1" />

        <div className="mb-4 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleEditCharacter}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-stone-500 transition hover:bg-stone-800 hover:text-amber-400"
            title="捏脸"
          >
            ✏️
          </button>
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-stone-500 transition hover:bg-stone-800 hover:text-amber-400"
            title="个人档案"
          >
            📊
          </Link>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-12 w-12 items-end justify-center overflow-hidden rounded-full bg-stone-800 ring-2 ring-stone-700">
            {session.user.avatar && (
              <span
                className="grid h-12 w-12 place-items-center rounded-full text-2xl"
                style={{ backgroundColor: session.user.avatar.color }}
              >
                {session.user.avatar.icon}
              </span>
            )}
          </div>
          <span className="max-w-[64px] truncate text-center text-[10px] text-stone-500">
            {session.user.name}
          </span>
        </div>
      </aside>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <h1 className="text-3xl font-extrabold tracking-wide text-amber-400">
          HistoGuessr
        </h1>

        <div className="relative flex flex-col items-center">
          <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-amber-500/10 blur-3xl" />

          <button
            type="button"
            onClick={handleEditCharacter}
            className="group relative rounded-[2rem] border border-stone-700/80 bg-gradient-to-b from-stone-900/90 to-stone-950 px-10 pb-6 pt-8 shadow-2xl shadow-black/40 transition hover:border-amber-500/40 hover:shadow-amber-950/20"
            aria-label="编辑形象"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[2rem] bg-gradient-to-b from-amber-300/10 to-transparent" />
            <div className="pointer-events-none absolute bottom-5 left-1/2 h-4 w-32 -translate-x-1/2 rounded-full bg-black/40 blur-md" />
            <CharacterSVG config={character ?? undefined} size={220} view="full" />
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-stone-950/70 px-2.5 py-1 text-[10px] font-medium text-amber-300 opacity-0 transition group-hover:opacity-100">
              点击编辑
            </span>
          </button>

          <div className="relative z-10 mt-4 flex flex-col items-center gap-2">
            <p className="text-xl font-bold text-stone-100">{session.user.name}</p>
            <button
              type="button"
              onClick={handleEditCharacter}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-500/20 hover:text-amber-200"
            >
              编辑形象
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setSelectedMode("solo")}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-8 py-5 transition ${
              selectedMode === "solo"
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-600 hover:bg-stone-700"
            }`}
          >
            <span className="text-3xl">🧭</span>
            <span className="font-bold">个人模式</span>
            <span className="text-xs opacity-70">挑战自我最高分</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMode("battle")}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-8 py-5 transition ${
              selectedMode === "battle"
                ? "border-red-500 bg-red-500/10 text-red-400"
                : "border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-600 hover:bg-stone-700"
            }`}
          >
            <span className="text-3xl">⚔️</span>
            <span className="font-bold">对战模式</span>
            <span className="text-xs opacity-70">邀请朋友 PK</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className={`w-64 rounded-2xl py-4 text-lg font-extrabold shadow-lg transition active:scale-95 ${
            selectedMode === "solo"
              ? "bg-amber-500 text-stone-900 hover:bg-amber-400"
              : "bg-red-500 text-white hover:bg-red-400"
          }`}
        >
          开始游戏 →
        </button>
      </main>
    </div>
  );
}
