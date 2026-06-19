"use client";

import { type BattlePlayer } from "~/types/battle";
import { CharacterPortrait } from "~/components/CharacterPortrait";

interface Props {
  player: BattlePlayer;
  flipped: boolean;
  isMe?: boolean;
  submitted?: boolean;
}

export function HPBar({
  player,
  flipped,
  isMe = false,
  submitted = false,
}: Props) {
  const pct = Math.max(0, player.hp);
  const barColor =
    pct > 50 ? "bg-green-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";

  return (
    <div
      className={`flex min-h-11 items-center gap-2 rounded-full border px-2.5 py-1.5 ${
        isMe
          ? "border-pink-300/50 bg-pink-300/12"
          : "border-white/10 bg-white/6"
      } ${flipped ? "flex-row-reverse" : ""}`}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
        {player.character ? (
          <div className="relative h-full w-full">
            <CharacterPortrait config={player.character} variant="avatar" />
          </div>
        ) : (
          <span
            className="grid h-8 w-8 place-items-center rounded-full text-sm"
            style={{ backgroundColor: player.avatar.color }}
          >
            {player.avatar.icon}
          </span>
        )}
      </div>

      <span className="max-w-[72px] truncate text-xs text-pink-50">
        {player.name}
      </span>

      <div className="relative h-2.5 w-20 overflow-hidden rounded-full bg-white/10">
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-500 ${barColor} ${flipped ? "right-0" : "left-0"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="min-w-[28px] text-xs font-bold text-white">
        {player.hp}
      </span>
      {submitted && (
        <span className="rounded-full bg-green-400/15 px-1.5 py-0.5 text-[10px] font-bold text-green-200">
          OK
        </span>
      )}
    </div>
  );
}
