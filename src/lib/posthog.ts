import { loadGuestProgress } from "~/lib/guest-progress";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

type PostHogProperties = Record<string, string | number | boolean | null>;

function getCaptureUrl() {
  return `${POSTHOG_HOST.replace(/\/$/, "")}/capture/`;
}

export function getAnalyticsDistinctId(userId?: string | null) {
  if (userId) return userId;
  return loadGuestProgress().guestId;
}

export function capturePostHogEvent(
  event: string,
  properties: PostHogProperties = {},
  distinctId?: string | null,
) {
  if (!POSTHOG_KEY || typeof window === "undefined") return;

  const payload = JSON.stringify({
    api_key: POSTHOG_KEY,
    event,
    distinct_id: getAnalyticsDistinctId(distinctId),
    properties: {
      ...properties,
      app: "aniguessr",
    },
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(getCaptureUrl(), blob)) return;
  }

  void fetch(getCaptureUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Analytics must never block gameplay.
  });
}
