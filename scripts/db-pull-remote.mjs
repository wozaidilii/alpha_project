/**
 * 从 Neon 远程库拉取题库到本地 Postgres，并下载 Vercel Blob 配图到 rawdata/images。
 *
 * 依赖 .env.local：
 *   DATABASE_URL              → 本地库（docker compose postgres）
 *   DATABASE_URL_UNPOOLED     → Neon 直连（pg_dump / 拉取用，勿用 pooler）
 *   BLOB_READ_WRITE_TOKEN     → 下载 Blob 配图（或 VERCEL_OIDC_TOKEN + BLOB_STORE_ID）
 *
 * 用法：
 *   npm run db:pull-remote
 *   npm run db:pull-remote -- --db-only
 *   npm run db:pull-remote -- --images-only
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";
import postgres from "postgres";
import {
  formatBlobAuthError,
  resolveBlobAccess,
  resolveBlobPutOptions,
} from "./blob-auth.mjs";
import {
  BLOB_URL_MAP,
  IMAGES_SOURCE,
  loadBlobUrlMap,
  saveBlobUrlMap,
} from "./event-image-paths.mjs";
import { loadEnvFiles } from "./load-env.mjs";

const CONTENT_TABLES = ["historical_events", "funfact_questions"];
const BATCH_SIZE = 200;
const IMAGE_CONCURRENCY = 5;

const args = new Set(process.argv.slice(2));
const dbOnly = args.has("--db-only");
const imagesOnly = args.has("--images-only");
const pullDb = !imagesOnly;
const pullImages = !dbOnly;

function resolveRemoteDatabaseUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    null
  );
}

function isNeonUrl(url) {
  return /neon\.tech/i.test(url);
}

function createSqlClient(url, label) {
  if (!url) {
    throw new Error(`${label} 数据库连接串未配置`);
  }

  return postgres(url, {
    max: 1,
    ...(isNeonUrl(url) ? { ssl: "require" } : {}),
  });
}

function assertLocalDatabaseUrl(url) {
  if (isNeonUrl(url)) {
    throw new Error(
      "DATABASE_URL 指向 Neon 远程库。请在 .env.local 中把 DATABASE_URL 设为本地库，例如：\n" +
        'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/histoguessr"',
    );
  }
}

function extractPathnameFromImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;

  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/api/event-images?")) {
    const params = new URL(trimmed, "http://localhost").searchParams;
    const pathname = params.get("pathname")?.trim();
    if (pathname?.startsWith("event-images/")) {
      return decodeURIComponent(pathname);
    }
    return null;
  }

  if (trimmed.startsWith("event-images/")) {
    return trimmed;
  }

  try {
    const { pathname } = new URL(trimmed);
    const normalized = decodeURIComponent(pathname.replace(/^\/+/, ""));
    if (normalized.startsWith("event-images/")) {
      return normalized;
    }
  } catch {
    // 外部 URL（如 Wikimedia）无需下载
  }

  return null;
}

function pathnameToLocalMapKey(pathname) {
  const relative = pathname.replace(/^event-images\//, "");
  return relative ? `images/${relative}` : null;
}

function pathnameToLocalFile(pathname) {
  const relative = pathname.replace(/^event-images\//, "");
  return path.join(IMAGES_SOURCE, relative);
}

function resolveBlobGetOptions(blobAuth) {
  const access = resolveBlobAccess();
  if (blobAuth.mode === "token") {
    return { access, token: blobAuth.token };
  }
  return { access, token: blobAuth.oidcToken };
}

async function runPool(items, worker, concurrency) {
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
    { length: Math.min(concurrency, items.length) },
    () => consume(),
  );
  await Promise.all(workers);
  return results;
}

async function copyTable(remoteSql, localSql, table) {
  const rows = await remoteSql.unsafe(`select * from ${table}`);
  console.log(`  ${table}: 远程 ${rows.length} 条`);

  await localSql.unsafe(`truncate table ${table} cascade`);

  if (rows.length === 0) {
    return 0;
  }

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await localSql`insert into ${localSql(table)} ${localSql(batch)}`;
    process.stdout.write(
      `\r  ${table}: 已写入 ${Math.min(offset + batch.length, rows.length)}/${rows.length}`,
    );
  }
  process.stdout.write("\n");

  return rows.length;
}

const IMAGE_COLUMNS_BY_TABLE = {
  historical_events: ["image_url"],
  funfact_questions: ["image_url", "fallback_image_url"],
};

async function collectImagePathnames(localSql) {
  const pathnames = new Set();

  for (const table of CONTENT_TABLES) {
    const columns = IMAGE_COLUMNS_BY_TABLE[table];
    const rows = await localSql.unsafe(
      `select ${columns.join(", ")} from ${table}`,
    );
    for (const row of rows) {
      for (const column of columns) {
        const pathname = extractPathnameFromImageUrl(row[column]);
        if (pathname) pathnames.add(pathname);
      }
    }
  }

  return [...pathnames].sort();
}

async function downloadImage(pathname, blobAuth, urlMap) {
  const localPath = pathnameToLocalFile(pathname);
  const mapKey = pathnameToLocalMapKey(pathname);

  try {
    const result = await get(pathname, resolveBlobGetOptions(blobAuth));
    if (!result?.stream) {
      return { pathname, status: "missing" };
    }

    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, buffer);

    if (mapKey && result.url) {
      urlMap[mapKey] = result.url;
    }

    return { pathname, status: "downloaded", bytes: buffer.length };
  } catch (error) {
    return {
      pathname,
      status: "failed",
      error: formatBlobAuthError(error),
    };
  }
}

await loadEnvFiles();

const localUrl = process.env.DATABASE_URL?.trim();
const remoteUrl = resolveRemoteDatabaseUrl();

if (!localUrl) {
  throw new Error("DATABASE_URL 未配置（应为本地 Postgres）");
}
if (!remoteUrl) {
  throw new Error(
    "远程库未配置。请在 .env.local 中设置 DATABASE_URL_UNPOOLED（Neon 直连，非 pooler）",
  );
}

assertLocalDatabaseUrl(localUrl);

console.log("=== db:pull-remote ===");
console.log(`本地库：${localUrl.replace(/:[^:@/]+@/, ":****@")}`);
console.log(`远程库：${remoteUrl.replace(/:[^:@/]+@/, ":****@")}`);
console.log(
  `模式：${pullDb && pullImages ? "题库 + 图片" : pullDb ? "仅题库" : "仅图片"}`,
);

const remoteSql = createSqlClient(remoteUrl, "远程");
const localSql = createSqlClient(localUrl, "本地");

try {
  if (pullDb) {
    console.log("\n[1/2] 同步题库表…");

    let totalRows = 0;
    for (const table of CONTENT_TABLES) {
      totalRows += await copyTable(remoteSql, localSql, table);
    }
    console.log(`题库同步完成，共 ${totalRows} 条。`);
  }

  if (pullImages) {
    console.log("\n[2/2] 下载 Blob 配图…");
    const blobAuth = resolveBlobPutOptions();
    console.log(`Blob 鉴权：${blobAuth.mode}`);

    const pathnames = await collectImagePathnames(localSql);
    const urlMap = await loadBlobUrlMap();

    if (pathnames.length === 0) {
      console.log("题库中没有需要下载的 event-images 配图。");
    } else {
      console.log(`共 ${pathnames.length} 张配图待处理…`);

      let downloaded = 0;
      let missing = 0;
      let failed = 0;

      await runPool(
        pathnames,
        async (pathname) => {
          const result = await downloadImage(pathname, blobAuth, urlMap);
          if (result.status === "downloaded") {
            downloaded += 1;
          } else if (result.status === "missing") {
            missing += 1;
            console.warn(`Blob 不存在：${pathname}`);
          } else {
            failed += 1;
            console.error(`下载失败 ${pathname}：${result.error}`);
          }

          const done = downloaded + missing + failed;
          if (done % 20 === 0 || done === pathnames.length) {
            await saveBlobUrlMap(urlMap);
            console.log(
              `进度：${done}/${pathnames.length}（成功 ${downloaded}，缺失 ${missing}，失败 ${failed}）`,
            );
          }
          return result;
        },
        IMAGE_CONCURRENCY,
      );

      await saveBlobUrlMap(urlMap);
      await mkdir(IMAGES_SOURCE, { recursive: true });

      console.log(
        [
          `配图下载完成：成功 ${downloaded} 张`,
          `缺失 ${missing} 张`,
          `失败 ${failed} 张`,
          `本地目录 ${IMAGES_SOURCE}`,
          `映射文件 ${BLOB_URL_MAP}`,
        ].join("\n  "),
      );

      if (failed > 0) {
        process.exitCode = 1;
      }
    }
  }

  console.log("\n全部完成。可执行 npm run dev 启动本地开发。");
} finally {
  await remoteSql.end();
  await localSql.end();
}
