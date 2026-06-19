"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getStoredPlayerSession } from "~/lib/player-session";
import {
  capturePostHogEvent,
  identifyPostHogUser,
  POSTHOG_EVENTS,
  registerPostHogGuest,
} from "~/lib/posthog";

export function PostHogRouteTracker() {
  const pathname = usePathname();
  const lastPageKeyRef = useRef("");

  useEffect(() => {
    registerPostHogGuest();
    const session = getStoredPlayerSession();
    if (session) identifyPostHogUser(session.user);
  }, []);

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return;

    const pageKey = `${pathname}${window.location.search}`;
    if (lastPageKeyRef.current === pageKey) return;
    lastPageKeyRef.current = pageKey;

    const session = getStoredPlayerSession();
    capturePostHogEvent(
      POSTHOG_EVENTS.pageViewed,
      {
        $current_url: window.location.href,
        path: pathname,
        search: window.location.search,
        auth_state: session ? "logged_in" : "guest",
      },
      session?.user.id,
    );
  }, [pathname]);

  return null;
}
