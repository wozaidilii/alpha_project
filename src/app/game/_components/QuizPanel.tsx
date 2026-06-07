"use client";

import { type FunfactQuestion } from "~/types/question";

interface Props {
  question: FunfactQuestion;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  disabled?: boolean;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export function QuizPanel({
  question,
  selectedIndex,
  onSelect,
  disabled = false,
}: Props) {
  const isTrueFalse = question.format === "true_false";

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-3">
        <div className="mb-1 text-xs font-medium text-emerald-400">
          {isTrueFalse ? "判断题" : "选择题"}
        </div>
        <p className="text-base leading-relaxed text-stone-100">{question.stem}</p>
      </div>

      <div
        className={`grid gap-2 ${isTrueFalse ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {question.options.map((option, index) => {
          const selected = selectedIndex === index;
          const label = isTrueFalse
            ? option
            : `${OPTION_LABELS[index] ?? index + 1}. ${option}`;

          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(index)}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                selected
                  ? "border-emerald-500 bg-emerald-950/50 text-emerald-100"
                  : "border-stone-700 bg-stone-800 text-stone-200 hover:border-stone-500 hover:bg-stone-700"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
