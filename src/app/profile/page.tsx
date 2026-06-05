"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AVATAR_COLORS,
  AVATAR_ICONS,
  DEFAULT_AVATAR,
  type BattleOutcome,
  type PlayerAvatar,
  type PlayerSession,
  normalizeAvatar,
} from "~/types/player";
import {
  clearPlayerSession,
  getStoredPlayerSession,
  savePlayerSession,
} from "~/lib/player-session";
import { api } from "~/trpc/react";

function formatPlayedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function outcomeText(outcome: BattleOutcome) {
  if (outcome === "win") return "胜";
  if (outcome === "loss") return "负";
  return "平";
}

export default function ProfilePage() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [name, setName] = useState("玩家");
  const [avatar, setAvatar] = useState<PlayerAvatar>(DEFAULT_AVATAR);
  const [message, setMessage] = useState("");

  const token = session?.token ?? "";
  const meQuery = api.player.me.useQuery(
    { token },
    { enabled: Boolean(token), retry: false },
  );
  const historyQuery = api.player.history.useQuery(
    { token },
    { enabled: Boolean(token), retry: false },
  );
  const loginMutation = api.player.login.useMutation();
  const updateProfileMutation = api.player.updateProfile.useMutation();
  const profileBusy = loginMutation.isPending || updateProfileMutation.isPending;

  useEffect(() => {
    const stored = getStoredPlayerSession();
    if (!stored) return;
    setSession(stored);
    setName(stored.user.name);
    setAvatar(stored.user.avatar);
  }, []);

  useEffect(() => {
    if (!meQuery.data || !session) return;
    const next = { token: session.token, user: meQuery.data };
    savePlayerSession(next);
    setSession(next);
    setName(meQuery.data.name);
    setAvatar(meQuery.data.avatar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.data]);

  useEffect(() => {
    if (!meQuery.error) return;
    clearPlayerSession();
    setSession(null);
    setMessage("登录已失效，请重新登录");
  }, [meQuery.error]);

  async function handleSaveProfile() {
    const cleanName = name.trim();
    if (!cleanName) return;

    try {
      const cleanAvatar = normalizeAvatar(avatar);
      if (!session) {
        const next = await loginMutation.mutateAsync({
          name: cleanName,
          avatar: cleanAvatar,
        });
        savePlayerSession(next);
        setSession(next);
        setMessage("已登录");
        return;
      }

      const user = await updateProfileMutation.mutateAsync({
        token: session.token,
        name: cleanName,
        avatar: cleanAvatar,
      });
      const next = { token: session.token, user };
      savePlayerSession(next);
      setSession(next);
      setMessage("档案已保存");
    } catch {
      setMessage("保存失败，请稍后再试");
    }
  }

  function handleLogout() {
    clearPlayerSession();
    setSession(null);
    setName("玩家");
    setAvatar(DEFAULT_AVATAR);
    setMessage("已退出登录");
  }

  return (
    <main className="min-h-screen bg-stone-900 text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-5xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[360px_1fr]">
        <section>
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-stone-400 hover:text-white"
          >
            ← 返回首页
          </Link>

          <h1 className="mb-2 text-3xl font-extrabold text-amber-400">
            个人档案
          </h1>
          <p className="mb-6 text-stone-400">编辑对战形象，查看历史战绩</p>

          <div className="rounded-xl bg-stone-800 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="grid h-16 w-16 place-items-center rounded-full text-4xl"
                style={{ backgroundColor: avatar.color }}
              >
                {avatar.icon}
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-sm text-stone-400">昵称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={12}
                  placeholder="最多 12 个字"
                  className="w-full rounded-lg bg-stone-700 px-3 py-2 text-white placeholder-stone-500 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-2 text-sm text-stone-400">形象</div>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setAvatar((prev) => ({ ...prev, icon }))}
                    className={`grid h-10 place-items-center rounded-lg bg-stone-700 text-xl transition hover:bg-stone-600 ${
                      avatar.icon === icon ? "ring-2 ring-amber-400" : ""
                    }`}
                    aria-label={`选择 ${icon}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-sm text-stone-400">颜色</div>
              <div className="grid grid-cols-8 gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatar((prev) => ({ ...prev, color }))}
                    className={`h-8 rounded-lg transition ${
                      avatar.color === color ? "ring-2 ring-white" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`选择颜色 ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={!name.trim() || profileBusy}
                className="flex-1 rounded-lg bg-amber-500 py-2 font-bold text-stone-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {session ? "保存档案" : "登录"}
              </button>
              {session && (
                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-stone-700 px-4 py-2 font-semibold text-stone-300 transition hover:bg-stone-600"
                >
                  退出
                </button>
              )}
            </div>
            {message && <p className="mt-2 text-sm text-stone-400">{message}</p>}
          </div>
        </section>

        <section className="self-center rounded-xl bg-stone-800 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-200">历史战绩</h2>
            {historyQuery.isFetching && (
              <span className="text-xs text-stone-500">更新中</span>
            )}
          </div>

          {!session ? (
            <p className="text-sm text-stone-500">登录后显示战绩</p>
          ) : historyQuery.data && historyQuery.data.length > 0 ? (
            <div className="space-y-3">
              {historyQuery.data.map((record) => (
                <div key={record.id} className="rounded-lg bg-stone-900/60 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`text-lg font-bold ${
                        record.outcome === "win"
                          ? "text-green-400"
                          : record.outcome === "loss"
                            ? "text-red-400"
                            : "text-amber-400"
                      }`}
                    >
                      {outcomeText(record.outcome)}
                    </span>
                    <span className="text-xs text-stone-500">
                      {formatPlayedAt(record.playedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm text-stone-300">
                    <span className="truncate">vs {record.opponentName}</span>
                    <span className="font-mono text-white">
                      {record.totalScore.toLocaleString()} :{" "}
                      {record.opponentScore.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-stone-500">
                    <span>{record.roundsPlayed} 轮</span>
                    <span>
                      HP {record.remainingHp} : {record.opponentHp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">暂无战绩</p>
          )}
        </section>
      </div>
    </main>
  );
}
