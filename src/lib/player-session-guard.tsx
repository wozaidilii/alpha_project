"use client";

import { useEffect, useState } from "react";
import { type PlayerSession } from "~/types/player";
import {
  getDemoPlayerSession,
  getStoredPlayerSession,
} from "~/lib/player-session";

interface GuardState {
  ready: boolean;
  session: PlayerSession | null;
}

export function useEmailSession(): GuardState {
  const [state, setState] = useState<GuardState>({
    ready: false,
    session: null,
  });

  useEffect(() => {
    setState({
      ready: true,
      session: getStoredPlayerSession() ?? getDemoPlayerSession(),
    });
  }, []);

  return state;
}

export function useCompletedPlayerSession(): GuardState {
  const [state, setState] = useState<GuardState>({
    ready: false,
    session: null,
  });

  useEffect(() => {
    setState({
      ready: true,
      session: getStoredPlayerSession() ?? getDemoPlayerSession(),
    });
  }, []);

  return state;
}

export function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-900 text-stone-400">
      加载中...
    </main>
  );
}
