"use client";

import Link from "next/link";
import { type FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeEmailLoginCode } from "~/lib/email-login-code";
import { savePlayerSession } from "~/lib/player-session";
import { api } from "~/trpc/react";

type Step = "email" | "code";

function getNextUrl() {
  if (typeof window === "undefined") return "/game/anime";
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next?.startsWith("/") || next.startsWith("//")) return "/game/anime";
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const normalizedCode = useMemo(() => normalizeEmailLoginCode(code), [code]);

  const requestCode = api.player.requestEmailLoginCode.useMutation({
    onSuccess(result) {
      setStep("code");
      setMessage(
        result.delivery === "debug"
          ? "开发环境未配置邮件服务，请使用下方调试验证码登录。"
          : "验证码已发送，请查看邮箱。",
      );
      setDebugCode(result.debugCode ?? null);
    },
    onError(error) {
      setMessage(error.message);
    },
  });

  const verifyCode = api.player.verifyEmailLoginCode.useMutation({
    onSuccess(session) {
      savePlayerSession(session);
      router.replace(getNextUrl());
    },
    onError(error) {
      setMessage(error.message);
    },
  });

  function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setDebugCode(null);
    requestCode.mutate({ email });
  }

  function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    verifyCode.mutate({ email, code: normalizedCode });
  }

  return (
    <main className="anime-shell min-h-screen px-5 py-5 text-white sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-lg font-black tracking-[0.18em] text-pink-100 uppercase focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
          >
            AniGuessr
          </Link>
          <Link
            href="/"
            className="text-sm font-bold text-cyan-100/70 transition hover:text-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
          >
            返回主页
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="anime-chip mb-5 w-fit">邮箱验证码登录</div>
            <h1 className="text-5xl leading-none font-black text-white sm:text-6xl">
              登录后开始巡礼推理
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-pink-50/70">
              输入邮箱获取 6
              位验证码。登录后会记录你的游戏开始、猜测、得分等行为数据，用于后续统计个人进度和优化题库体验。
            </p>
          </div>

          <div className="anime-panel p-5 sm:p-6">
            {step === "email" ? (
              <form onSubmit={handleRequestCode} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    邮箱
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-base text-white transition outline-none focus:border-cyan-200"
                    placeholder="name@example.com"
                  />
                </div>

                {message && (
                  <p className="rounded-xl border border-pink-300/20 bg-pink-300/10 px-3 py-2 text-sm leading-6 text-pink-50">
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={requestCode.isPending}
                  className="anime-button w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {requestCode.isPending ? "发送中..." : "发送验证码"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div>
                  <div className="text-sm font-bold text-cyan-100/80">
                    验证码已发送至
                  </div>
                  <div className="mt-1 text-lg font-black break-all text-pink-100">
                    {email}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="code"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    6 位验证码
                  </label>
                  <input
                    id="code"
                    inputMode="numeric"
                    value={code}
                    onChange={(event) =>
                      setCode(normalizeEmailLoginCode(event.target.value))
                    }
                    autoComplete="one-time-code"
                    required
                    minLength={6}
                    maxLength={6}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-center text-2xl font-black tracking-[0.35em] text-white transition outline-none focus:border-cyan-200"
                    placeholder="000000"
                  />
                </div>

                {debugCode && (
                  <div className="rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-sm leading-6 text-cyan-50">
                    调试验证码：<span className="font-black">{debugCode}</span>
                  </div>
                )}

                {message && (
                  <p className="rounded-xl border border-pink-300/20 bg-pink-300/10 px-3 py-2 text-sm leading-6 text-pink-50">
                    {message}
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setMessage("");
                      setDebugCode(null);
                    }}
                    className="anime-button-secondary flex-1"
                  >
                    更换邮箱
                  </button>
                  <button
                    type="submit"
                    disabled={verifyCode.isPending || normalizedCode.length < 6}
                    className="anime-button flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verifyCode.isPending ? "验证中..." : "登录"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
