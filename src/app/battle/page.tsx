"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type PlayerSession } from "~/types/player";
import {
  AuthLoading,
  useCompletedPlayerSession,
} from "~/lib/player-session-guard";
import {
  BATTLE_GAME_MODE_LIST,
  type GameModeConfig,
  type GameModeSlug,
} from "~/lib/game-mode";
import {
  capturePostHogEvent,
  identifyPostHogUser,
  POSTHOG_EVENTS,
} from "~/lib/posthog";

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
  const [timePerRound, setTimePerRound] = useState(120);
  const [startingHp, setStartingHp] = useState(100);
  const firstBattleMode = useMemo(
    () => BATTLE_GAME_MODE_LIST[0]?.type ?? "anime-tuxun",
    [],
  );
  const [questionType, setQuestionType] =
    useState<GameModeSlug>(firstBattleMode);
  const [message, setMessage] = useState("");
  const recordedLobbyViewRef = useRef(false);

  useEffect(() => {
    if (!ready || !authSession) return;
    setSession(authSession);
    identifyPostHogUser(authSession.user);
    if (recordedLobbyViewRef.current) return;
    recordedLobbyViewRef.current = true;
    capturePostHogEvent(
      POSTHOG_EVENTS.battleLobbyViewed,
      { mode: questionType },
      authSession.user.id,
    );
  }, [authSession, questionType, ready]);

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
  }

  function handleCreate() {
    if (BATTLE_GAME_MODE_LIST.length === 0) {
      setMessage("当前没有可用的对战玩法");
      return;
    }

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
      capturePostHogEvent(
        POSTHOG_EVENTS.battleRoomCreated,
        {
          mode: questionType,
          rounds,
          time_per_round: timePerRound,
          starting_hp: startingHp,
        },
        activeSession.user.id,
      );
      void router.push(`/battle/${roomId}?${params.toString()}`);
    } catch {
      setMessage("进入房间失败，请稍后再试");
    }
  }

  function handleJoin() {
    if (!joinCode.trim()) return;

    try {
      const activeSession = ensureSession();
      const code = joinCode.trim().toUpperCase();
      const params = new URLSearchParams();
      appendProfileParams(params, activeSession);
      capturePostHogEvent(
        POSTHOG_EVENTS.battleRoomJoined,
        { code_length: code.length },
        activeSession.user.id,
      );
      void router.push(`/battle/${code}?${params.toString()}`);
    } catch {
      setMessage("加入房间失败，请稍后再试");
    }
  }

  if (!ready || !session) return <AuthLoading />;

  return (
    <main className="anime-shell flex min-h-screen flex-col items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-pink-100/70 hover:text-pink-50"
        >
          ← 返回首页
        </Link>

        <div className="mb-6">
          <div className="text-sm font-semibold tracking-[0.24em] text-pink-200/70 uppercase">
            Anime battle
          </div>
          <h1 className="mt-2 text-3xl font-extrabold text-pink-50">
            对战模式
          </h1>
          <p className="mt-2 text-sm leading-6 text-pink-100/70">
            创建房间或输入房间号，与朋友同时观察街景、抢答动漫圣地位置。
          </p>
        </div>

        <div className="mb-6 flex rounded-2xl border border-white/10 bg-white/10 p-1 shadow-xl shadow-pink-950/20 backdrop-blur">
          {(["create", "join"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                tab === value
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-900/30"
                  : "text-pink-100/70 hover:text-white"
              }`}
            >
              {value === "create" ? "创建房间" : "加入房间"}
            </button>
          ))}
        </div>

        {tab === "create" ? (
          <>
            <div className="mb-4 space-y-4 rounded-2xl border border-white/10 bg-zinc-950/55 p-4 shadow-xl shadow-pink-950/20 backdrop-blur">
              <h3 className="font-semibold text-pink-50">游戏设置</h3>

              <div>
                <label className="mb-2 block text-sm text-pink-100/70">
                  游戏类型
                </label>
                <div className="flex flex-col gap-2">
                  {BATTLE_GAME_MODE_LIST.map((mode: GameModeConfig) => (
                    <button
                      key={mode.slug}
                      type="button"
                      onClick={() => setQuestionType(mode.type)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        questionType === mode.type
                          ? "border-pink-400 bg-pink-500/15"
                          : "border-white/10 bg-white/5 hover:border-pink-200/40"
                      }`}
                    >
                      <span className="text-2xl">{mode.emoji}</span>
                      <span>
                        <span
                          className={`block font-semibold ${
                            questionType === mode.type
                              ? "text-pink-100"
                              : "text-pink-50"
                          }`}
                        >
                          {mode.title}
                        </span>
                        <span className="block text-xs text-pink-100/55">
                          {mode.tagline}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-pink-100/70">
                  轮数：<span className="text-white">{rounds}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rounds}
                  onChange={(event) => setRounds(Number(event.target.value))}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-xs text-pink-100/45">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-pink-100/70">
                  每轮时间：
                  <span className="text-white">{timePerRound} 秒</span>
                </label>
                <input
                  type="range"
                  min={60}
                  max={180}
                  step={10}
                  value={timePerRound}
                  onChange={(event) =>
                    setTimePerRound(Number(event.target.value))
                  }
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-xs text-pink-100/45">
                  <span>60s</span>
                  <span>180s</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-pink-100/70">
                  初始血量：<span className="text-white">{startingHp}</span>
                </label>
                <div className="flex gap-2">
                  {[50, 100, 150, 200].map((value) => (
                    <button
                      key={value}
                      onClick={() => setStartingHp(value)}
                      className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${
                        startingHp === value
                          ? "bg-pink-500 text-white"
                          : "bg-white/10 text-pink-100/70 hover:bg-white/15"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleCreate} className="anime-button w-full">
              创建房间 →
            </button>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-1 block text-sm text-pink-100/70">
                房间号
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(event.target.value.toUpperCase())
                }
                maxLength={6}
                placeholder="6 位房间号"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 font-mono text-xl tracking-widest text-white placeholder-pink-100/35 outline-none focus:border-pink-300"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={joinCode.trim().length < 6}
              className="anime-button w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              加入房间 →
            </button>
          </>
        )}

        {message && (
          <p className="mt-3 text-center text-sm text-red-200">{message}</p>
        )}
      </div>
    </main>
  );
}
