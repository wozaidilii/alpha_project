import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildAnimeGuessrRemoteImageUrl,
  normalizeAnimeGuessrImagePath,
} from "~/lib/anime-guessr-image-url";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function getAnimeGuessrLocalImageRoot() {
  const configured = process.env.ANIME_GUESSR_LOCAL_IMAGE_ROOT?.trim();
  return path.resolve(
    process.cwd(),
    configured && configured.length > 0
      ? configured
      : path.join("scripts", "python", "rawdata"),
  );
}

export function normalizeAnimeGuessrImageRelativePath(value: string) {
  return normalizeAnimeGuessrImagePath(value) ?? null;
}

export function resolveLocalAnimeGuessrImagePath(relativePath: string) {
  const normalized = normalizeAnimeGuessrImageRelativePath(relativePath);
  if (!normalized) return null;

  const root = getAnimeGuessrLocalImageRoot();
  const absolute = path.resolve(root, normalized);
  const relativeToRoot = path.relative(root, absolute);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return absolute;
}

export function getAnimeGuessrRemoteImageUrl(relativePath: string) {
  return (
    buildAnimeGuessrRemoteImageUrl(
      relativePath,
      process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL,
    ) ?? null
  );
}

export function getAnimeGuessrImageContentType(filePath: string) {
  return (
    MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  );
}

export async function readLocalAnimeGuessrImage(relativePath: string) {
  const absolutePath = resolveLocalAnimeGuessrImagePath(relativePath);
  if (!absolutePath) return null;

  try {
    await access(absolutePath);
    const body = await readFile(absolutePath);
    return {
      absolutePath,
      body,
      contentType: getAnimeGuessrImageContentType(absolutePath),
    };
  } catch {
    return null;
  }
}
