import {
  ANIME_GUESSR_ROUND_OPTIONS,
  normalizeAnimeGuessrRoundCount,
  type AnimeGuessrRoundCount,
} from "~/lib/anime-guessr";

export interface AnimeRoundCountSelectorCopy {
  roundsLabel: string;
  roundsOption: (rounds: number) => string;
}

export function AnimeRoundCountSelector({
  value,
  disabled,
  copy,
  onChange,
}: {
  value: AnimeGuessrRoundCount;
  disabled?: boolean;
  copy: AnimeRoundCountSelectorCopy;
  onChange: (rounds: AnimeGuessrRoundCount) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-cyan-100/60">{copy.roundsLabel}</span>
      <div className="flex overflow-hidden rounded-full border border-white/10">
        {ANIME_GUESSR_ROUND_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(normalizeAnimeGuessrRoundCount(option))}
            className={`min-h-8 px-3 text-xs font-black transition focus:ring-2 focus:ring-cyan-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
              value === option
                ? "bg-cyan-200/20 text-cyan-50"
                : "bg-white/5 text-pink-50/70 hover:bg-white/10"
            }`}
          >
            {copy.roundsOption(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
