"use client";

import Link from "next/link";
import {
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
  type DifficultyLevel,
} from "~/lib/difficulty";
import { type GameModeConfig } from "~/lib/game-mode";

interface Props {
  gameMode: GameModeConfig;
  selectedDifficulty: number | undefined;
  onSelectDifficulty: (difficulty: number | undefined) => void;
  onStart: () => void;
}

export function DifficultySetup({
  gameMode,
  selectedDifficulty,
  onSelectDifficulty,
  onStart,
}: Props) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-900 px-4 text-white">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <Link
          href="/game/solo"
          className="text-sm text-stone-400 transition hover:text-white"
        >
          ← 返回个人模式
        </Link>

        <div className="text-center">
          <div className="text-4xl">{gameMode.emoji}</div>
          <h1
            className={`mt-2 text-3xl font-extrabold ${gameMode.accentClass}`}
          >
            {gameMode.title}
          </h1>
          <p className="mt-2 text-stone-400">{gameMode.description}</p>
        </div>

        <div className="rounded-2xl border border-stone-700 bg-stone-800 p-5">
          <h2 className="text-lg font-semibold text-stone-100">选择难度</h2>
          <p className="mt-1 text-sm text-stone-400">
            难度越高，线索越含蓄；选择「全部难度」将混合各难度题目
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onSelectDifficulty(undefined)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                selectedDifficulty === undefined
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-stone-600 bg-stone-900 hover:border-stone-500"
              }`}
            >
              <div className="font-medium text-stone-100">全部难度</div>
              <div className="text-sm text-stone-400">随机抽取任意难度题目</div>
            </button>

            {DIFFICULTY_LEVELS.map((level) => (
              <DifficultyOption
                key={level}
                level={level}
                selected={selectedDifficulty === level}
                accentClass={gameMode.accentClass}
                onSelect={() => onSelectDifficulty(level)}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-amber-500 px-6 py-4 text-lg font-semibold text-stone-900 transition hover:bg-amber-400"
        >
          开始游戏
        </button>
      </div>
    </main>
  );
}

function DifficultyOption({
  level,
  selected,
  accentClass,
  onSelect,
}: {
  level: DifficultyLevel;
  selected: boolean;
  accentClass: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        selected
          ? "border-amber-500 bg-amber-500/10"
          : "border-stone-600 bg-stone-900 hover:border-stone-500"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`font-medium ${selected ? accentClass : "text-stone-100"}`}
        >
          难度 {level} · {DIFFICULTY_LABELS[level]}
        </span>
        <span className="text-xs text-stone-500">{"★".repeat(level)}</span>
      </div>
      <div className="text-sm text-stone-400">
        {DIFFICULTY_DESCRIPTIONS[level]}
      </div>
    </button>
  );
}
