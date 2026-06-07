"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";
import { CharacterSVG } from "~/components/CharacterSVG";
import {
  type CharacterConfig,
  CHARACTER_STORAGE_KEY,
  deserializeCharacter,
} from "~/types/character";

type GameMode = "solo" | "battle";

export default function Home() {
  const router = useRouter();
  const { ready, session } = useCompletedPlayerSession();

  const [character, setCharacter] = useState<CharacterConfig | null>(null);
  const [characterChecked, setCharacterChecked] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>("solo");
  const redirectedRef = useRef(false);

  // Load character from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (stored) setCharacter(deserializeCharacter(stored));
    setCharacterChecked(true);
  }, []);

  // Force character creation if none exists
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

  // Show loading while auth or character not yet checked
  if (!ready || !characterChecked || (!character && ready)) {
    return <AuthLoading />;
  }

  if (!session) return <AuthLoading />;

  return (
    <div className="flex h-screen overflow-hidden bg-stone-950 text-white">
      {/* ── Left Sidebar ── */}
      <aside className="flex w-20 flex-col items-center border-r border-stone-800 bg-stone-900 py-5">
        {/* Logo */}
        <div className="text-3xl" title="HistoGuessr">🗺️</div>

        <div className="flex-1" />

        {/* Nav icons */}
        <div className="mb-4 flex flex-col items-center gap-3">
          <Link
            href="/character"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-stone-500 transition hover:bg-stone-800 hover:text-amber-400"
            title="捏脸"
          >
            ✏️
          </Link>
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-stone-500 transition hover:bg-stone-800 hover:text-amber-400"
            title="个人档案"
          >
            📊
          </Link>
        </div>

        {/* Avatar at bottom */}
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

      {/* ── Main content ── */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        {/* Title */}
        <h1 className="text-3xl font-extrabold tracking-wide text-amber-400">
          HistoGuessr
        </h1>

        {/* Character (center-piece) */}
        <div className="relative flex flex-col items-center">
          {/* Glow backdrop */}
          <div className="absolute bottom-0 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

          <div className="relative">
            <CharacterSVG config={character ?? undefined} size={220} view="full" />
          </div>

          <p className="mt-2 text-lg font-semibold text-stone-300">
            {session.user.name}
          </p>
        </div>

        {/* Mode selection */}
        <div className="flex gap-4">
          <button
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

        {/* Start button */}
        <button
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
