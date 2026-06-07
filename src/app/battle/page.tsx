"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type PlayerSession } from "~/types/player";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";
import { CHARACTER_STORAGE_KEY } from "~/types/character";
import { GAME_MODE_LIST, type GameModeConfig } from "~/lib/game-mode";
import { type QuestionType } from "~/types/question";

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function BattleLobby() {
  const router = useRouter();
  const { ready, session: authSession } = useCompletedPlayerSession();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [rounds, setRounds] = useState(5);
  const [timePerRound, setTimePerRound] = useState(60);
  const [startingHp, setStartingHp] = useState(100);
  const [questionType, setQuestionType] = useState<QuestionType>("historical");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!ready || !authSession) return;
    setSession(authSession);
  }, [authSession, ready]);

  function ensureSession(): PlayerSession {
    if (session) return session;
    throw new Error("Missing player session");
  }

  function appendProfileParams(
    params: URLSearchParams,
    activeSession: PlayerSession,
  ) {
    params.set("userId", activeSession.user.id);
    params.set("name", activeSession.user.name);
    params.set("avatarIcon", activeSession.user.avatar.icon);
    params.set("avatarColor", activeSession.user.avatar.color);
    // Attach character config if player has customized one
    const character = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (character) params.set("character", character);
  }

  async function handleCreate() {
    try {
      const activeSession = ensureSession();
      const roomId = generateRoomId();
      const params = new URLSearchParams({
        host: "1",
        mode: questionType,
        rounds: String(rounds),
        time: String(timePerRound),
        hp: String(startingHp),
      });
      appendProfileParams(params, activeSession);
      void router.push(`/battle/${roomId}?${params.toString()}`);
    } catch {
      setMessage("进入房间失败，请稍后再试");
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;

    try {
      const activeSession = ensureSession();
      const code = joinCode.trim().toUpperCase();
      const params = new URLSearchParams();
      appendProfileParams(params, activeSession);
      void router.push(`/battle/${code}?${params.toString()}`);
    } catch {
      setMessage("加入房间失败，请稍后再试");
    }
  }

  if (!ready || !session) return <AuthLoading />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-white">
      <div className="w-full max-w-md px-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-stone-400 hover:text-white"
        >
          ← 返回首页
        </Link>

        <h1 className="mb-2 text-3xl font-extrabold text-red-400">
          ⚔️ 对战模式
        </h1>
        <p className="mb-6 text-stone-400">创建或加入房间，与朋友 PK</p>

        <div className="mb-6 flex rounded-xl bg-stone-800 p-1">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                tab === t
                  ? "bg-red-500 text-white"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {t === "create" ? "创建房间" : "加入房间"}
            </button>
          ))}
        </div>

        {tab === "create" ? (
          <>
            <div className="mb-4 space-y-4 rounded-xl bg-stone-800 p-4">
              <h3 className="font-semibold text-stone-300">游戏设置</h3>

              <div>
                <label className="mb-2 block text-sm text-stone-400">
                  游戏类型
                </label>
                <div className="flex flex-col gap-2">
                  {GAME_MODE_LIST.map((mode: GameModeConfig) => (
                    <button
                      key={mode.slug}
                      type="button"
                      onClick={() => setQuestionType(mode.type)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        questionType === mode.type
                          ? "border-red-500 bg-red-500/10"
                          : "border-stone-700 bg-stone-900 hover:border-stone-600"
                      }`}
                    >
                      <span className="text-2xl">{mode.emoji}</span>
                      <div>
                        <div
                          className={`font-semibold ${questionType === mode.type ? "text-red-300" : "text-stone-200"}`}
                        >
                          {mode.title}
                        </div>
                        <div className="text-xs text-stone-500">
                          {mode.tagline}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-400">
                  轮数：<span className="text-white">{rounds}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
                <div className="flex justify-between text-xs text-stone-500">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-400">
                  每轮时间：
                  <span className="text-white">{timePerRound} 秒</span>
                </label>
                <input
                  type="range"
                  min={20}
                  max={180}
                  step={10}
                  value={timePerRound}
                  onChange={(e) => setTimePerRound(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
                <div className="flex justify-between text-xs text-stone-500">
                  <span>20s</span>
                  <span>180s</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-400">
                  初始血量：<span className="text-white">{startingHp}</span>
                </label>
                <div className="flex gap-2">
                  {[20, 50, 100, 200].map((v) => (
                    <button
                      key={v}
                      onClick={() => setStartingHp(v)}
                      className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${
                        startingHp === v
                          ? "bg-red-500 text-white"
                          : "bg-stone-700 text-stone-300 hover:bg-stone-600"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              className="w-full rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              创建房间 →
            </button>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-1 block text-sm text-stone-400">
                房间号
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="6 位房间号"
                className="w-full rounded-lg bg-stone-700 px-4 py-2.5 font-mono text-xl tracking-widest text-white placeholder-stone-500 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={joinCode.trim().length < 6}
              className="w-full rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              加入房间 →
            </button>
          </>
        )}

        {message && (
          <p className="mt-3 text-center text-sm text-red-400">{message}</p>
        )}
      </div>
    </div>
  );
}
