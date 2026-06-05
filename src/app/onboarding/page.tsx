"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AVATAR_COLORS,
  AVATAR_ICONS,
  DEFAULT_AVATAR,
  type PlayerAvatar,
  normalizeAvatar,
} from "~/types/player";
import { clearPlayerSession, savePlayerSession } from "~/lib/player-session";
import { AuthLoading, useEmailSession } from "~/lib/player-session-guard";
import { api } from "~/trpc/react";

export default function OnboardingPage() {
  const router = useRouter();
  const { ready, session } = useEmailSession();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<PlayerAvatar>(DEFAULT_AVATAR);
  const [message, setMessage] = useState("");
  const updateProfileMutation = api.player.updateProfile.useMutation();

  useEffect(() => {
    if (!ready || !session) return;
    if (session.user.profileCompleted) {
      router.replace("/");
      return;
    }

    setName(session.user.name || "");
    setAvatar(session.user.avatar);
  }, [ready, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    try {
      const user = await updateProfileMutation.mutateAsync({
        token: session.token,
        name: name.trim(),
        avatar: normalizeAvatar(avatar),
      });
      savePlayerSession({ token: session.token, user });
      router.replace("/");
    } catch {
      setMessage("角色保存失败，请稍后再试");
    }
  }

  function handleUseAnotherEmail() {
    clearPlayerSession();
    router.replace("/login");
  }

  if (!ready || !session) return <AuthLoading />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-900 px-4 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-stone-800 p-5"
      >
        <div className="mb-6">
          <p className="text-sm text-stone-400">{session.user.email}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-amber-400">
            建立角色
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            设置昵称和形象后才能进入游戏大厅
          </p>
        </div>

        <div className="mb-5 flex items-center gap-4">
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-5xl"
            style={{ backgroundColor: avatar.color }}
          >
            {avatar.icon}
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-sm font-medium text-stone-300">
              昵称
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={12}
              placeholder="最多 12 个字"
              autoFocus
              className="w-full rounded-lg bg-stone-700 px-4 py-3 text-white placeholder-stone-500 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium text-stone-300">形象</div>
          <div className="grid grid-cols-5 gap-2">
            {AVATAR_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setAvatar((prev) => ({ ...prev, icon }))}
                className={`grid h-11 place-items-center rounded-lg bg-stone-700 text-2xl transition hover:bg-stone-600 ${
                  avatar.icon === icon ? "ring-2 ring-amber-400" : ""
                }`}
                aria-label={`选择 ${icon}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 text-sm font-medium text-stone-300">颜色</div>
          <div className="grid grid-cols-8 gap-2">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatar((prev) => ({ ...prev, color }))}
                className={`h-9 rounded-lg transition ${
                  avatar.color === color ? "ring-2 ring-white" : ""
                }`}
                style={{ backgroundColor: color }}
                aria-label={`选择颜色 ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!name.trim() || updateProfileMutation.isPending}
            className="flex-1 rounded-lg bg-amber-500 py-3 font-bold text-stone-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {updateProfileMutation.isPending ? "保存中..." : "进入游戏大厅"}
          </button>
          <button
            type="button"
            onClick={handleUseAnotherEmail}
            className="rounded-lg bg-stone-700 px-4 py-3 font-semibold text-stone-300 transition hover:bg-stone-600"
          >
            换邮箱
          </button>
        </div>

        {message && <p className="mt-3 text-sm text-red-400">{message}</p>}
      </form>
    </main>
  );
}
