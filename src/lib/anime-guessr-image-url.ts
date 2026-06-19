export const ANIME_GUESSR_IMAGE_API_PREFIX = "/api/anime-guessr-image";
export const ANIME_GUESSR_IMAGE_PATH_PREFIX = "anime/";

export function normalizeAnimeGuessrImagePath(value: string | undefined) {
  if (!value) return undefined;

  const normalized = value
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/^anime-gussr\//, "");

  if (!normalized || normalized.includes("..")) return undefined;
  if (!normalized.startsWith(ANIME_GUESSR_IMAGE_PATH_PREFIX)) return undefined;
  return normalized;
}

function stripAlreadyIncludedBasePath(path: string, baseUrl: string) {
  try {
    const parsed = new URL(baseUrl);
    const baseSegments = parsed.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const lastBaseSegment = baseSegments.at(-1);
    if (!lastBaseSegment) return path;

    const pathSegments = path.split("/");
    if (pathSegments[0] !== lastBaseSegment) return path;
    return pathSegments.slice(1).join("/");
  } catch {
    return path;
  }
}

export function buildAnimeGuessrRemoteImageUrl(
  imagePath: string | undefined,
  baseUrl: string | undefined,
) {
  if (!imagePath) return undefined;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const normalizedPath = normalizeAnimeGuessrImagePath(imagePath);
  const normalizedBaseUrl = baseUrl?.trim();
  if (!normalizedPath || !normalizedBaseUrl) return undefined;

  const base = normalizedBaseUrl.replace(/\/+$/, "");
  const path = stripAlreadyIncludedBasePath(normalizedPath, base);
  if (!path) return base;
  return `${base}/${path}`;
}

export function buildAnimeGuessrLocalImageApiUrl(
  imagePath: string | undefined,
) {
  const normalizedPath = normalizeAnimeGuessrImagePath(imagePath);
  if (!normalizedPath) return undefined;
  return `${ANIME_GUESSR_IMAGE_API_PREFIX}/${normalizedPath}`;
}
