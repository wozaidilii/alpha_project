import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-white">
      <div className="flex flex-col items-center gap-6 px-4 text-center">
        <div className="text-7xl">🗺️</div>
        <h1 className="text-5xl font-extrabold tracking-tight text-amber-400">
          HistoGuessr
        </h1>
        <p className="max-w-md text-lg text-stone-300">
          猜猜这个历史事件发生在哪里、哪一年？
          <br />
          地点 + 年份双重挑战，综合评分！
        </p>
        <Link
          href="/game"
          className="mt-4 rounded-xl bg-amber-500 px-10 py-4 text-xl font-bold text-stone-900 transition hover:bg-amber-400"
        >
          开始游戏 →
        </Link>
        <p className="text-sm text-stone-500">每局 5 道题 · 满分 50,000</p>
      </div>
    </main>
  );
}
