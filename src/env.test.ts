import { afterEach, describe, expect, it, vi } from "vitest";

describe("environment validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("does not require pusher variables to build the demo", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://example.invalid/demo");
    vi.stubEnv("PUSHER_APP_ID", "");
    vi.stubEnv("PUSHER_KEY", "");
    vi.stubEnv("PUSHER_SECRET", "");
    vi.stubEnv("PUSHER_CLUSTER", "");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "");

    await expect(import("./env.js")).resolves.toHaveProperty("env");
  });
});
