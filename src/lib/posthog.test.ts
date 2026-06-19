import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AVATAR, type PlayerProfile } from "~/types/player";

const loadGuestProgressMock = vi.hoisted(() =>
  vi.fn(() => ({
    guestId: "guest-test",
    dateKey: "2026-06-19",
    startedToday: 0,
    bestScore: 0,
    history: [],
  })),
);

vi.mock("~/lib/guest-progress", () => ({
  loadGuestProgress: loadGuestProgressMock,
  storeGuestProgress: vi.fn(),
}));

function posthogBrowser(overrides: Partial<Window["posthog"]> = {}) {
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

async function importPostHogWithKey() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  return import("./posthog");
}

async function importPostHogWithProjectToken() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_project_test");
  return import("./posthog");
}

function player(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    id: "player-1",
    email: "player@example.com",
    name: "Sakura",
    avatar: DEFAULT_AVATAR,
    avatarUrl: null,
    provider: "google",
    countryCode: "JP",
    profileCompleted: true,
    soloHighScore: 0,
    createdAt: "2026-06-19T00:00:00.000Z",
    updatedAt: "2026-06-19T00:00:00.000Z",
    ...overrides,
  };
}

describe("posthog helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    loadGuestProgressMock.mockClear();
  });

  it("uses the player id when available and falls back to the guest id", async () => {
    const { getAnalyticsDistinctId } = await importPostHogWithKey();

    expect(getAnalyticsDistinctId("player-1")).toBe("player-1");
    expect(getAnalyticsDistinctId()).toBe("guest-test");
  });

  it("captures through the browser SDK with project base properties", async () => {
    const posthog = posthogBrowser();
    vi.stubGlobal("window", { posthog });
    const { capturePostHogEvent, POSTHOG_EVENTS } =
      await importPostHogWithKey();

    capturePostHogEvent(POSTHOG_EVENTS.homeStartClicked, { locale: "zh" });

    expect(posthog.capture).toHaveBeenCalledWith(
      "home_start_clicked",
      expect.objectContaining({
        app: "aniguessr",
        environment: "test",
        guest_id: "guest-test",
        locale: "zh",
      }),
    );
  });

  it("accepts the official PostHog project token environment variable", async () => {
    const posthog = posthogBrowser();
    vi.stubGlobal("window", { posthog });
    const { capturePostHogEvent, POSTHOG_EVENTS } =
      await importPostHogWithProjectToken();

    capturePostHogEvent(POSTHOG_EVENTS.homeStartClicked);

    expect(posthog.capture).toHaveBeenCalledWith(
      "home_start_clicked",
      expect.objectContaining({
        app: "aniguessr",
        guest_id: "guest-test",
      }),
    );
  });

  it("uses the official ingestion endpoint when the SDK is not ready", async () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com/");
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("window", {});
    const { capturePostHogEvent, POSTHOG_EVENTS } =
      await importPostHogWithKey();

    capturePostHogEvent(POSTHOG_EVENTS.pageViewed, {
      $current_url: "https://anime.loamly.net/",
    });

    expect(sendBeacon).toHaveBeenCalledWith(
      "https://us.i.posthog.com/i/v0/e/",
      expect.any(Blob),
    );
  });

  it("identifies logged-in users and records a non-blocking identify event", async () => {
    const posthog = posthogBrowser();
    vi.stubGlobal("window", { posthog });
    const { identifyPostHogUser } = await importPostHogWithKey();

    identifyPostHogUser(player());
    identifyPostHogUser(player({ name: "Sakura Prime" }));

    expect(posthog.identify).toHaveBeenLastCalledWith(
      "player-1",
      expect.objectContaining({
        country_code: "JP",
        email: "player@example.com",
        name: "Sakura Prime",
        provider: "google",
      }),
    );
    expect(posthog.capture).toHaveBeenCalledWith(
      "player_identified",
      expect.objectContaining({
        app: "aniguessr",
        has_country: true,
        provider: "google",
      }),
    );
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });
});
