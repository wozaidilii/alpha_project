import { access, copyFile, mkdir, readFile, symlink } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env.mjs";

const ROOT = process.cwd();
const DEEPSEEK_JSON = path.join(
  ROOT,
  "scripts/python/rawdata/deepseek_events.json",
);
const IMAGES_SOURCE = path.join(ROOT, "scripts/python/rawdata/images");
const PUBLIC_EVENT_IMAGES = path.join(ROOT, "public/event-images");

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

function resolveImageUrl(record) {
  const firstLocal = record.images?.find((image) => image.local_path);
  if (firstLocal?.local_path) {
    const relative = String(firstLocal.local_path).replace(/^images[/\\]/, "");
    return `/event-images/${relative.replaceAll("\\", "/")}`;
  }

  return (
    record.image_url ??
    firstLocal?.thumb_url ??
    record.images?.[0]?.thumb_url ??
    record.images?.[0]?.url ??
    null
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

async function ensurePublicImagesLink() {
  await mkdir(path.join(ROOT, "public"), { recursive: true });

  try {
    await access(PUBLIC_EVENT_IMAGES);
    return "existing";
  } catch {
    // Continue to create the link or copy fallback.
  }

  try {
    await symlink(IMAGES_SOURCE, PUBLIC_EVENT_IMAGES, "junction");
    return "symlink";
  } catch (error) {
    console.warn(
      `无法创建图片目录联接，将改为逐条复制首图：${error instanceof Error ? error.message : error}`,
    );
    return "copy";
  }
}

async function copyFirstImages(records) {
  let copied = 0;
  for (const record of records) {
    const image = record.images?.find((item) => item.local_path);
    if (!image?.local_path) continue;

    const relative = String(image.local_path).replace(/^images[/\\]/, "");
    const sourcePath = path.join(IMAGES_SOURCE, relative);
    const targetPath = path.join(PUBLIC_EVENT_IMAGES, relative);

    try {
      await access(sourcePath);
    } catch {
      continue;
    }

    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
    copied += 1;
  }
  return copied;
}

function toRows(records) {
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
    image_url: resolveImageUrl(record),
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
const rows = toRows(records);

if (rows.length === 0) {
  throw new Error("deepseek_events.json 中没有可导入的记录");
}

const imageMode = await ensurePublicImagesLink();
if (imageMode === "copy") {
  const copied = await copyFirstImages(records);
  console.log(`已复制 ${copied} 张首图到 public/event-images`);
} else if (imageMode === "symlink") {
  console.log("已联接 public/event-images -> scripts/python/rawdata/images");
}

const withLocalImage = rows.filter((row) =>
  row.image_url?.startsWith("/event-images/"),
).length;
const withRemoteImage = rows.filter(
  (row) => row.image_url && !row.image_url.startsWith("/event-images/"),
).length;
const withoutImage = rows.filter((row) => !row.image_url).length;
const withFunfact = rows.filter((row) => row.funfact.length > 0).length;

const sql = postgres(databaseUrl, { max: 1 });

try {
  const upserted = await upsertRows(sql, rows);
  console.log(
    [
      `导入完成：${upserted} 条历史地理题目`,
      `本地配图 ${withLocalImage} 条`,
      `远程配图 ${withRemoteImage} 条`,
      `无配图 ${withoutImage} 条`,
      `含冷知识 ${withFunfact} 条`,
      `跳过 ${records.length - rows.length} 条不完整记录`,
    ].join("，"),
  );
} finally {
  await sql.end();
}
