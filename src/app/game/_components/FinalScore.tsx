"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { type RoundData } from "~/types/game";
import { requiresMap } from "~/types/question";
import { type GameModeConfig } from "~/lib/game-mode";
import { getQuestionResultSubtitle } from "~/lib/question-utils";
import { formatYear } from "~/lib/scoring";
import {
  getStoredPlayerSession,
  savePlayerSession,
} from "~/lib/player-session";
import { DEFAULT_AVATAR } from "~/types/player";
import { api } from "~/trpc/react";

interface Props {
  rounds: RoundData[];
  gameMode: GameModeConfig;
  onRestart: () => void;
}

function getRank(total: number): { label: string; emoji: string } {
  if (total >= 45000) return { label: "记忆大师", emoji: "🏆" };
  if (total >= 35000) return { label: "时代达人", emoji: "🥇" };
  if (total >= 25000) return { label: "共鸣高手", emoji: "🥈" };
  if (total >= 15000) return { label: "怀旧学徒", emoji: "🥉" };
  return { label: "新手上路", emoji: "📚" };
}

export function FinalScore({ rounds, gameMode, onRestart }: Props) {
  const login = api.player.login.useMutation();
  const updateSoloHighScore = api.player.updateSoloHighScore.useMutation();
  const recordedRef = useRef(false);
  const grandTotal = rounds.reduce((sum, r) => sum + r.total, 0);
  const maxPossible = rounds.length * 10000;
  const pct = Math.round((grandTotal / maxPossible) * 100);
  const rank = getRank(grandTotal);

  useEffect(() => {
    if (recordedRef.current || rounds.length === 0) return;

    recordedRef.current = true;
    void (async () => {
      try {
        const stored = getStoredPlayerSession();
        const session =
          stored ??
          (await login.mutateAsync({
            name: "玩家",
            avatar: DEFAULT_AVATAR,
          }));
        if (!stored) savePlayerSession(session);

        const user = await updateSoloHighScore.mutateAsync({
          token: session.token,
          score: grandTotal,
        });
        savePlayerSession({ token: session.token, user });
      } catch {
        // Keep the score screen usable even if the profile service is unavailable.
      }
    })();
  }, [grandTotal, login, rounds.length, updateSoloHighScore]);

  return (
    <div className="flex min-h-screen flex-col bg-stone-900 text-white">
      <div className="flex items-center justify-between border-b border-stone-700 px-6 py-3">
        <h1 className={`text-xl font-bold ${gameMode.accentClass}`}>
          {gameMode.emoji} {gameMode.title}
        </h1>
        <Link
          href="/"
          className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-300 transition hover:bg-stone-700"
        >
          退出
        </Link>
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
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

        <h3 className="mb-3 font-semibold text-stone-300">各轮详情</h3>
        <div className="space-y-3">
          {rounds.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-stone-800 px-4 py-3"
            >
              <div>
                <div className="font-medium text-amber-300">
                  {r.question.title}
                </div>
                <div className="text-xs text-stone-400">
                  {formatYear(r.question.year)} ·{" "}
                  {getQuestionResultSubtitle(r.question)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white">
                  {r.total.toLocaleString()}
                </div>
                <div className="text-xs text-stone-500">
                  {requiresMap(r.question)
                    ? `📍${r.locationPts.toLocaleString()} + 📅${r.yearPts.toLocaleString()}`
                    : `📅${r.yearPts.toLocaleString()}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {updateSoloHighScore.isSuccess && (
          <p className="mt-6 text-center text-sm text-green-400">
            个人最高分已更新
          </p>
        )}

        <div className="mt-8 flex gap-3">
          <button
            onClick={onRestart}
            className="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-stone-900 transition hover:bg-amber-400"
          >
            🔄 再来一局
          </button>
          <Link
            href="/"
            className="flex-1 rounded-xl bg-stone-700 py-3 text-center font-bold text-stone-300 transition hover:bg-stone-600"
          >
            退出
          </Link>
        </div>
      </div>
    </div>
  );
}
