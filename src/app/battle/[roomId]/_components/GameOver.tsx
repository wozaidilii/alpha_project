"use client";

import Link from "next/link";
import { type BattlePlayer, type BattleRoundResult } from "~/types/battle";
import { formatYear } from "~/lib/scoring";

interface Props {
  players: Record<string, BattlePlayer>;
  results: BattleRoundResult[];
  myId: string;
}

export function GameOverView({ players, results, myId }: Props) {
  const playerIds = Object.keys(players);
  const totalScores: Record<string, number> = {};
  for (const id of playerIds) totalScores[id] = 0;
  for (const r of results) {
    for (const [pid, g] of Object.entries(r.guesses)) {
      totalScores[pid] = (totalScores[pid] ?? 0) + g.total;
    }
  }

  // winner = most HP remaining; tie → higher total score
  const sortedPlayers = [...Object.values(players)].sort((a, b) => {
    if (b.hp !== a.hp) return b.hp - a.hp;
    return (totalScores[b.id] ?? 0) - (totalScores[a.id] ?? 0);
  });

  const winner = sortedPlayers[0]!;
  const iWon = winner.id === myId;

  return (
    <div className="flex min-h-screen flex-col bg-stone-900 text-white">
      <div className="border-b border-stone-700 px-6 py-3">
        <h1 className="font-bold text-red-400">⚔️ 对战</h1>
      </div>

      <div className="mx-auto w-full max-w-lg px-6 py-8">
        {/* Winner banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-red-900/40 to-stone-800 p-8 text-center">
          <div className="mb-2 text-6xl">{iWon ? "🏆" : "💀"}</div>
          <div className="text-2xl font-extrabold text-amber-400">
            {iWon ? "你赢了！" : `${winner.name} 获胜！`}
          </div>
          <div className="mt-1 text-stone-400">
            剩余血量 {winner.hp} HP
          </div>
        </div>

        {/* Player final scores */}
        <h3 className="mb-3 font-semibold text-stone-300">最终结果</h3>
        <div className="mb-6 space-y-3">
          {sortedPlayers.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-xl px-5 py-4 ${
                p.id === myId ? "bg-amber-900/30 ring-1 ring-amber-500" : "bg-stone-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{i === 0 ? "🥇" : "🥈"}</span>
                <div>
                  <div className="font-bold">
                    {p.name}{p.id === myId && <span className="ml-1 text-xs text-amber-400">(你)</span>}
                  </div>
                  <div className="text-sm text-stone-400">剩余 {p.hp} HP</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-white">
                  {(totalScores[p.id] ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-stone-500">总得分</div>
              </div>
            </div>
          ))}
        </div>

        {/* Round-by-round */}
        {results.length > 0 && (
          <>
            <h3 className="mb-3 font-semibold text-stone-300">各轮回顾</h3>
            <div className="mb-6 space-y-2">
              {results.map((r, i) => {
                const winner = playerIds.reduce((best, id) =>
                  (r.guesses[id]?.total ?? 0) > (r.guesses[best]?.total ?? 0) ? id : best,
                  playerIds[0]!,
                );
                return (
                  <div key={i} className="rounded-lg bg-stone-800 px-4 py-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-amber-300">{r.event.title}</span>
                      <span className="text-stone-400">{formatYear(r.event.year)}</span>
                    </div>
                    <div className="mt-1 flex gap-4 text-stone-400">
                      {playerIds.map((pid) => (
                        <span key={pid} className={pid === winner ? "font-bold text-white" : ""}>
                          {players[pid]?.name}: {(r.guesses[pid]?.total ?? 0).toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex gap-3">
          <Link
            href="/battle"
            className="flex-1 rounded-xl bg-red-500 py-3 text-center font-bold text-white transition hover:bg-red-400"
          >
            再来一局 ⚔️
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-xl bg-stone-700 py-3 text-center font-bold text-stone-300 transition hover:bg-stone-600"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
