"use client";

import Link from "next/link";

export default function GameModePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-white">
      <div className="flex w-full max-w-2xl flex-col gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-amber-400">
            选择游戏模式
          </h1>
          <p className="mt-2 text-stone-400">
            先选择个人挑战或好友对战，再进入对应玩法
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/game/solo"
            className="group flex min-h-[180px] flex-col justify-between rounded-2xl border border-stone-700 bg-stone-800 px-6 py-5 text-left transition hover:border-amber-500 hover:bg-stone-700 focus:ring-2 focus:ring-amber-300 focus:outline-none"
          >
            <span className="text-4xl">🎯</span>
            <div>
              <div className="text-xl font-bold text-amber-300">个人模式</div>
              <div className="text-sm text-stone-300">
                单人答题、图寻和历史图寻
              </div>
              <div className="mt-3 text-xs leading-5 text-stone-500">
                进入后选择历史地理、冷知识、图寻或历史图寻。
              </div>
            </div>
          </Link>

          <Link
            href="/battle"
            className="group flex min-h-[180px] flex-col justify-between rounded-2xl border border-stone-700 bg-stone-800 px-6 py-5 text-left transition hover:border-red-500 hover:bg-stone-700 focus:ring-2 focus:ring-red-300 focus:outline-none"
          >
            <span className="text-4xl">⚔️</span>
            <div>
              <div className="text-xl font-bold text-red-300">对战模式</div>
              <div className="text-sm text-stone-300">
                创建或加入房间，与朋友 PK
              </div>
              <div className="mt-3 text-xs leading-5 text-stone-500">
                选择题型、轮数、时间和血量后开始房间对战。
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
