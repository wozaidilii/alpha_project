"use client";

import { type BattlePlayer } from "~/types/battle";

interface Props {
  player: BattlePlayer;
  flipped: boolean; // opponent bar fills right→left
}

export function HPBar({ player, flipped }: Props) {
  const pct = Math.max(0, player.hp);
  // Color based on HP
  const barColor =
    pct > 50 ? "bg-green-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={`flex items-center gap-1.5 ${flipped ? "flex-row-reverse" : ""}`}>
      <span
        className="grid h-6 w-6 place-items-center rounded-full text-xs"
        style={{ backgroundColor: player.avatar.color }}
      >
        {player.avatar.icon}
      </span>
      <span className="max-w-[64px] truncate text-xs text-stone-300">
        {player.name}
      </span>
      <div className="relative h-3 w-24 overflow-hidden rounded-full bg-stone-700">
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-500 ${barColor} ${flipped ? "right-0" : "left-0"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="min-w-[28px] text-xs font-bold text-white">{player.hp}</span>
    </div>
  );
}
