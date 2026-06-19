#!/usr/bin/env node
/**
 * 批量上传猜动漫配图到 Cloudflare R2 bucket `anime-gussr`。
 *
 * 对象键与题库 imagePath 一致，例如：
 *   anime/51_CLANNAD/5c4dgq9pm.jpg
 *
 * 公网读取前缀（NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL）：
 *   https://pub-fb0cf55dbd0b4c4cb42bf8312f34dbd4.r2.dev
 *
 * 前置条件（二选一）：
 *   A) .env.local 配置 R2 S3 凭证（推荐，默认自动使用）
 *   B) npx wrangler login && npx wrangler r2 bucket dev-url enable anime-gussr
 *
 * 用法：
 *   npm run images:upload-anime-all
 *   npm run images:upload-anime-all -- --dry-run
 *   npm run images:upload-anime-all -- --from-questions --workers 4
 */

import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadEnvFiles } from "./load-env.mjs";
import {
  isR2S3Configured,
  resolveR2S3Config,
  r2ObjectExists as r2S3ObjectExists,
  uploadToR2,
  verifyR2S3Connection,
} from "./r2-s3-client.mjs";

const BUCKET = "anime-gussr";
const DEFAULT_PUBLIC_BASE_URL =
  "https://pub-fb0cf55dbd0b4c4cb42bf8312f34dbd4.r2.dev";
const DEFAULT_SOURCE_DIR = path.join(
  process.cwd(),
  "scripts/python/rawdata/anime",
);
const DEFAULT_QUESTIONS_PATH = path.join(
  process.cwd(),
  "public/data/anime-guessr-questions.json",
);
const DEFAULT_MANIFEST_PATH = path.join(
  process.cwd(),
  "scripts/data/anime-guessr-r2-upload-manifest.json",
);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

const PROGRESS_WIDTH = 32;
const PROGRESS_THROTTLE_MS = 80;

function createProgressBar({ total, label }) {
  let completed = 0;
  let lastRenderAt = 0;
  const enabled = process.stdout.isTTY === true && total > 0;

  function formatSuffix(extra = {}) {
    const parts = Object.entries(extra)
      .filter(([, value]) => value != null && value !== "")
      .map(([key, value]) => `${key} ${value}`);
    return parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
  }

  function render(extra = {}) {
    if (!enabled) return;
    const ratio = total === 0 ? 1 : completed / total;
    const percent = Math.min(100, Math.floor(ratio * 100));
    const filled = Math.round(ratio * PROGRESS_WIDTH);
    const bar = `${"█".repeat(filled)}${"░".repeat(PROGRESS_WIDTH - filled)}`;
    const line = `${label} [${bar}] ${completed}/${total} (${percent}%)${formatSuffix(extra)}`;
    process.stdout.write(`\r${line.padEnd(Math.max(process.stdout.columns ?? 100, line.length))}`);
  }

  return {
    enabled,
    tick(extra = {}) {
      completed = Math.min(total, completed + 1);
      const now = Date.now();
      if (completed >= total || now - lastRenderAt >= PROGRESS_THROTTLE_MS) {
        lastRenderAt = now;
        render(extra);
      }
      if (completed >= total && enabled) {
        process.stdout.write("\n");
      }
    },
    logEvery(n, extra = {}) {
      if (enabled) return;
      if (completed % n === 0 || completed >= total) {
        console.log(`${label} ${completed}/${total}${formatSuffix(extra)}`);
      }
    },
  };
}

