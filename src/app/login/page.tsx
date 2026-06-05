"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getStoredPlayerSession,
  savePlayerSession,
} from "~/lib/player-session";
import { api } from "~/trpc/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const loginMutation = api.player.loginWithEmail.useMutation();

  useEffect(() => {
    const stored = getStoredPlayerSession();
    if (!stored) return;
    router.replace(stored.user.profileCompleted ? "/" : "/onboarding");
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const session = await loginMutation.mutateAsync({ email });
      savePlayerSession(session);
      router.replace(session.user.profileCompleted ? "/" : "/onboarding");
    } catch {
      setMessage("邮箱登录失败，请检查邮箱格式后重试");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-900 px-4 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-stone-800 p-5"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 text-5xl">🗺️</div>
          <h1 className="text-3xl font-extrabold text-amber-400">
            HistoGuessr
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            使用邮箱登录后创建角色，进入游戏大厅
          </p>
        </div>

        <label className="mb-2 block text-sm font-medium text-stone-300">
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="mb-4 w-full rounded-lg bg-stone-700 px-4 py-3 text-white placeholder-stone-500 outline-none focus:ring-2 focus:ring-amber-500"
        />

        <button
          type="submit"
          disabled={!email.trim() || loginMutation.isPending}
          className="w-full rounded-lg bg-amber-500 py-3 font-bold text-stone-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loginMutation.isPending ? "登录中..." : "邮箱登录"}
        </button>

        {message && (
          <p className="mt-3 text-center text-sm text-red-400">{message}</p>
        )}
      </form>
    </main>
  );
}
