"use client";

import {
  DEFAULT_AVATAR,
  type PlayerSession,
  isPlayerSession,
} from "~/types/player";

const PLAYER_SESSION_KEY = "histoguessr_player_session";
const DEMO_PLAYER_SESSION: PlayerSession = {
  token: "demo-local-session",
  user: {
    id: "demo-player",
    email: null,
    name: "玩家",
    avatar: DEFAULT_AVATAR,
    profileCompleted: true,
    soloHighScore: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

export function getStoredPlayerSession(): PlayerSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PLAYER_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlayerSession(parsed)) return null;
    return {
      token: parsed.token,
      user: {
        ...parsed.user,
        soloHighScore: parsed.user.soloHighScore ?? 0,
      },
    };
  } catch {
    return null;
  }
}

export function getDemoPlayerSession(): PlayerSession {
  return DEMO_PLAYER_SESSION;
}

export function savePlayerSession(session: PlayerSession) {
  window.localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
}

export function clearPlayerSession() {
  window.localStorage.removeItem(PLAYER_SESSION_KEY);
}
