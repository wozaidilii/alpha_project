import {
  ANIME_GUESSR_DIFFICULTY_OPTIONS,
  normalizeAnimeGuessrMaxDifficulty,
  type AnimeGuessrMaxDifficulty,
} from "~/lib/anime-guessr";

export interface AnimeDifficultySelectorCopy {
  difficultyLabel: string;
  difficultyOption: (level: number) => string;
  difficultyHint: string;
}

export function AnimeDifficultySelector({
  value,
  disabled,
  copy,
  onChange,
}: {
  value: AnimeGuessrMaxDifficulty;
  disabled?: boolean;
  copy: AnimeDifficultySelectorCopy;
  onChange: (difficulty: AnimeGuessrMaxDifficulty) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-cyan-100/60">
          {copy.difficultyLabel}
        </span>
        <div className="flex flex-wrap overflow-hidden rounded-full border border-white/10">
          {ANIME_GUESSR_DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(normalizeAnimeGuessrMaxDifficulty(option))}
              className={`min-h-8 px-3 text-xs font-black transition focus:ring-2 focus:ring-cyan-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                value === option
                  ? "bg-cyan-200/20 text-cyan-50"
                  : "bg-white/5 text-pink-50/70 hover:bg-white/10"
              }`}
            >
              {copy.difficultyOption(option)}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs leading-5 text-pink-50/55">{copy.difficultyHint}</p>
    </div>
  );
}
