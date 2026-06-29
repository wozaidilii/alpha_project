import { type NextRequest, NextResponse } from "next/server";
import {
  ANIME_LOCALE_COOKIE,
  DEFAULT_ANIME_LOCALE,
  isAnimeLocale,
  parseLocaleFromPathname,
  withAnimeLocale,
  type AnimeLocale,
} from "~/lib/anime-locale";

/** 根据 Cookie 与 Accept-Language 推断首选语言。 */
function pickPreferredLocale(request: NextRequest): AnimeLocale {
  const cookie = request.cookies.get(ANIME_LOCALE_COOKIE)?.value;
  if (isAnimeLocale(cookie)) return cookie;

  const accept = (request.headers.get("accept-language") ?? "").toLowerCase();
  if (accept.includes("zh")) return "zh";
  if (accept.includes("ja")) return "ja";
  return DEFAULT_ANIME_LOCALE;
}

function buildLocalizedUrl(request: NextRequest, locale: AnimeLocale): URL {
  const { pathname: innerPath } = parseLocaleFromPathname(
    request.nextUrl.pathname,
  );
  const url = request.nextUrl.clone();
  const localized = withAnimeLocale(
    `${innerPath}${url.search}${url.hash}`,
    locale,
  );
  const parsed = new URL(localized, request.url);
  url.pathname = parsed.pathname;
  url.search = parsed.search;
  url.hash = parsed.hash;
  return url;
}

/** 把旧版 ?lang= 查询参数永久重定向到路径前缀 URL。 */
function redirectLegacyLangParam(request: NextRequest): NextResponse | null {
  const langParam = request.nextUrl.searchParams.get("lang");
  if (!langParam || !isAnimeLocale(langParam)) return null;

  const url = buildLocalizedUrl(request, langParam);
  url.searchParams.delete("lang");
  return NextResponse.redirect(url, 308);
}

function applyLocaleContext(
  response: NextResponse,
  locale: AnimeLocale,
): NextResponse {
  response.cookies.set(ANIME_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  response.headers.set("x-anime-locale", locale);
  return response;
}

export function middleware(request: NextRequest) {
  const legacyRedirect = redirectLegacyLangParam(request);
  if (legacyRedirect) return legacyRedirect;

  const { locale: pathLocale, pathname: innerPath } = parseLocaleFromPathname(
    request.nextUrl.pathname,
  );

  // 无语言前缀：重定向到 /{locale}/...
  if (!pathLocale) {
    const preferred = pickPreferredLocale(request);
    const url = buildLocalizedUrl(request, preferred);
    return applyLocaleContext(NextResponse.redirect(url, 307), preferred);
  }

  // 有语言前缀：内部 rewrite 到原有路由，浏览器 URL 保持 /{locale}/...
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = innerPath;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-anime-locale", pathLocale);

  const response = NextResponse.rewrite(rewriteUrl, {
    request: { headers: requestHeaders },
  });
  return applyLocaleContext(response, pathLocale);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon-192|icon-512|apple-touch-icon|og.png|images|backgrounds|characters).*)",
  ],
};
