import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-white">
      <div className="flex flex-col items-center gap-8 px-4 text-center">
        <div className="text-7xl">🗺️</div>
        <h1 className="text-5xl font-extrabold tracking-tight text-amber-400">
          HistoGuessr
        </h1>
        <p className="max-w-md text-stone-400">
          猜猜这个历史事件发生在哪里、哪一年？地点 + 年份双重挑战
        </p>

        <div className="mt-2 flex w-full max-w-sm flex-col gap-4">
          {/* Profile */}
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

          {/* Solo */}
          <Link
            href="/game"
            className="group flex flex-col items-center gap-2 rounded-2xl border border-stone-700 bg-stone-800 px-8 py-6 transition hover:border-amber-500 hover:bg-stone-700"
          >
            <span className="text-4xl">🧭</span>
            <span className="text-xl font-bold text-amber-400">个人模式</span>
            <span className="text-sm text-stone-400">
              5 轮历史事件，挑战自我最高分
            </span>
          </Link>

          {/* Battle */}
          <Link
            href="/battle"
            className="group flex flex-col items-center gap-2 rounded-2xl border border-stone-700 bg-stone-800 px-8 py-6 transition hover:border-red-500 hover:bg-stone-700"
          >
            <span className="text-4xl">⚔️</span>
            <span className="text-xl font-bold text-red-400">对战模式</span>
            <span className="text-sm text-stone-400">
              创建房间邀请朋友，血量制 PK
            </span>
          </Link>
        </div>

        <p className="text-xs text-stone-600">满分 50,000 · 历史知识大挑战</p>
      </div>
    </main>
  );
}
