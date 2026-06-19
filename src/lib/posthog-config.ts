const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized;
}

export const POSTHOG_PROJECT_TOKEN =
  normalizeEnvValue(process.env.NEXT_PUBLIC_POSTHOG_KEY) ??
  normalizeEnvValue(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) ??
  normalizeEnvValue(process.env.NEXT_PUBLIC_POSTHOG_TOKEN);

export const POSTHOG_HOST =
  normalizeEnvValue(process.env.NEXT_PUBLIC_POSTHOG_HOST) ??
  DEFAULT_POSTHOG_HOST;

export const POSTHOG_DEFAULTS_DATE = "2026-05-30";

export function buildPostHogCaptureUrl(apiHost = POSTHOG_HOST) {
  return `${apiHost.replace(/\/+$/, "")}/i/v0/e/`;
}
