const EVENT_IMAGE_PREFIX = "event-images/";
const PROXY_PATH = "/api/event-images";

/** 从 Private/Public Blob URL 提取 pathname */
export function extractBlobPathname(imageUrl: string): string | null {
  try {
    const { pathname } = new URL(imageUrl);
    const normalized = decodeURIComponent(pathname.replace(/^\/+/, ""));
    return normalized.startsWith(EVENT_IMAGE_PREFIX) ? normalized : null;
  } catch {
    return null;
  }
}

/** 生成前端可访问的配图代理地址 */
export function toEventImageProxyUrl(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl?.trim()) return undefined;

  const trimmed = imageUrl.trim();
  if (trimmed.startsWith(`${PROXY_PATH}?`)) {
    return trimmed;
  }

  if (trimmed.startsWith(`${EVENT_IMAGE_PREFIX}`)) {
    return `${PROXY_PATH}?pathname=${encodeURIComponent(trimmed)}`;
  }

  const blobPathname = extractBlobPathname(trimmed);
  if (blobPathname) {
    return `${PROXY_PATH}?pathname=${encodeURIComponent(blobPathname)}`;
  }

  return trimmed;
}

/** 校验代理接口允许的 pathname，防止路径穿越 */
export function isAllowedEventImagePathname(pathname: string): boolean {
  if (!pathname || pathname.includes("..")) return false;
  return pathname.startsWith(EVENT_IMAGE_PREFIX);
}
