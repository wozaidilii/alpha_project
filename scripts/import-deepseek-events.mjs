import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env.mjs";
import {
  DEEPSEEK_JSON,
  IMAGES_SOURCE,
  loadBlobUrlMap,
  normalizeLocalPath,
  toEventImageProxyUrl,
} from "./event-image-paths.mjs";

const CATEGORY_MAP = {
  historical_event: "china",
  historical_person: "china",
  craft_tool: "china",
  culture_work: "china",
  daily_life: "china",
};

function resolveDbCategory(record) {
  if (record.category === "world" || record.category === "china") {
    return record.category;
  }
  return CATEGORY_MAP[record.category] ?? "china";
}

function normalizeFunfact(record) {
  const raw = record.details?.funfact;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);
}

function resolveImageUrl(record, blobUrlMap) {
  const firstLocal = record.images?.find((image) => image.local_path);
  const normalizedLocal = normalizeLocalPath(firstLocal?.local_path);
  if (normalizedLocal) {
    const blobUrl = blobUrlMap[normalizedLocal];
    if (blobUrl) return toEventImageProxyUrl(blobUrl);
  }

  return toEventImageProxyUrl(
    record.image_url ??
      firstLocal?.thumb_url ??
      record.images?.[0]?.thumb_url ??
      record.images?.[0]?.url ??
      null,
  );
}

function isImportable(record) {
  return (
    record.id &&
    record.title &&
    record.description &&
    Number.isInteger(record.year) &&
    typeof record.lat === "number" &&
    typeof record.lng === "number" &&
    record.location
  );
}

function toRows(records, blobUrlMap) {
  return records.filter(isImportable).map((record) => ({
    id: String(record.id),
    title: String(record.title),
    description: String(record.description),
    year: record.year,
    lat: record.lat,
    lng: record.lng,
    location: String(record.location),
    category: resolveDbCategory(record),
    wikipedia_title: record.wikipedia_title
      ? String(record.wikipedia_title)
      : null,
    image_url: resolveImageUrl(record, blobUrlMap),
    funfact: normalizeFunfact(record),
  }));
}

async function upsertRows(sql, rows) {
  const batchSize = 50;
  let upserted = 0;

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    await sql`
      insert into historical_events ${sql(
        batch,
        "id",
        "title",
        "description",
        "year",
        "lat",
        "lng",
        "location",
        "category",
        "wikipedia_title",
        "image_url",
        "funfact",
      )}
      on conflict (id) do update set
        title = excluded.title,
        description = excluded.description,
        year = excluded.year,
        lat = excluded.lat,
        lng = excluded.lng,
        location = excluded.location,
        category = excluded.category,
        wikipedia_title = excluded.wikipedia_title,
        image_url = excluded.image_url,
        funfact = excluded.funfact,
        updated_at = now()
    `;
    upserted += batch.length;
    console.log(`已导入 ${upserted}/${rows.length} 条历史题`);
  }

  return upserted;
}

await loadEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const raw = JSON.parse(await readFile(DEEPSEEK_JSON, "utf8"));
const records = Array.isArray(raw.records) ? raw.records : [];
const blobUrlMap = await loadBlobUrlMap();
const rows = toRows(records, blobUrlMap);

if (rows.length === 0) {
  throw new Error("deepseek_events.json 中没有可导入的记录");
}

const withProxyImage = rows.filter((row) =>
  row.image_url?.startsWith("/api/event-images"),
).length;
const withRemoteImage = rows.filter(
  (row) => row.image_url && !row.image_url.startsWith("/api/event-images"),
).length;
const withoutImage = rows.filter((row) => !row.image_url).length;
const withFunfact = rows.filter((row) => row.funfact.length > 0).length;
const mappedBlobCount = Object.keys(blobUrlMap).length;

if (mappedBlobCount === 0) {
  console.warn(
    `未找到 Blob 映射文件，请先运行 npm run images:upload（图片目录：${IMAGES_SOURCE}）`,
  );
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  const upserted = await upsertRows(sql, rows);
  console.log(
    [
      `导入完成：${upserted} 条历史地理题目`,
      `代理配图 ${withProxyImage} 条`,
      `远程配图 ${withRemoteImage} 条`,
      `无配图 ${withoutImage} 条`,
      `含冷知识 ${withFunfact} 条`,
      `跳过 ${records.length - rows.length} 条不完整记录`,
    ].join("，"),
  );
} finally {
  await sql.end();
}