function parseArgs(argv) {
  const args = {
    sourceDir: DEFAULT_SOURCE_DIR,
    questionsPath: DEFAULT_QUESTIONS_PATH,
    manifestPath: DEFAULT_MANIFEST_PATH,
    workers: 4,
    headWorkers: 32,
    dryRun: false,
    fromQuestions: true,
    onlyMissing: true,
    verifyRemote: true,
    transport: "auto",
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--source") {
      args.sourceDir = path.resolve(argv[index + 1] ?? DEFAULT_SOURCE_DIR);
      index += 1;
    } else if (token === "--manifest") {
      args.manifestPath = path.resolve(argv[index + 1] ?? DEFAULT_MANIFEST_PATH);
      index += 1;
    } else if (token === "--questions") {
      args.questionsPath = path.resolve(
        argv[index + 1] ?? DEFAULT_QUESTIONS_PATH,
      );
      index += 1;
    } else if (token === "--workers") {
      args.workers = Math.max(1, Number.parseInt(argv[index + 1] ?? "4", 10));
      index += 1;
    } else if (token === "--head-workers") {
      args.headWorkers = Math.max(
        1,
        Number.parseInt(argv[index + 1] ?? "32", 10),
      );
      index += 1;
    } else if (token === "--limit") {
      args.limit = Math.max(1, Number.parseInt(argv[index + 1] ?? "1", 10));
      index += 1;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--from-questions") {
      args.fromQuestions = true;
    } else if (token === "--all-local") {
      args.fromQuestions = false;
    } else if (token === "--force") {
      args.onlyMissing = false;
    } else if (token === "--transport") {
      const value = argv[index + 1]?.trim().toLowerCase();
      if (value === "s3" || value === "wrangler" || value === "auto") {
        args.transport = value;
      }
      index += 1;
    } else if (
      token === "--verify" ||
      token === "--verify-remote" ||
      token === "--check-remote"
    ) {
      args.verifyRemote = true;
    } else if (
      token === "--no-verify" ||
      token === "--skip-verify" ||
      token === "--skip-remote-check"
    ) {
      args.verifyRemote = false;
    } else if (token === "--help" || token === "-h") {
      args.help = true;
    }
  }

  return args;
}

function printUsage() {
  console.log(`批量上传本地 anitabi 配图到 Cloudflare R2 (${BUCKET})

用法：
  npm run images:upload-anime-all -- [options]

选项：
  --source <dir>       本地图片根目录（默认 scripts/python/rawdata/anime）
  --from-questions     仅上传 public/data 题库中出现的 imagePath（默认）
  --all-local          扫描 source 下全部图片并上传
  --workers <n>        并发数（默认 4）
  --limit <n>          最多上传 n 张（调试用）
  --dry-run            只列出待上传对象，不实际上传
  --force              忽略本地 manifest，全部重新上传
  --verify             上传前检查远程是否已存在（默认开启）
  --no-verify          跳过远程校验，直接上传
  --transport <mode>   上传方式：auto（默认）| s3 | wrangler
  --head-workers <n>   远程校验并发数（默认 32）
  --manifest <file>    断点记录文件（默认 scripts/data/anime-guessr-r2-upload-manifest.json）

.env.local 中配置 R2 S3 凭证后默认走 s3 上传：
  R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT / R2_BUCKET_NAME

单张上传：
  npm run images:upload-anime -- <local-file> anime/51_CLANNAD/5c4dgq9pm.jpg

公网前缀：
  ${process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL ?? DEFAULT_PUBLIC_BASE_URL}
`);
}

function normalizeObjectKey(value) {
  return value.replaceAll("\\", "/").replace(/^\/+/, "");
}

