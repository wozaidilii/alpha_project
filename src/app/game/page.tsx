"use client";

import Link from "next/link";
import { GAME_MODE_LIST } from "~/lib/game-mode";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";

export default function GameModePage() {
  const { ready } = useCompletedPlayerSession();

  if (!ready) return <AuthLoading />;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-white">
      <div className="flex w-full max-w-lg flex-col gap-6 px-4">
        <Link
          href="/"
          className="text-sm text-stone-400 transition hover:text-white"
        >
          ← 返回首页
        </Link>

        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-amber-400">
            选择游戏类型
          </h1>
          <p className="mt-2 text-stone-400">
            每种模式独立进行，每局只包含同一类型的题目
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {GAME_MODE_LIST.map((mode) => (
            <Link
              key={mode.slug}
              href={`/game/${mode.slug}`}
              className={`group flex items-center gap-4 rounded-2xl border border-stone-700 bg-stone-800 px-6 py-5 transition hover:bg-stone-700 ${mode.borderHoverClass}`}
            >
              <span className="text-4xl">{mode.emoji}</span>
              <div className="text-left">
                <div className={`text-xl font-bold ${mode.accentClass}`}>
                  {mode.title}
                </div>
                <div className="text-sm text-stone-300">{mode.description}</div>
                <div className="mt-1 text-xs text-stone-500">
                  {mode.tagline}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
