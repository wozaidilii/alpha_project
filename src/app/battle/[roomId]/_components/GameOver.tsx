"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { type BattlePlayer, type BattleRoundResult } from "~/types/battle";
import { type BattleOutcome } from "~/types/player";
import { formatYear } from "~/lib/scoring";
import {
  getBattleQuestionSubtitle,
  getBattleQuestionTitle,
  getBattleQuestionYear,
} from "~/lib/battle-question";
import { getStoredPlayerSession } from "~/lib/player-session";
import { api } from "~/trpc/react";
import { CharacterPortrait } from "~/components/CharacterPortrait";
import { type AnimeLocale, withAnimeLocale } from "~/lib/anime-locale";
import { getBattleCopy } from "~/lib/battle-copy";

interface Props {
  roomId: string;
  players: Record<string, BattlePlayer>;
  results: BattleRoundResult[];
  myId: string;
  locale: AnimeLocale;
}

export function GameOverView({ roomId, players, results, myId, locale }: Props) {
  const copy = getBattleCopy(locale);
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
  const me = players[myId];
  const opponents = sortedPlayers.filter((p) => p.id !== myId);
  const topHp = winner.hp;
  const topScore = totalScores[winner.id] ?? 0;
  const leaderIds = sortedPlayers
    .filter((p) => p.hp === topHp && (totalScores[p.id] ?? 0) === topScore)
    .map((p) => p.id);
  const representativeOpponent =
    opponents.find((p) => leaderIds.includes(p.id)) ?? opponents[0];
  const opponentSummaryName =
    opponents.length > 1
      ? opponents.map((p) => p.name).join(" / ")
      : (representativeOpponent?.name ?? "");
  const myScore = totalScores[myId] ?? 0;
  const opponentScore = opponents.length
    ? Math.max(...opponents.map((p) => totalScores[p.id] ?? 0))
    : 0;
  const opponentHp = opponents.length
    ? Math.max(...opponents.map((p) => p.hp))
    : 0;
  const myOutcome: BattleOutcome = (() => {
    if (!me || opponents.length === 0) return "draw";
    if (!leaderIds.includes(myId)) return "loss";
    return leaderIds.length === 1 ? "win" : "draw";
  })();
  const winnerTitle = leaderIds.includes(myId)
    ? leaderIds.length === 1
      ? copy.youWin
      : copy.tiedFirst
    : copy.playerWins(winner.name);

  useEffect(() => {
    if (
      recordedRef.current ||
      !me ||
      !representativeOpponent ||
      results.length === 0
    ) {
      return;
    }

    const session = getStoredPlayerSession();
    if (!session) return;
    if (me.userId && session.user.id !== me.userId) return;

    recordedRef.current = true;
    recordBattle.mutate({
      token: session.token,
      roomId,
      outcome: myOutcome,
      opponentName: opponentSummaryName,
      opponentAvatar: representativeOpponent.avatar,
      totalScore: myScore,
      opponentScore,
      remainingHp: me.hp,
      opponentHp,
      roundsPlayed: results.length,
    });
  }, [
    me,
    myOutcome,
    myScore,
    opponentHp,
    opponentSummaryName,
    opponentScore,
    recordBattle,
    representativeOpponent,
    results.length,
    roomId,
  ]);

  return (
    <div className="anime-shell flex min-h-screen flex-col text-white">
      <div className="border-b border-white/10 bg-[#0d081a]/90 px-6 py-3 backdrop-blur">
        <h1 className="font-bold text-pink-100">{copy.gameOverTitle}</h1>
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        {/* Winner banner */}
        <div className="anime-panel mb-8 p-8 text-center">
          <div className="mx-auto mb-3 flex h-24 w-24 items-end justify-center overflow-hidden rounded-full bg-white/10">
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
          <div className="text-2xl font-extrabold text-pink-100">
            {winnerTitle}
          </div>
          <div className="mt-1 text-pink-100/60">
            {copy.remainingHp(winner.hp)}
          </div>
        </div>

        {/* Player final scores */}
        <h3 className="mb-3 font-semibold text-pink-100">
          {copy.finalResults}
        </h3>
        <div className="mb-6 space-y-3">
          {sortedPlayers.map((p, i) => (
            <div
              key={p.id}
              className={`anime-panel flex items-center justify-between px-5 py-4 ${
                p.id === myId ? "ring-1 ring-pink-300/60" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="min-w-9 rounded-full bg-white/8 px-2 py-1 text-center text-xs font-bold text-cyan-100">
                  #{i + 1}
                </span>
                <div className="flex h-10 w-10 items-end justify-center overflow-hidden rounded-full bg-white/10">
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
                      <span className="ml-1 text-xs text-amber-400">
                        ({copy.me})
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-pink-100/55">
                    {copy.remaining(p.hp)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-white">
                  {(totalScores[p.id] ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-pink-100/45">
                  {copy.totalScore}
                </div>
              </div>
            </div>
          ))}
        </div>

        {recordBattle.isSuccess && (
          <p className="mb-6 text-center text-sm text-green-300">
            {copy.battleRecorded}
          </p>
        )}
        {recordBattle.isError && (
          <p className="mb-6 text-center text-sm text-red-200">
            {copy.battleRecordFailed}
          </p>
        )}

        {/* Round-by-round */}
        {results.length > 0 && (
          <>
            <h3 className="mb-3 font-semibold text-pink-100">
              {copy.roundReview}
            </h3>
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
                    className="anime-panel rounded-lg px-4 py-3 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-cyan-100">
                        {getBattleQuestionTitle(r.question)}
                      </span>
                      {getBattleQuestionYear(r.question) !== null &&
                        getBattleQuestionYear(r.question) !== 0 && (
                          <span className="text-pink-100/55">
                            {formatYear(getBattleQuestionYear(r.question)!)}
                          </span>
                        )}
                    </div>
                    <div className="mt-0.5 text-xs text-pink-100/45">
                      {getBattleQuestionSubtitle(r.question)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-pink-100/60">
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
            href={withAnimeLocale("/battle", locale)}
            className="anime-button flex-1"
          >
            {copy.playAgain}
          </Link>
          <Link
            href={withAnimeLocale("/", locale)}
            className="anime-button-secondary flex-1"
          >
            {copy.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
