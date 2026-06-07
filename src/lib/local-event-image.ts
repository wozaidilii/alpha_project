import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAllowedEventImagePathname } from "~/lib/event-image-url";

const LOCAL_IMAGES_ROOT = path.join(
  process.cwd(),
  "scripts/python/rawdata/images",
);

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

function resolveContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/** Blob 不可用时，从 rawdata/images 读取本地配图 */
export async function readLocalEventImage(pathname: string): Promise<{
  body: Buffer;
  contentType: string;
} | null> {
  if (!isAllowedEventImagePathname(pathname)) return null;

  const relative = pathname.replace(/^event-images\//, "");
  const filePath = path.resolve(LOCAL_IMAGES_ROOT, relative);
  const rootWithSep = `${LOCAL_IMAGES_ROOT}${path.sep}`;

  if (!filePath.startsWith(rootWithSep)) return null;

  try {
    const body = await readFile(filePath);
    return {
      body,
      contentType: resolveContentType(filePath),
    };
  } catch {
    return null;
  }
}
