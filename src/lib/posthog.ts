import { loadGuestProgress, storeGuestProgress } from "~/lib/guest-progress";
import {
  buildPostHogCaptureUrl,
  POSTHOG_PROJECT_TOKEN,
} from "~/lib/posthog-config";
import { type PlayerProfile } from "~/types/player";

let lastIdentifiedUserId: string | null = null;

export const POSTHOG_EVENTS = {
  pageViewed: "$pageview",
  playerIdentified: "player_identified",
  homeStartClicked: "home_start_clicked",
  homeBattleClicked: "home_battle_clicked",
  profileOpened: "profile_opened",
  profileUpdated: "profile_updated",
  loginCompleted: "login_completed",
  registerCompleted: "register_completed",
  passwordResetCompleted: "password_reset_completed",
  googleLoginStarted: "google_login_started",
  battleLobbyViewed: "battle_lobby_viewed",
  battleRoomCreated: "battle_room_created",
  battleRoomJoined: "battle_room_joined",
  animeGameStarted: "anime_game_started",
  guestQuotaBlocked: "guest_quota_blocked",
  animeRoundSubmitted: "anime_round_submitted",
  animeScoreShared: "anime_score_shared",
  animeGameCompleted: "anime_game_completed",
  animeGameTimedOut: "anime_game_timed_out",
} as const;

export type PostHogEventName =
  (typeof POSTHOG_EVENTS)[keyof typeof POSTHOG_EVENTS];

type PostHogValue = string | number | boolean | null;
export type PostHogProperties = Record<string, PostHogValue>;

type LoosePostHogProperties = Record<string, PostHogValue | undefined>;

interface PostHogBrowser {
  capture: (event: string, properties?: PostHogProperties) => void;
  identify: (distinctId: string, properties?: PostHogProperties) => void;
  register: (properties: PostHogProperties) => void;
  reset: () => void;
}

declare global {
  interface Window {
    posthog?: PostHogBrowser;
  }
}

function getAnalyticsGuestId() {
  const progress = loadGuestProgress();
  if (typeof window !== "undefined") storeGuestProgress(progress);
  return progress.guestId;
}

function compactProperties(properties: LoosePostHogProperties) {
  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, PostHogValue] => {
        return entry[1] !== undefined;
      },
    ),
  );
}

function withBaseProperties(
  properties: PostHogProperties,
  distinctId?: string | null,
): PostHogProperties {
  const guestId =
    typeof window !== "undefined" && !distinctId
      ? getAnalyticsGuestId()
      : undefined;

  return compactProperties({
    ...properties,
    app: "aniguessr",
    environment: process.env.NODE_ENV,
    guest_id: guestId,
  });
}

export function getAnalyticsDistinctId(userId?: string | null) {
  if (userId) return userId;
  return getAnalyticsGuestId();
}

export function capturePostHogEvent(
  event: PostHogEventName,
  properties: PostHogProperties = {},
  distinctId?: string | null,
) {
  if (!POSTHOG_PROJECT_TOKEN || typeof window === "undefined") return;

  const eventProperties = withBaseProperties(properties, distinctId);

  if (window.posthog?.capture) {
    try {
      window.posthog.capture(event, eventProperties);
      return;
    } catch {
      // Fall back to the direct capture endpoint below.
    }
  }

  const payload = JSON.stringify({
    api_key: POSTHOG_PROJECT_TOKEN,
    event,
    distinct_id: getAnalyticsDistinctId(distinctId),
    properties: eventProperties,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(buildPostHogCaptureUrl(), blob)) return;
  }

  void fetch(buildPostHogCaptureUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Analytics must never block gameplay.
  });
}

export function identifyPostHogUser(user: PlayerProfile) {
  if (!POSTHOG_PROJECT_TOKEN || typeof window === "undefined") return;

  const personProperties = compactProperties({
    email: user.email ?? undefined,
    name: user.name,
    provider: user.provider ?? undefined,
    country_code: user.countryCode ?? undefined,
  });

  try {
    window.posthog?.identify(user.id, personProperties);
    if (lastIdentifiedUserId !== user.id) {
      lastIdentifiedUserId = user.id;
      capturePostHogEvent(
        POSTHOG_EVENTS.playerIdentified,
        {
          provider: user.provider ?? "password",
          has_country: Boolean(user.countryCode),
        },
        user.id,
      );
    }
  } catch {
    // Analytics must never block auth/session restoration.
  }
}

export function registerPostHogGuest() {
  if (!POSTHOG_PROJECT_TOKEN || typeof window === "undefined") return;

  try {
    window.posthog?.register({ guest_id: getAnalyticsGuestId() });
  } catch {
    // Analytics must never block gameplay.
  }
}

export function resetPostHogUser() {
  if (!POSTHOG_PROJECT_TOKEN || typeof window === "undefined") return;

  try {
    lastIdentifiedUserId = null;
    window.posthog?.reset();
    registerPostHogGuest();
  } catch {
    // Analytics must never block logout.
  }
}
