import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env.mjs";
import {
  FAMOUS_JSON,
  IMAGES_SOURCE,
  loadBlobUrlMap,
  normalizeLocalPath,
  toEventImageProxyUrl,
} from "./event-image-paths.mjs";

const TF_OPTIONS = ["正确", "错误"];

function normalizeFunfact(record) {
  const raw = record.details?.funfact;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);
}

function resolveRemoteImageUrl(record) {
  const firstLocal = record.images?.find((image) => image.local_path);
  return (
    record.image_url ??
    firstLocal?.thumb_url ??
    record.images?.[0]?.thumb_url ??
    record.images?.[0]?.url ??
    null
  );
}

function resolveImageUrl(record, blobUrlMap) {
  const firstLocal = record.images?.find((image) => image.local_path);
  const normalizedLocal = normalizeLocalPath(firstLocal?.local_path);
  if (normalizedLocal) {
    const blobUrl = blobUrlMap[normalizedLocal];
    if (blobUrl) return toEventImageProxyUrl(blobUrl);
  }

  return toEventImageProxyUrl(resolveRemoteImageUrl(record));
}

function resolveFallbackImageUrl(record) {
  return toEventImageProxyUrl(resolveRemoteImageUrl(record));
}

function resolveDifficulty(record) {
  const value = record.details?.difficulty ?? record.raw?.difficulty;
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

function isHistoricalImportable(record) {
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

function toHistoricalRows(records, blobUrlMap) {
  return records.filter(isHistoricalImportable).map((record) => ({
    id: String(record.id),
    title: String(record.title),
    description: String(record.description),
    year: record.year,
    lat: record.lat,
    lng: record.lng,
    location: String(record.location),
    category: "china",
    wikipedia_title: record.wikipedia_title
      ? String(record.wikipedia_title)
      : null,
    image_url: resolveImageUrl(record, blobUrlMap),
    funfact: normalizeFunfact(record),
    hint: record.details?.hint ? String(record.details.hint).trim() : null,
    difficulty: resolveDifficulty(record),
  }));
}

function buildFunfactRow(record, blobUrlMap, payload) {
  const imageUrl = resolveImageUrl(record, blobUrlMap);
  const fallbackImageUrl = resolveFallbackImageUrl(record);

  return {
    ...payload,
    description: String(record.description ?? "").trim() || null,
    hint: record.details?.hint ? String(record.details.hint).trim() : null,
    funfact: normalizeFunfact(record),
    difficulty: resolveDifficulty(record),
    image_url: imageUrl,
    fallback_image_url:
      fallbackImageUrl && fallbackImageUrl !== imageUrl
        ? fallbackImageUrl
        : null,
  };
}

function toMcqRow(record, blobUrlMap) {
  const mcq = record.details?.multiple_choice;
  if (!mcq?.question || !Array.isArray(mcq.options) || mcq.options.length < 2) {
    return null;
  }
  if (!Number.isInteger(mcq.correct_index) || mcq.correct_index < 0) {
    return null;
  }
  if (mcq.correct_index >= mcq.options.length) return null;

  const options = mcq.options.map((item) => String(item).trim()).filter(Boolean);
  if (options.length < 2) return null;

  return buildFunfactRow(record, blobUrlMap, {
    id: `${record.id}_mcq`,
    source_id: String(record.id),
    format: "multiple_choice",
    title: String(record.title),
    stem: String(mcq.question).trim(),
    options,
    correct_index: mcq.correct_index,
    explanation: mcq.explanation ? String(mcq.explanation).trim() : null,
    category: String(record.category ?? "unknown"),
  });
}

function toTfRow(record, blobUrlMap) {
  const tf = record.details?.true_false;
  if (!tf?.statement || typeof tf.answer !== "boolean") return null;

  return buildFunfactRow(record, blobUrlMap, {
    id: `${record.id}_tf`,
    source_id: String(record.id),
    format: "true_false",
    title: String(record.title),
    stem: String(tf.statement).trim(),
    options: TF_OPTIONS,
    correct_index: tf.answer ? 0 : 1,
    explanation: tf.explanation ? String(tf.explanation).trim() : null,
    category: String(record.category ?? "unknown"),
  });
}

function toFunfactRows(records, blobUrlMap) {
  const rows = [];
  for (const record of records) {
    const mcq = toMcqRow(record, blobUrlMap);
    if (mcq) rows.push(mcq);
    const tf = toTfRow(record, blobUrlMap);
    if (tf) rows.push(tf);
  }
  return rows;
}

async function upsertHistoricalRows(sql, rows) {
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
        "hint",
        "difficulty",
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
        hint = excluded.hint,
        difficulty = excluded.difficulty,
        updated_at = now()
    `;
    upserted += batch.length;
    console.log(`已导入 ${upserted}/${rows.length} 条历史地理题`);
  }

  return upserted;
}

async function upsertFunfactRows(sql, rows) {
  const batchSize = 50;
  let upserted = 0;

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    await sql`
      insert into funfact_questions ${sql(
        batch,
        "id",
        "source_id",
        "format",
        "title",
        "stem",
        "options",
        "correct_index",
        "explanation",
        "category",
        "description",
        "hint",
        "funfact",
        "difficulty",
        "image_url",
        "fallback_image_url",
      )}
      on conflict (id) do update set
        source_id = excluded.source_id,
        format = excluded.format,
        title = excluded.title,
        stem = excluded.stem,
        options = excluded.options,
        correct_index = excluded.correct_index,
        explanation = excluded.explanation,
        category = excluded.category,
        description = excluded.description,
        hint = excluded.hint,
        funfact = excluded.funfact,
        difficulty = excluded.difficulty,
        image_url = excluded.image_url,
        fallback_image_url = excluded.fallback_image_url,
        updated_at = now()
    `;
    upserted += batch.length;
    console.log(`已导入 ${upserted}/${rows.length} 条冷知识题`);
  }

  return upserted;
}

await loadEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const raw = JSON.parse(await readFile(FAMOUS_JSON, "utf8"));
const records = Array.isArray(raw.records) ? raw.records : [];
const blobUrlMap = await loadBlobUrlMap();
const historicalRows = toHistoricalRows(records, blobUrlMap);
const funfactRows = toFunfactRows(records, blobUrlMap);

if (historicalRows.length === 0 && funfactRows.length === 0) {
  throw new Error("deepseek_famous_questions.json 中没有可导入的记录");
}

const mappedBlobCount = Object.keys(blobUrlMap).length;
if (mappedBlobCount === 0) {
  console.warn(
    `未找到 Blob 映射文件，请先运行 npm run images:upload（图片目录：${IMAGES_SOURCE}）`,
  );
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  let historicalUpserted = 0;
  let funfactUpserted = 0;

  if (historicalRows.length > 0) {
    historicalUpserted = await upsertHistoricalRows(sql, historicalRows);
  }

  if (funfactRows.length > 0) {
    funfactUpserted = await upsertFunfactRows(sql, funfactRows);
  }

  const mcqCount = funfactRows.filter((row) => row.format === "multiple_choice").length;
  const tfCount = funfactRows.filter((row) => row.format === "true_false").length;
  const withDifficulty = historicalRows.filter((row) => row.difficulty != null).length;

  console.log(
    [
      `导入完成：历史地理 ${historicalUpserted} 条（含难度 ${withDifficulty} 条）`,
      `冷知识 ${funfactUpserted} 条（选择题 ${mcqCount}，判断题 ${tfCount}）`,
      `来源记录 ${records.length} 条`,
      `跳过历史 ${records.length - historicalRows.length} 条不完整记录`,
      `跳过冷知识 ${records.length * 2 - funfactRows.length} 条不完整子题`,
    ].join("，"),
  );
} finally {
  await sql.end();
}