function joinPublicUrl(baseUrl, objectKey) {
  return `${baseUrl.replace(/\/+$/, "")}/${normalizeObjectKey(objectKey)}`;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadManifest(manifestPath) {
  try {
    const raw = JSON.parse(await readFile(manifestPath, "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

async function saveManifest(manifestPath, manifest) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function loadQuestionImagePaths(questionsPath) {
  const payload = JSON.parse(await readFile(questionsPath, "utf8"));
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const keys = new Set();
  for (const question of questions) {
    if (typeof question?.imagePath === "string" && question.imagePath.trim()) {
      keys.add(normalizeObjectKey(question.imagePath));
    }
  }
  return {
    totalQuestions: questions.length,
    imagePaths: [...keys].sort(),
  };
}

async function collectLocalFiles(sourceDir) {
  const { readdir, stat } = await import("node:fs/promises");
  const results = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;
      const relativePath = path.relative(sourceDir, absolutePath);
      const objectKey = normalizeObjectKey(
        path.posix.join("anime", ...relativePath.split(path.sep)),
      );
      results.push({ localPath: absolutePath, objectKey });
    }
  }

  await walk(sourceDir);
  results.sort((a, b) => a.objectKey.localeCompare(b.objectKey));
  return results;
}

function resolveLocalPath(sourceDir, objectKey) {
  const normalized = normalizeObjectKey(objectKey);
  if (!normalized.startsWith("anime/")) return null;
  const relative = normalized.slice("anime/".length);
  return path.join(sourceDir, ...relative.split("/"));
}

async function remoteObjectExists(publicBaseUrl, objectKey, transport) {
  if (transport === "s3") {
    return r2S3ObjectExists(objectKey);
  }

  const url = joinPublicUrl(publicBaseUrl, objectKey);
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

function resolveTransport(requested) {
  if (requested === "s3") {
    if (!isR2S3Configured()) {
      throw new Error(
        "已指定 --transport s3，但 .env.local 缺少 R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT。",
      );
    }
    return "s3";
  }
  if (requested === "wrangler") {
    return "wrangler";
  }
  return isR2S3Configured() ? "s3" : "wrangler";
}

async function uploadObject(localPath, objectKey, transport) {
  if (transport === "s3") {
    await uploadToR2({ localPath, objectKey });
    return;
  }
  await uploadWithWrangler(localPath, objectKey);
}

function uploadWithWrangler(localPath, objectKey) {
  const objectPath = `${BUCKET}/${objectKey}`;
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "wrangler",
        "r2",
        "object",
        "put",
        objectPath,
        "--file",
        localPath,
        "--remote",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
      },
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(stderr.trim() || `wrangler exited with ${code}`));
    });
  });
}

async function runPool(items, worker, workers, { onComplete } = {}) {
  const results = new Array(items.length);
  let index = 0;

  async function consume() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
      onComplete?.(current, results[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(workers, items.length) }, () => consume()),
  );
  return results;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printUsage();
  process.exit(0);
}

await loadEnvFiles();

const publicBaseUrl =
  process.env.NEXT_PUBLIC_ANIME_GUESSR_IMAGE_BASE_URL?.trim() ||
  DEFAULT_PUBLIC_BASE_URL;

