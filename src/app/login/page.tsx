"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeEmailLoginCode } from "~/lib/email-login-code";
import { savePlayerSession } from "~/lib/player-session";
import {
  capturePostHogEvent,
  identifyPostHogUser,
  POSTHOG_EVENTS,
} from "~/lib/posthog";
import { api } from "~/trpc/react";

type AuthMode = "password" | "register" | "reset";
type ResetStep = "email" | "code";

const MODE_LABELS: Record<AuthMode, string> = {
  password: "Log in",
  register: "Register",
  reset: "Reset password",
};

const DEFAULT_GOOGLE_LOGIN_ERROR_MESSAGE =
  "Google login failed. Try again later or use email login.";

const GOOGLE_LOGIN_ERROR_MESSAGES: Record<string, string> = {
  google: DEFAULT_GOOGLE_LOGIN_ERROR_MESSAGE,
  google_unknown: DEFAULT_GOOGLE_LOGIN_ERROR_MESSAGE,
  google_state:
    "The Google login state expired. Start Google login again from this page, and make sure this site can use cookies in private browsing.",
  google_config:
    "Google login is missing server configuration. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in Vercel.",
  google_token:
    "Google authorization code exchange failed. Make sure the Vercel GOOGLE_CLIENT_SECRET matches the current Google Cloud OAuth client secret.",
  google_profile:
    "Google authorization succeeded, but profile lookup failed. Try again later or use email login.",
  google_database:
    "Google authorization succeeded, but user data could not be saved. Confirm the production database migration includes the Google login fields.",
};

