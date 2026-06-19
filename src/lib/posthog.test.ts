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
