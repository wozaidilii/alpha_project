"use client";

import {
  type PlayerSession,
  isPlayerSession,
} from "~/types/player";

const PLAYER_SESSION_KEY = "histoguessr_player_session";

export function getStoredPlayerSession(): PlayerSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PLAYER_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isPlayerSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePlayerSession(session: PlayerSession) {
  window.localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
}

export function clearPlayerSession() {
  window.localStorage.removeItem(PLAYER_SESSION_KEY);
}
