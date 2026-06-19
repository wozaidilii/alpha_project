import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  getGoogleRedirectUri,
  isGoogleProfile,
  sanitizeNextPath,
} from "~/server/auth/google-oauth";
import { loginPlayerWithGoogle } from "~/server/data/player-store";

async function exchangeCodeForAccessToken(input: {
  code: string;
  redirectUri: string;
}) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Google OAuth token exchange failed");
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Google OAuth access token missing");
  }

  return payload.access_token;
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("Google profile fetch failed");
  }

  const profile: unknown = await response.json();
  if (!isGoogleProfile(profile)) {
    throw new Error("Google profile payload invalid");
  }

  return profile;
}

function createSessionBridgeHtml(sessionJson: string, next: string) {
  return `<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>Google 登录完成</title>
  </head>
  <body>
    <script>
      localStorage.setItem("histoguessr_player_session", ${JSON.stringify(sessionJson)});
      location.replace(${JSON.stringify(next)});
    </script>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const storedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const next = sanitizeNextPath(
    request.cookies.get(GOOGLE_OAUTH_NEXT_COOKIE)?.value,
  );

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent(next)}&error=google`,
        request.url,
      ),
    );
  }

  try {
    const redirectUri = getGoogleRedirectUri(
      requestUrl,
      env.GOOGLE_REDIRECT_URI,
    );
    const accessToken = await exchangeCodeForAccessToken({ code, redirectUri });
    const profile = await fetchGoogleProfile(accessToken);
    const session = await loginPlayerWithGoogle(profile, {
      userAgent: request.headers.get("user-agent"),
    });
    const response = new NextResponse(
      createSessionBridgeHtml(JSON.stringify(session), next),
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    response.cookies.delete(GOOGLE_OAUTH_NEXT_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent(next)}&error=google`,
        request.url,
      ),
    );
  }
}