let transport;
try {
  transport = resolveTransport(args.transport);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const r2Config = resolveR2S3Config();
const bucketName = r2Config?.bucket ?? BUCKET;

if (transport === "s3") {
  try {
    await verifyR2S3Connection(r2Config);
  } catch (error) {
    console.error(
      `R2 S3 连接失败：${error instanceof Error ? error.message : String(error)}`,
    );
    console.error("请检查 .env.local 中的 R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT / R2_BUCKET_NAME。");
    process.exit(1);
  }
}

if (!(await fileExists(args.sourceDir))) {
  console.error(`本地图片目录不存在：${args.sourceDir}`);
  process.exit(1);
}

const manifest = args.onlyMissing
  ? await loadManifest(args.manifestPath)
  : {};

let candidates = [];
let questionStats = null;

if (args.fromQuestions) {
  if (!(await fileExists(args.questionsPath))) {
    console.error(`题库 JSON 不存在：${args.questionsPath}`);
    process.exit(1);
  }
  const { totalQuestions, imagePaths } = await loadQuestionImagePaths(
    args.questionsPath,
  );
  questionStats = {
    totalQuestions,
    uniqueImagePaths: imagePaths.length,
  };
  candidates = (
    await Promise.all(
      imagePaths.map(async (objectKey) => {
        const localPath = resolveLocalPath(args.sourceDir, objectKey);
        if (!localPath || !(await fileExists(localPath))) return null;
        return { objectKey, localPath };
      }),
    )
  ).filter(Boolean);
} else {
  candidates = await collectLocalFiles(args.sourceDir);
}

const afterManifest = [];
let skippedManifest = 0;
for (const item of candidates) {
  if (args.limit != null && afterManifest.length >= args.limit) break;
  if (args.onlyMissing && manifest[item.objectKey]?.uploadedAt) {
    skippedManifest += 1;
    continue;
  }
  afterManifest.push(item);
}

console.log(`Bucket：${bucketName}`);
console.log(`上传方式：${transport === "s3" ? "R2 S3 API" : "wrangler"}`);
console.log(`本地目录：${args.sourceDir}`);
console.log(`公网前缀：${publicBaseUrl}`);
console.log(`远程校验：${args.verifyRemote ? "开启" : "关闭"}`);
if (questionStats) {
  console.log(
    `题库：${questionStats.totalQuestions} 题 · 唯一 imagePath ${questionStats.uniqueImagePaths} 条`,
  );
}
console.log(
  `本地候选 ${candidates.length} 张 · manifest 跳过 ${skippedManifest} 张 · 待处理 ${afterManifest.length} 张`,
);

let skippedRemote = 0;
const pending = [];

if (args.verifyRemote && afterManifest.length > 0) {
  const verifyProgress = createProgressBar({
    total: afterManifest.length,
    label: "远程校验",
  });
  if (!verifyProgress.enabled) {
    console.log(
      `远程校验 ${afterManifest.length} 张（并发 ${args.headWorkers}）…`,
    );
  }

  let existsCount = 0;
  let missingCount = 0;

  const remoteChecks = await runPool(
    afterManifest,
    async (item) => {
      const exists = await remoteObjectExists(
        publicBaseUrl,
        item.objectKey,
        transport,
      );
      return { item, exists };
    },
    args.headWorkers,
    {
      onComplete(_index, result) {
        if (result.exists) existsCount += 1;
        else missingCount += 1;
        verifyProgress.tick({ 已存在: existsCount, 待上传: missingCount });
        verifyProgress.logEvery(100, { 已存在: existsCount, 待上传: missingCount });
      },
    },
  );

  for (const result of remoteChecks) {
    if (result.exists) {
      skippedRemote += 1;
      manifest[result.item.objectKey] = {
        uploadedAt: new Date().toISOString(),
        source: transport === "s3" ? "r2-s3-head" : "remote-head",
        publicUrl: joinPublicUrl(publicBaseUrl, result.item.objectKey),
      };
      continue;
    }
    pending.push(result.item);
  }
} else {
  pending.push(...afterManifest);
}

console.log(
  `远程已存在 ${skippedRemote} 张 · 待上传 ${pending.length} 张`,
);

if (pending.length === 0) {
  if (skippedRemote > 0 || skippedManifest > 0) {
    await saveManifest(args.manifestPath, manifest);
  }
  console.log("没有需要上传的图片。");
  process.exit(0);
}

if (args.dryRun) {
  for (const item of pending.slice(0, 20)) {
    console.log(`[dry-run] ${item.objectKey} <= ${item.localPath}`);
  }
  if (pending.length > 20) {
    console.log(`... 另有 ${pending.length - 20} 张`);
  }
  process.exit(0);
}

let uploaded = 0;
let failed = 0;
const uploadProgress = createProgressBar({
  total: pending.length,
  label: "上传进度",
});

if (!uploadProgress.enabled) {
  console.log(`开始上传 ${pending.length} 张（并发 ${args.workers}）…`);
}

await runPool(
  pending,
  async (item) => {
    try {
      await uploadObject(item.localPath, item.objectKey, transport);
      manifest[item.objectKey] = {
        uploadedAt: new Date().toISOString(),
        source: transport === "s3" ? "r2-s3" : "wrangler",
        publicUrl: joinPublicUrl(publicBaseUrl, item.objectKey),
      };
      uploaded += 1;
      if (uploaded % 25 === 0 || uploaded === pending.length) {
        await saveManifest(args.manifestPath, manifest);
      }
      uploadProgress.tick({ 成功: uploaded, 失败: failed });
      uploadProgress.logEvery(25, { 成功: uploaded, 失败: failed });
      return { ok: true, item };
    } catch (error) {
      failed += 1;
      uploadProgress.tick({ 成功: uploaded, 失败: failed });
      uploadProgress.logEvery(25, { 成功: uploaded, 失败: failed });
      return {
        ok: false,
        item,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  args.workers,
  {
    onComplete(_index, result) {
      if (!result.ok) {
        console.error(`\n${result.item.objectKey} ✗ ${result.error}`);
      }
    },
  },
);

await saveManifest(args.manifestPath, manifest);

console.log(
  `\n完成：成功 ${uploaded} · 失败 ${failed} · manifest → ${path.relative(process.cwd(), args.manifestPath)}`,
);
if (failed > 0) process.exit(1);
