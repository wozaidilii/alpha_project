"use client";

import { type RoundData } from "~/app/game/page";
import { formatYear } from "~/lib/scoring";

interface Props {
  rounds: RoundData[];
  onRestart: () => void;
}

function getRank(total: number): { label: string; emoji: string } {
  if (total >= 45000) return { label: "历史学家", emoji: "🏆" };
  if (total >= 35000) return { label: "历史达人", emoji: "🥇" };
  if (total >= 25000) return { label: "历史爱好者", emoji: "🥈" };
  if (total >= 15000) return { label: "历史学徒", emoji: "🥉" };
  return { label: "历史小白", emoji: "📚" };
}

export function FinalScore({ rounds, onRestart }: Props) {
  const grandTotal = rounds.reduce((sum, r) => sum + r.total, 0);
  const maxPossible = rounds.length * 10000;
  const pct = Math.round((grandTotal / maxPossible) * 100);
  const rank = getRank(grandTotal);

  return (
    <div className="flex min-h-screen flex-col bg-stone-900 text-white">
      {/* Header */}
      <div className="border-b border-stone-700 px-6 py-3">
        <h1 className="text-xl font-bold text-amber-400">HistoGuessr</h1>
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        {/* Grand total */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-amber-600/30 to-stone-800 p-8 text-center">
          <div className="mb-2 text-5xl">{rank.emoji}</div>
          <div className="mb-1 text-2xl font-bold text-amber-400">
            {rank.label}
          </div>
          <div className="text-7xl font-extrabold text-white">
            {grandTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-stone-400">
            / {maxPossible.toLocaleString()} 分 · {pct}%
          </div>
        </div>

        {/* Round breakdown */}
        <h3 className="mb-3 font-semibold text-stone-300">各轮详情</h3>
        <div className="space-y-3">
          {rounds.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-stone-800 px-4 py-3"
            >
              <div>
                <div className="font-medium text-amber-300">{r.event.title}</div>
                <div className="text-xs text-stone-400">
                  {formatYear(r.event.year)} · {r.event.location}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white">
                  {r.total.toLocaleString()}
                </div>
                <div className="text-xs text-stone-500">
                  📍{r.locationPts.toLocaleString()} + 📅{r.yearPts.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="mt-8 w-full rounded-xl bg-amber-500 py-3 font-bold text-stone-900 transition hover:bg-amber-400"
        >
          🔄 再来一局
        </button>
      </div>
    </div>
  );
}
