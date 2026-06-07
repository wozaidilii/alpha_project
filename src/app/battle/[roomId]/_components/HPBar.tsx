"use client";

import { type BattlePlayer } from "~/types/battle";
import { CharacterSVG } from "~/components/CharacterSVG";

interface Props {
  player: BattlePlayer;
  flipped: boolean;
}

export function HPBar({ player, flipped }: Props) {
  const pct = Math.max(0, player.hp);
  const barColor =
    pct > 50 ? "bg-green-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={`flex items-center gap-1.5 ${flipped ? "flex-row-reverse" : ""}`}>
      {/* Avatar: character SVG or fallback emoji */}
      <div className="h-8 w-8 overflow-hidden rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0">
        {player.character ? (
          <CharacterSVG config={player.character} size={36} view="bust" />
        ) : (
          <span
            className="grid h-8 w-8 place-items-center rounded-full text-sm"
            style={{ backgroundColor: player.avatar.color }}
          >
            {player.avatar.icon}
          </span>
        )}
      </div>

      <span className="max-w-[60px] truncate text-xs text-stone-300">
        {player.name}
      </span>

      <div className="relative h-3 w-20 overflow-hidden rounded-full bg-stone-700">
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-500 ${barColor} ${flipped ? "right-0" : "left-0"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="min-w-[28px] text-xs font-bold text-white">{player.hp}</span>
    </div>
  );
}
