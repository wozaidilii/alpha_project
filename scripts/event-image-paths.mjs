import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const ROOT = process.cwd();
export const DEEPSEEK_JSON = path.join(
  ROOT,
  "scripts/python/rawdata/deepseek_events.json",
);
export const FUNFACT_JSON = path.join(
  ROOT,
  "scripts/python/rawdata/deepseek_funfact_questions.json",
);
export const FAMOUS_JSON = path.join(
  ROOT,
  "scripts/python/rawdata/deepseek_famous_questions.json",
);
export const LOCATION_JSON = path.join(
  ROOT,
  "scripts/python/rawdata/deepseek_location_questions.json",
);
export const IMAGES_SOURCE = path.join(ROOT, "scripts/python/rawdata/images");
export const BLOB_URL_MAP = path.join(
  ROOT,
  "scripts/python/rawdata/image_blob_urls.json",
);

/** 统一 local_path 为 images/... 形式 */
export function normalizeLocalPath(localPath) {
  if (!localPath || typeof localPath !== "string") return null;
  const trimmed = localPath.trim().replaceAll("\\", "/");
  if (!trimmed) return null;
  return trimmed.startsWith("images/") ? trimmed : `images/${trimmed}`;
}

/** Blob 存储路径，与旧 public/event-images 目录结构对应 */
export function blobKeyFromLocalPath(localPath) {
  const normalized = normalizeLocalPath(localPath);
  if (!normalized) return null;
  const relative = normalized.replace(/^images\//, "");
  return `event-images/${relative}`;
}

/** 从 JSON 记录中收集去重后的本地图片路径 */
export function collectLocalImagePaths(records) {
  const paths = new Set();
  if (!Array.isArray(records)) return paths;

  for (const record of records) {
    const images = Array.isArray(record?.images) ? record.images : [];
    for (const image of images) {
      const normalized = normalizeLocalPath(image?.local_path);
      if (normalized) paths.add(normalized);
    }
  }
  return paths;
}

export async function loadBlobUrlMap() {
  try {
    const raw = await readFile(BLOB_URL_MAP, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

export async function saveBlobUrlMap(map) {
  const sorted = Object.fromEntries(
    Object.entries(map).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(BLOB_URL_MAP, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

export async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const EVENT_IMAGE_PREFIX = "event-images/";
const PROXY_PATH = "/api/event-images";

/** 将 Blob 直链转为线上可访问的代理地址 */
export function toEventImageProxyUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;

  const trimmed = imageUrl.trim();
  if (trimmed.startsWith(`${PROXY_PATH}?`)) return trimmed;

  if (trimmed.startsWith(EVENT_IMAGE_PREFIX)) {
    return `${PROXY_PATH}?pathname=${encodeURIComponent(trimmed)}`;
  }

  try {
    const { pathname } = new URL(trimmed);
    const normalized = decodeURIComponent(pathname.replace(/^\/+/, ""));
    if (normalized.startsWith(EVENT_IMAGE_PREFIX)) {
      return `${PROXY_PATH}?pathname=${encodeURIComponent(normalized)}`;
    }
  } catch {
    // 保留 Wikimedia 等外部 URL
  }

  return trimmed;
}
