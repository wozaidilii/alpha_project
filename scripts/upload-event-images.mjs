import { readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import {
  formatBlobAuthError,
  resolveBlobAccess,
  resolveBlobPutOptions,
} from "./blob-auth.mjs";
import { loadEnvFiles } from "./load-env.mjs";
import {
  BLOB_URL_MAP,
  DEEPSEEK_JSON,
  FAMOUS_JSON,
  FUNFACT_JSON,
  IMAGES_SOURCE,
  blobKeyFromLocalPath,
  collectLocalImagePaths,
  fileExists,
  loadBlobUrlMap,
  normalizeLocalPath,
  saveBlobUrlMap,
} from "./event-image-paths.mjs";

const CONCURRENCY = 5;
const MAX_RETRIES = 3;

const MIME_BY_EXT = {
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

function resolveContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

async function uploadWithRetry(blobKey, body, options) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await put(blobKey, body, options);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }
  throw lastError;
}

async function runPool(items, worker) {
  const results = [];
  let index = 0;

  async function consume() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, items.length) },
    () => consume(),
  );
  await Promise.all(workers);
  return results;
}

await loadEnvFiles();
const blobAuth = resolveBlobPutOptions();
const blobAccess = resolveBlobAccess();
console.log(`Blob 鉴权：${blobAuth.mode}，访问级别：${blobAccess}`);

const localPaths = new Set();

for (const jsonPath of [DEEPSEEK_JSON, FUNFACT_JSON, FAMOUS_JSON]) {
  try {
    const raw = JSON.parse(await readFile(jsonPath, "utf8"));
    const records = Array.isArray(raw.records) ? raw.records : [];
    for (const localPath of collectLocalImagePaths(records)) {
      localPaths.add(localPath);
    }
  } catch (error) {
    if (jsonPath === DEEPSEEK_JSON) throw error;
    console.warn(`跳过不存在的 JSON：${jsonPath}`);
  }
}

const sortedLocalPaths = [...localPaths].sort();
const urlMap = await loadBlobUrlMap();

if (sortedLocalPaths.length === 0) {
  console.log("JSON 记录中没有可上传的本地图片");
  process.exit(0);
}

const pending = sortedLocalPaths.filter((localPath) => !urlMap[localPath]);
console.log(
  `共 ${sortedLocalPaths.length} 张本地图片，已上传 ${sortedLocalPaths.length - pending.length} 张，待上传 ${pending.length} 张`,
);

let uploaded = 0;
let skipped = 0;
let failed = 0;

await runPool(pending, async (localPath) => {
  const normalized = normalizeLocalPath(localPath);
  const blobKey = blobKeyFromLocalPath(localPath);
  if (!normalized || !blobKey) {
    skipped += 1;
    console.warn(`跳过无效路径：${localPath}`);
    return;
  }

  const relative = normalized.replace(/^images\//, "");
  const sourcePath = path.join(IMAGES_SOURCE, relative);
  if (!(await fileExists(sourcePath))) {
    skipped += 1;
    console.warn(`本地文件不存在，跳过：${sourcePath}`);
    return;
  }

  try {
    const body = await readFile(sourcePath);
    const { url } = await uploadWithRetry(blobKey, body, {
      ...blobAuth,
      access: blobAccess,
      contentType: resolveContentType(sourcePath),
      allowOverwrite: true,
    });
    urlMap[normalized] = url;
    uploaded += 1;
    if (uploaded % 20 === 0 || uploaded === pending.length) {
      await saveBlobUrlMap(urlMap);
      console.log(`进度：${uploaded}/${pending.length}`);
    }
  } catch (error) {
    failed += 1;
    console.error(`上传失败 ${normalized}：${formatBlobAuthError(error)}`);
  }
});

await saveBlobUrlMap(urlMap);

console.log(
  [
    `上传完成：新增 ${uploaded} 张`,
    `跳过 ${skipped} 张`,
    `失败 ${failed} 张`,
    `映射文件 ${BLOB_URL_MAP}`,
  ].join("，"),
);

if (failed > 0) {
  process.exitCode = 1;
}
