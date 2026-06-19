"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeEmailLoginCode } from "~/lib/email-login-code";
import { savePlayerSession } from "~/lib/player-session";
import { api } from "~/trpc/react";

type AuthMode = "code" | "password" | "register";
type CodeStep = "email" | "code";

const MODE_LABELS: Record<AuthMode, string> = {
  code: "验证码登录",
  password: "密码登录",
  register: "注册",
};

function getNextUrl() {
  if (typeof window === "undefined") return "/game/anime";
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next?.startsWith("/") || next.startsWith("//")) return "/game/anime";
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("code");
  const [codeStep, setCodeStep] = useState<CodeStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const normalizedCode = useMemo(() => normalizeEmailLoginCode(code), [code]);

  const handleAuthSuccess = (
    session: Parameters<typeof savePlayerSession>[0],
  ) => {
    savePlayerSession(session);
    router.replace(getNextUrl());
  };

  const requestCode = api.player.requestEmailLoginCode.useMutation({
    onSuccess(result) {
      setCodeStep("code");
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
    onSuccess: handleAuthSuccess,
    onError(error) {
      setMessage(error.message);
    },
  });

  const loginWithPassword = api.player.loginWithPassword.useMutation({
    onSuccess: handleAuthSuccess,
    onError(error) {
      setMessage(error.message);
    },
  });

  const registerWithPassword = api.player.registerWithPassword.useMutation({
    onSuccess: handleAuthSuccess,
    onError(error) {
      setMessage(error.message);
    },
  });

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setDebugCode(null);
  }

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

  function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    loginWithPassword.mutate({ email, password });
  }

  function handlePasswordRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    registerWithPassword.mutate({
      email: registerEmail,
      name: registerName,
      password: registerPassword,
    });
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
            <div className="anime-chip mb-5 w-fit">{MODE_LABELS[mode]}</div>
            <h1 className="text-5xl leading-none font-black text-white sm:text-6xl">
              创建你的巡礼档案
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-pink-50/70">
              可用邮箱验证码快速登录，也可以注册用户名和密码。用户名会作为对战模式、排行榜和历史记录中的展示名称。
            </p>
          </div>

          <div className="anime-panel p-5 sm:p-6">
            <div
              className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/25 p-1"
              role="tablist"
              aria-label="登录方式"
            >
              {(Object.keys(MODE_LABELS) as AuthMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  onClick={() => switchMode(item)}
                  className={`min-h-11 rounded-xl px-2 text-sm font-black transition focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none ${
                    mode === item
                      ? "bg-cyan-200 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.22)]"
                      : "text-cyan-100/70 hover:bg-white/10 hover:text-cyan-50"
                  }`}
                >
                  {MODE_LABELS[item]}
                </button>
              ))}
            </div>

            {mode === "code" && codeStep === "email" && (
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
                  <p
                    className="rounded-xl border border-pink-300/20 bg-pink-300/10 px-3 py-2 text-sm leading-6 text-pink-50"
                    aria-live="polite"
                  >
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
            )}

            {mode === "code" && codeStep === "code" && (
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
                  <p
                    className="rounded-xl border border-pink-300/20 bg-pink-300/10 px-3 py-2 text-sm leading-6 text-pink-50"
                    aria-live="polite"
                  >
                    {message}
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setCodeStep("email");
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

            {mode === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="password-email"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    邮箱
                  </label>
                  <input
                    id="password-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-base text-white transition outline-none focus:border-cyan-200"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    密码
                  </label>
                  <div className="mt-2 flex rounded-xl border border-white/10 bg-black/35 focus-within:border-cyan-200">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                      minLength={8}
                      maxLength={128}
                      className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-white outline-none"
                      placeholder="至少 8 位"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="min-h-12 px-4 text-sm font-bold text-cyan-100/80 transition hover:text-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? "隐藏" : "显示"}
                    </button>
                  </div>
                </div>

                {message && (
                  <p
                    className="rounded-xl border border-pink-300/20 bg-pink-300/10 px-3 py-2 text-sm leading-6 text-pink-50"
                    aria-live="polite"
                  >
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loginWithPassword.isPending}
                  className="anime-button w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loginWithPassword.isPending ? "登录中..." : "密码登录"}
                </button>
              </form>
            )}

            {mode === "register" && (
              <form onSubmit={handlePasswordRegister} className="space-y-5">
                <div>
                  <label
                    htmlFor="register-name"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    用户名
                  </label>
                  <input
                    id="register-name"
                    value={registerName}
                    onChange={(event) => setRegisterName(event.target.value)}
                    autoComplete="nickname"
                    required
                    maxLength={12}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-base text-white transition outline-none focus:border-cyan-200"
                    placeholder="对战中显示的名字"
                  />
                  <p className="mt-2 text-xs leading-5 text-cyan-100/55">
                    最多 12 个字符，会显示在对战房间和历史战绩中。
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="register-email"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    邮箱
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(event) => setRegisterEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-base text-white transition outline-none focus:border-cyan-200"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-password"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    密码
                  </label>
                  <div className="mt-2 flex rounded-xl border border-white/10 bg-black/35 focus-within:border-cyan-200">
                    <input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerPassword}
                      onChange={(event) =>
                        setRegisterPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={128}
                      className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-white outline-none"
                      placeholder="至少 8 位"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((value) => !value)}
                      className="min-h-12 px-4 text-sm font-bold text-cyan-100/80 transition hover:text-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
                      aria-label={
                        showRegisterPassword ? "隐藏密码" : "显示密码"
                      }
                    >
                      {showRegisterPassword ? "隐藏" : "显示"}
                    </button>
                  </div>
                </div>

                {message && (
                  <p
                    className="rounded-xl border border-pink-300/20 bg-pink-300/10 px-3 py-2 text-sm leading-6 text-pink-50"
                    aria-live="polite"
                  >
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    registerWithPassword.isPending ||
                    registerPassword.length < 8
                  }
                  className="anime-button w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {registerWithPassword.isPending
                    ? "创建中..."
                    : "注册并进入游戏"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
