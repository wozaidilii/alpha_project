import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { normalizeCountryCode } from "~/lib/country";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GoogleOAuthCallbackError,
  getGoogleOAuthCallbackErrorCode,
  getGoogleRedirectUri,
  googleOAuthErrorParam,
  isGoogleProfile,
  sanitizeNextPath,
} from "~/server/auth/google-oauth";
import { loginPlayerWithGoogle } from "~/server/data/player-store";

function inferCountryCode(headers: Headers) {
  return normalizeCountryCode(
    headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry"),
  );
}

async function exchangeCodeForAccessToken(input: {
  code: string;
  redirectUri: string;
}) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new GoogleOAuthCallbackError(
      "config",
      "Google OAuth is not configured",
    );
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
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = { status: response.status };
    }
    throw new GoogleOAuthCallbackError(
      "token",
      "Google OAuth token exchange failed",
      detail,
    );
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new GoogleOAuthCallbackError(
      "token",
      "Google OAuth access token missing",
    );
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
    throw new GoogleOAuthCallbackError(
      "profile",
      "Google profile fetch failed",
      { status: response.status },
    );
  }

  const profile: unknown = await response.json();
  if (!isGoogleProfile(profile)) {
    throw new GoogleOAuthCallbackError(
      "profile",
      "Google profile payload invalid",
    );
  }

  return profile;
}

function createSessionBridgeHtml(sessionJson: string, next: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>Google login complete</title>
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
        `/login?next=${encodeURIComponent(next)}&error=${googleOAuthErrorParam("state")}`,
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
      countryCode: inferCountryCode(request.headers),
    }).catch((error: unknown) => {
      throw new GoogleOAuthCallbackError(
        "database",
        "Google profile could not be persisted",
        error,
      );
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
  } catch (error) {
    const code = getGoogleOAuthCallbackErrorCode(error);
    const detail =
      error instanceof GoogleOAuthCallbackError ? error.detail : undefined;
    console.error("[google-oauth] callback failed", {
      code,
      message: error instanceof Error ? error.message : String(error),
      detail:
        detail instanceof Error
          ? { name: detail.name, message: detail.message }
          : detail,
    });
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent(next)}&error=${googleOAuthErrorParam(code)}`,
        request.url,
      ),
    );
  }
}
