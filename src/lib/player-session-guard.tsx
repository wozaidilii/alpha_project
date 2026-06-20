"use client";

import { useEffect, useState } from "react";
import { type PlayerSession } from "~/types/player";
import { getStoredPlayerSession } from "~/lib/player-session";
import {
  getStoredAnimeLocale,
  withAnimeLocale,
} from "~/lib/anime-locale";

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
      session: getStoredPlayerSession(),
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
    const session = getStoredPlayerSession();
    setState({
      ready: true,
      session,
    });

    if (!session) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(
        withAnimeLocale(
          `/login?next=${encodeURIComponent(next)}`,
          getStoredAnimeLocale(),
        ),
      );
    }
  }, []);

  return state;
}

export function AuthLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <main className="anime-shell flex min-h-screen items-center justify-center text-pink-50/70">
      {label}
    </main>
  );
}
