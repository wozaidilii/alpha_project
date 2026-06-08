"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AvatarPicker } from "~/components/AvatarPicker";
import {
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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#292018_0%,_#0c0a09_55%)] px-4 py-8 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-[1.75rem] border border-stone-700/70 bg-stone-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur"
      >
        <div className="mb-6">
          <p className="text-sm text-stone-500">{session.user.email}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-amber-300">
            建立探险者档案
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            设置昵称与档案徽章；进入大厅后还可继续选择国风仙侠角色
          </p>
        </div>

        <div className="mb-6">
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
            className="w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-white placeholder-stone-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <AvatarPicker avatar={avatar} onChange={setAvatar} />

        <div className="mt-6 flex gap-3">
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
