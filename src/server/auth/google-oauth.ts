export const GOOGLE_OAUTH_STATE_COOKIE = "aniguessr_google_oauth_state";
export const GOOGLE_OAUTH_NEXT_COOKIE = "aniguessr_google_oauth_next";

export type GoogleOAuthCallbackErrorCode =
  | "state"
  | "config"
  | "token"
  | "profile"
  | "database"
  | "unknown";

export class GoogleOAuthCallbackError extends Error {
  readonly code: GoogleOAuthCallbackErrorCode;
  readonly detail?: unknown;

  constructor(
    code: GoogleOAuthCallbackErrorCode,
    message: string,
    detail?: unknown,
  ) {
    super(message);
    this.name = "GoogleOAuthCallbackError";
    this.code = code;
    this.detail = detail;
  }
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/game/anime";
  return value;
}

export function googleOAuthErrorParam(code: GoogleOAuthCallbackErrorCode) {
  return `google_${code}`;
}

export function getGoogleOAuthCallbackErrorCode(
  error: unknown,
): GoogleOAuthCallbackErrorCode {
  return error instanceof GoogleOAuthCallbackError ? error.code : "unknown";
}

export function getGoogleRedirectUri(requestUrl: URL, configured?: string) {
  const configuredUri = configured?.trim();
  return configuredUri && configuredUri.length > 0
    ? configuredUri
    : `${requestUrl.origin}/api/auth/google/callback`;
}

export function buildGoogleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("prompt", "select_account");
  return url;
}

export function isGoogleProfile(value: unknown): value is GoogleProfile {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.sub === "string" &&
    typeof record.email === "string" &&
    typeof record.name === "string" &&
    (record.picture === undefined || typeof record.picture === "string")
  );
}
