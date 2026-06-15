"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { type BattlePlayer, type BattleRoundResult } from "~/types/battle";
import { type BattleOutcome } from "~/types/player";
import { formatYear } from "~/lib/scoring";
import { getQuestionResultSubtitle } from "~/lib/question-utils";
import { isFunfactQuestion } from "~/types/question";
import { getStoredPlayerSession } from "~/lib/player-session";
import { api } from "~/trpc/react";
import { CharacterPortrait } from "~/components/CharacterPortrait";

interface Props {
  roomId: string;
  players: Record<string, BattlePlayer>;
  results: BattleRoundResult[];
  myId: string;
}

export function GameOverView({ roomId, players, results, myId }: Props) {
  const recordBattle = api.player.recordBattle.useMutation();
  const recordedRef = useRef(false);
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
  const me = players[myId];
  const opponent = Object.values(players).find((p) => p.id !== myId);
  const myScore = totalScores[myId] ?? 0;
  const opponentScore = opponent ? (totalScores[opponent.id] ?? 0) : 0;
  const myOutcome: BattleOutcome = (() => {
    if (!me || !opponent) return "draw";
    if (me.hp !== opponent.hp) return me.hp > opponent.hp ? "win" : "loss";
    if (myScore !== opponentScore)
      return myScore > opponentScore ? "win" : "loss";
    return "draw";
  })();

  useEffect(() => {
    if (recordedRef.current || !me || !opponent || results.length === 0) return;

    const session = getStoredPlayerSession();
    if (!session) return;
    if (me.userId && session.user.id !== me.userId) return;

    recordedRef.current = true;
    recordBattle.mutate({
      token: session.token,
      roomId,
      outcome: myOutcome,
      opponentName: opponent.name,
      opponentAvatar: opponent.avatar,
      totalScore: myScore,
      opponentScore,
      remainingHp: me.hp,
      opponentHp: opponent.hp,
      roundsPlayed: results.length,
    });
  }, [
    me,
    myOutcome,
    myScore,
    opponent,
    opponentScore,
    recordBattle,
    results.length,
    roomId,
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-stone-900 text-white">
      <div className="border-b border-stone-700 px-6 py-3">
        <h1 className="font-bold text-red-400">⚔️ 对战</h1>
      </div>

      <div className="mx-auto w-full max-w-lg px-6 py-8">
        {/* Winner banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-red-900/40 to-stone-800 p-8 text-center">
          <div className="mx-auto mb-3 flex h-24 w-24 items-end justify-center overflow-hidden rounded-full bg-stone-700">
            {winner.character ? (
              <div className="relative h-full w-full">
                <CharacterPortrait config={winner.character} variant="avatar" />
              </div>
            ) : (
              <div
                className="grid h-24 w-24 place-items-center rounded-full text-5xl"
                style={{ backgroundColor: winner.avatar.color }}
              >
                {winner.avatar.icon}
              </div>
            )}
          </div>
          <div className="text-2xl font-extrabold text-amber-400">
            {iWon ? "你赢了！" : `${winner.name} 获胜！`}
          </div>
          <div className="mt-1 text-stone-400">剩余血量 {winner.hp} HP</div>
        </div>

        {/* Player final scores */}
        <h3 className="mb-3 font-semibold text-stone-300">最终结果</h3>
        <div className="mb-6 space-y-3">
          {sortedPlayers.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-xl px-5 py-4 ${
                p.id === myId
                  ? "bg-amber-900/30 ring-1 ring-amber-500"
                  : "bg-stone-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{i === 0 ? "🥇" : "🥈"}</span>
                <div className="flex h-10 w-10 items-end justify-center overflow-hidden rounded-full bg-stone-700">
                  {p.character ? (
                    <div className="relative h-full w-full">
                      <CharacterPortrait
                        config={p.character}
                        variant="avatar"
                      />
                    </div>
                  ) : (
                    <span
                      className="grid h-10 w-10 place-items-center rounded-full text-xl"
                      style={{ backgroundColor: p.avatar.color }}
                    >
                      {p.avatar.icon}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold">
                    {p.name}
                    {p.id === myId && (
                      <span className="ml-1 text-xs text-amber-400">(你)</span>
                    )}
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

        {recordBattle.isSuccess && (
          <p className="mb-6 text-center text-sm text-green-400">战绩已记录</p>
        )}
        {recordBattle.isError && (
          <p className="mb-6 text-center text-sm text-red-400">
            战绩记录失败，请返回大厅重新登录后再试
          </p>
        )}

        {/* Round-by-round */}
        {results.length > 0 && (
          <>
            <h3 className="mb-3 font-semibold text-stone-300">各轮回顾</h3>
            <div className="mb-6 space-y-2">
              {results.map((r, i) => {
                const winner = playerIds.reduce(
                  (best, id) =>
                    (r.guesses[id]?.total ?? 0) > (r.guesses[best]?.total ?? 0)
                      ? id
                      : best,
                  playerIds[0]!,
                );
                return (
                  <div
                    key={i}
                    className="rounded-lg bg-stone-800 px-4 py-3 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-amber-300">
                        {r.question.title}
                      </span>
                      {!isFunfactQuestion(r.question) &&
                        r.question.year !== 0 && (
                          <span className="text-stone-400">
                            {formatYear(r.question.year)}
                          </span>
                        )}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {getQuestionResultSubtitle(r.question)}
                    </div>
                    <div className="mt-1 flex gap-4 text-stone-400">
                      {playerIds.map((pid) => (
                        <span
                          key={pid}
                          className={
                            pid === winner ? "font-bold text-white" : ""
                          }
                        >
                          {players[pid]?.name}:{" "}
                          {(r.guesses[pid]?.total ?? 0).toLocaleString()}
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
            href="/game"
            className="flex-1 rounded-xl bg-stone-700 py-3 text-center font-bold text-stone-300 transition hover:bg-stone-600"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
