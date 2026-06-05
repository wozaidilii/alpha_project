"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function BattleLobby() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [rounds, setRounds] = useState(5);
  const [timePerRound, setTimePerRound] = useState(60);
  const [startingHp, setStartingHp] = useState(100);

  function handleCreate() {
    if (!name.trim()) return;
    const roomId = generateRoomId();
    const params = new URLSearchParams({
      host: "1",
      name: name.trim(),
      rounds: String(rounds),
      time: String(timePerRound),
      hp: String(startingHp),
    });
    void router.push(`/battle/${roomId}?${params.toString()}`);
  }

  function handleJoin() {
    if (!name.trim() || !joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    const params = new URLSearchParams({ name: name.trim() });
    void router.push(`/battle/${code}?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-900 text-white">
      <div className="w-full max-w-md px-4">
        {/* Back */}
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

        {/* Tabs */}
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

        {/* Name (always shown) */}
        <div className="mb-4">
          <label className="mb-1 block text-sm text-stone-400">你的昵称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
            placeholder="最多 12 个字"
            className="w-full rounded-lg bg-stone-700 px-4 py-2.5 text-white placeholder-stone-500 outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {tab === "create" ? (
          <>
            {/* Game Settings */}
            <div className="mb-4 space-y-4 rounded-xl bg-stone-800 p-4">
              <h3 className="font-semibold text-stone-300">游戏设置</h3>

              {/* Rounds */}
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
                  <span>1</span><span>10</span>
                </div>
              </div>

              {/* Time per round */}
              <div>
                <label className="mb-1 block text-sm text-stone-400">
                  每轮时间：<span className="text-white">{timePerRound} 秒</span>
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
                  <span>20s</span><span>180s</span>
                </div>
              </div>

              {/* Starting HP */}
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
              disabled={!name.trim()}
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
              disabled={!name.trim() || joinCode.trim().length < 6}
              className="w-full rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              加入房间 →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
