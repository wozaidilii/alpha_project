import Link from "next/link";
import { GAME_MODE_LIST } from "~/lib/game-mode";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-white">
      <div className="flex flex-col items-center gap-8 px-4 text-center">
        <div className="text-7xl">🗺️</div>
        <h1 className="text-5xl font-extrabold tracking-tight text-amber-400">
          HistoGuessr
        </h1>
        <p className="max-w-md text-stone-400">
          历史地理、回忆杀、网络哏——三种模式任选，猜对年份唤起共鸣
        </p>

        <div className="mt-2 flex w-full max-w-sm flex-col gap-4">
          <Link
            href="/profile"
            className="group flex flex-col items-center gap-2 rounded-2xl border border-stone-700 bg-stone-800 px-8 py-6 transition hover:border-emerald-500 hover:bg-stone-700"
          >
            <span className="text-4xl">🏛️</span>
            <span className="text-xl font-bold text-emerald-400">个人档案</span>
            <span className="text-sm text-stone-400">
              编辑形象，查看历史战绩
            </span>
          </Link>

          <div className="rounded-2xl border border-stone-700 bg-stone-800/50 p-4">
            <h2 className="mb-3 text-sm font-semibold text-stone-400">
              个人模式 · 选择类型
            </h2>
            <div className="flex flex-col gap-3">
              {GAME_MODE_LIST.map((mode) => (
                <Link
                  key={mode.slug}
                  href={`/game/${mode.slug}`}
                  className={`flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-left transition hover:bg-stone-700 ${mode.borderHoverClass}`}
                >
                  <span className="text-2xl">{mode.emoji}</span>
                  <div>
                    <div className={`font-bold ${mode.accentClass}`}>
                      {mode.title}
                    </div>
                    <div className="text-xs text-stone-500">{mode.tagline}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/battle"
            className="group flex flex-col items-center gap-2 rounded-2xl border border-stone-700 bg-stone-800 px-8 py-6 transition hover:border-red-500 hover:bg-stone-700"
          >
            <span className="text-4xl">⚔️</span>
            <span className="text-xl font-bold text-red-400">对战模式</span>
            <span className="text-sm text-stone-400">
              历史地理题 · 创建房间邀请朋友 PK
            </span>
          </Link>
        </div>

        <p className="text-xs text-stone-600">每局 5 轮 · 单轮满分 10,000</p>
      </div>
    </main>
  );
}
