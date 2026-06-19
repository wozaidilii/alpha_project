import { randomUUID } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizationUrl,
  getGoogleRedirectUri,
  sanitizeNextPath,
} from "~/server/auth/google-oauth";

export function GET(request: NextRequest) {
  if (!env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google 登录未配置 GOOGLE_CLIENT_ID" },
      { status: 503 },
    );
  }

  const requestUrl = new URL(request.url);
  const state = randomUUID();
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const redirectUri = getGoogleRedirectUri(requestUrl, env.GOOGLE_REDIRECT_URI);
  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri,
    state,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  response.cookies.set(GOOGLE_OAUTH_NEXT_COOKIE, next, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}