function getNextUrl() {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next?.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function getGoogleLoginUrl() {
  return `/api/auth/google/start?next=${encodeURIComponent(getNextUrl())}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("password");
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const normalizedResetCode = useMemo(
    () => normalizeEmailLoginCode(resetCode),
    [resetCode],
  );

  const handleAuthSuccess = (
    session: Parameters<typeof savePlayerSession>[0],
    eventName:
      | typeof POSTHOG_EVENTS.loginCompleted
      | typeof POSTHOG_EVENTS.registerCompleted
      | typeof POSTHOG_EVENTS.passwordResetCompleted,
  ) => {
    savePlayerSession(session);
    identifyPostHogUser(session.user);
    capturePostHogEvent(
      eventName,
      {
        provider: session.user.provider ?? "password",
      },
      session.user.id,
    );
    router.replace(getNextUrl());
  };

  const loginWithPassword = api.player.loginWithPassword.useMutation({
    onSuccess(session) {
      handleAuthSuccess(session, POSTHOG_EVENTS.loginCompleted);
    },
    onError(error) {
      setMessage(error.message);
    },
  });

  const registerWithPassword = api.player.registerWithPassword.useMutation({
    onSuccess(session) {
      handleAuthSuccess(session, POSTHOG_EVENTS.registerCompleted);
    },
    onError(error) {
      setMessage(error.message);
    },
  });

  const requestPasswordResetCode =
    api.player.requestPasswordResetCode.useMutation({
      onSuccess(result) {
        setResetStep("code");
        setMessage(
          result.delivery === "debug"
            ? "Email delivery is not configured in development. Use the debug code below to reset your password."
            : "If this email is registered, a reset code will be sent to it.",
        );
        setDebugCode(result.debugCode ?? null);
      },
      onError(error) {
        setMessage(error.message);
      },
    });

  const resetPasswordWithCode = api.player.resetPasswordWithCode.useMutation({
    onSuccess(session) {
      handleAuthSuccess(session, POSTHOG_EVENTS.passwordResetCompleted);
    },
    onError(error) {
      setMessage(error.message);
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const error = new URLSearchParams(window.location.search).get("error");
    if (error?.startsWith("google")) {
      setMessage(
        GOOGLE_LOGIN_ERROR_MESSAGES[error] ??
          DEFAULT_GOOGLE_LOGIN_ERROR_MESSAGE,
      );
    }
  }, []);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setDebugCode(null);
  }

  function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    loginWithPassword.mutate({ identifier, password });
  }

  function handlePasswordRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    registerWithPassword.mutate({
      email: registerEmail,
      username: registerUsername,
      password: registerPassword,
    });
  }

  function handleRequestPasswordResetCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setDebugCode(null);
    requestPasswordResetCode.mutate({ email: resetEmail });
  }

  function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    resetPasswordWithCode.mutate({
      email: resetEmail,
      code: normalizedResetCode,
      password: resetPassword,
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
            Back home
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="anime-chip mb-5 w-fit">{MODE_LABELS[mode]}</div>
            <h1 className="text-5xl leading-none font-black text-white sm:text-6xl">
              Enter the pilgrimage archive
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-pink-50/70">
              Log in with an email or username and password. Usernames are
              unique and appear in battles, leaderboards, and saved history.
            </p>
          </div>

          <div className="anime-panel p-5 sm:p-6">
            <div
              className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/25 p-1"
              role="tablist"
              aria-label="Account actions"
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

            <a
              href={getGoogleLoginUrl()}
              onClick={() =>
                capturePostHogEvent(POSTHOG_EVENTS.googleLoginStarted, {
                  next_path: getNextUrl(),
                })
              }
              className="mb-5 flex min-h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
            >
              Continue with Google
            </a>

            {mode === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="identifier"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    Email or username
                  </label>
                  <input
                    id="identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    autoComplete="username"
                    required
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-base text-white transition outline-none focus:border-cyan-200"
                    placeholder="name@example.com / sakura"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    Password
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
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="min-h-12 px-4 text-sm font-bold text-cyan-100/80 transition hover:text-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? "Hide" : "Show"}
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

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={loginWithPassword.isPending}
                    className="anime-button w-full disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loginWithPassword.isPending ? "Logging in..." : "Log in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="min-h-11 w-full rounded-xl text-sm font-bold text-cyan-100/70 transition hover:bg-white/10 hover:text-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {mode === "register" && (
              <form onSubmit={handlePasswordRegister} className="space-y-5">
                <div>
                  <label
                    htmlFor="register-username"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    Username
                  </label>
                  <input
                    id="register-username"
                    value={registerUsername}
                    onChange={(event) =>
                      setRegisterUsername(event.target.value)
                    }
                    autoComplete="username"
                    required
                    maxLength={12}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-base text-white transition outline-none focus:border-cyan-200"
                    placeholder="Display name for battles"
                  />
                  <p className="mt-2 text-xs leading-5 text-cyan-100/55">
                    Up to 12 characters. Uniqueness is case-insensitive.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="register-email"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    Email
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
                    Password
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
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((value) => !value)}
                      className="min-h-12 px-4 text-sm font-bold text-cyan-100/80 transition hover:text-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
                      aria-label={
                        showRegisterPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showRegisterPassword ? "Hide" : "Show"}
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
                    ? "Creating..."
                    : "Create account"}
                </button>
              </form>
            )}

            {mode === "reset" && resetStep === "email" && (
              <form
                onSubmit={handleRequestPasswordResetCode}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="reset-email"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    Registered email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
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
                  disabled={requestPasswordResetCode.isPending}
                  className="anime-button w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {requestPasswordResetCode.isPending
                    ? "Sending..."
                    : "Send reset code"}
                </button>
              </form>
            )}

            {mode === "reset" && resetStep === "code" && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <div className="text-sm font-bold text-cyan-100/80">
                    Check this email for the code
                  </div>
                  <div className="mt-1 text-lg font-black break-all text-pink-100">
                    {resetEmail}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-cyan-100/60">
                    A reset code is sent only when this email belongs to an
                    existing account.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="reset-code"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    6-digit code
                  </label>
                  <input
                    id="reset-code"
                    inputMode="numeric"
                    value={resetCode}
                    onChange={(event) =>
                      setResetCode(normalizeEmailLoginCode(event.target.value))
                    }
                    autoComplete="one-time-code"
                    required
                    minLength={6}
                    maxLength={6}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-center text-2xl font-black tracking-[0.35em] text-white transition outline-none focus:border-cyan-200"
                    placeholder="000000"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-password"
                    className="text-sm font-bold text-cyan-100/80"
                  >
                    New password
                  </label>
                  <div className="mt-2 flex rounded-xl border border-white/10 bg-black/35 focus-within:border-cyan-200">
                    <input
                      id="reset-password"
                      type={showResetPassword ? "text" : "password"}
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={128}
                      className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-white outline-none"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword((value) => !value)}
                      className="min-h-12 px-4 text-sm font-bold text-cyan-100/80 transition hover:text-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:outline-none"
                      aria-label={
                        showResetPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showResetPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {debugCode && (
                  <div className="rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-sm leading-6 text-cyan-50">
                    Debug code: <span className="font-black">{debugCode}</span>
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
                      setResetStep("email");
                      setResetCode("");
                      setResetPassword("");
                      setDebugCode(null);
                      setMessage("");
                    }}
                    className="anime-button-secondary flex-1"
                  >
                    Change email
                  </button>
                  <button
                    type="submit"
                    disabled={
                      resetPasswordWithCode.isPending ||
                      normalizedResetCode.length < 6 ||
                      resetPassword.length < 8
                    }
                    className="anime-button flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resetPasswordWithCode.isPending
                      ? "Resetting..."
                      : "Reset and log in"}
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
