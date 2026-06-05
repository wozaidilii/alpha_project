"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type PlayerSession } from "~/types/player";
import { getStoredPlayerSession } from "~/lib/player-session";

interface GuardState {
  ready: boolean;
  session: PlayerSession | null;
}

export function useEmailSession(): GuardState {
  const router = useRouter();
  const [state, setState] = useState<GuardState>({
    ready: false,
    session: null,
  });

  useEffect(() => {
    const stored = getStoredPlayerSession();
    if (!stored) {
      router.replace("/login");
      return;
    }

    setState({ ready: true, session: stored });
  }, [router]);

  return state;
}

export function useCompletedPlayerSession(): GuardState {
  const router = useRouter();
  const [state, setState] = useState<GuardState>({
    ready: false,
    session: null,
  });

  useEffect(() => {
    const stored = getStoredPlayerSession();
    if (!stored) {
      router.replace("/login");
      return;
    }

    if (!stored.user.profileCompleted) {
      router.replace("/onboarding");
      return;
    }

    setState({ ready: true, session: stored });
  }, [router]);

  return state;
}

export function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-900 text-stone-400">
      加载中...
    </main>
  );
}
