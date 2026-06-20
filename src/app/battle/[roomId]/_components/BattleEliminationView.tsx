"use client";

import { type BattlePlayer, type BattleRoundResult } from "~/types/battle";
import { type AnimeLocale } from "~/lib/anime-locale";
import {
  areBattlePlayersReady,
  getRoundEliminatedPlayerIds,
  isBattlePlayerAlive,
} from "~/lib/battle-flow";
import { getBattleCopy } from "~/lib/battle-copy";

interface Props {
  result: BattleRoundResult;
  players: Record<string, BattlePlayer>;
  myId: string;
  roundReady: Record<string, boolean>;
  locale: AnimeLocale;
  onReady: () => void;
}

export function BattleEliminationView({
  result,
  players,
  myId,
  roundReady,
  locale,
  onReady,
}: Props) {
  const copy = getBattleCopy(locale);
  const eliminatedIds = getRoundEliminatedPlayerIds(result);
  const iAmEliminated = eliminatedIds.includes(myId);
  const iAmReady = roundReady[myId] === true;
  const allActiveReady = areBattlePlayersReady(players, roundReady);

  return (
    <div className="anime-shell flex min-h-screen flex-col items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="text-sm font-semibold tracking-[0.24em] text-red-200/70 uppercase">
            {copy.eliminationTitle}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold text-red-100">
            {copy.roundResultSubtitle(result.roundIndex + 1)}
          </h1>
          <p className="mt-3 text-sm leading-6 text-pink-100/70">
            {copy.eliminationSubtitle}
          </p>
        </div>

        <div className="mb-6 space-y-3">
          {eliminatedIds.map((playerId) => {
            const player = players[playerId];
            if (!player) return null;
            const isMe = playerId === myId;

            return (
              <div
                key={playerId}
                className={`anime-panel flex items-center gap-4 p-4 ${
                  isMe ? "ring-1 ring-red-300/60" : ""
                }`}
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-xl"
                  style={{ backgroundColor: player.avatar.color }}
                >
                  {player.avatar.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-bold text-white">
                    {player.name}
                    {isMe && (
                      <span className="ml-2 text-xs font-semibold text-red-200">
                        ({copy.me})
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-red-200">
                    {copy.playerEliminated(player.name)}
                  </div>
                </div>
                <span className="text-2xl" aria-hidden="true">
                  💀
                </span>
              </div>
            );
          })}
        </div>

        {iAmEliminated && (
          <p className="anime-panel mb-4 px-4 py-3 text-center text-sm text-pink-100/75">
            {copy.youEliminated}
          </p>
        )}

        <p className="mb-4 text-center text-sm text-pink-100/55">
          {copy.eliminationSpectateHint}
        </p>

        <div className="mb-4 flex flex-wrap justify-center gap-3">
          {Object.keys(players)
            .filter((playerId) => isBattlePlayerAlive(players[playerId]))
            .map((playerId) => (
              <span
                key={playerId}
                className={`rounded-full px-3 py-1 text-xs ${
                  roundReady[playerId]
                    ? "bg-green-400/15 text-green-200"
                    : "bg-white/8 text-pink-100/55"
                }`}
              >
                {players[playerId]?.name}
                {roundReady[playerId] ? ` ✓ ${copy.ready}` : ` · ${copy.notReady}`}
              </span>
            ))}
        </div>

        <button
          onClick={onReady}
          disabled={iAmReady || allActiveReady}
          className={`w-full rounded-xl py-3 font-bold transition ${
            iAmReady
              ? "cursor-default bg-green-500/20 text-green-200"
              : "bg-red-400 text-zinc-950 hover:bg-red-300"
          }`}
        >
          {iAmReady ? copy.eliminationWaiting : copy.eliminationContinue}
        </button>

        {allActiveReady && (
          <p className="mt-3 text-center text-sm text-cyan-100">
            {copy.allReady}
          </p>
        )}
      </div>
    </div>
  );
}
