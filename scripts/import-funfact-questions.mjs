import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env.mjs";
import {
  FUNFACT_JSON,
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

  return {
    id: `${record.id}_mcq`,
    source_id: String(record.id),
    format: "multiple_choice",
    title: String(record.title),
    stem: String(mcq.question).trim(),
    options,
    correct_index: mcq.correct_index,
    explanation: mcq.explanation ? String(mcq.explanation).trim() : null,
    category: String(record.category ?? "unknown"),
    hint: record.details?.hint ? String(record.details.hint).trim() : null,
    funfact: normalizeFunfact(record),
    difficulty: Number.isInteger(record.details?.difficulty)
      ? record.details.difficulty
      : null,
    image_url: resolveImageUrl(record, blobUrlMap),
  };
}

function toTfRow(record, blobUrlMap) {
  const tf = record.details?.true_false;
  if (!tf?.statement || typeof tf.answer !== "boolean") return null;

  return {
    id: `${record.id}_tf`,
    source_id: String(record.id),
    format: "true_false",
    title: String(record.title),
    stem: String(tf.statement).trim(),
    options: TF_OPTIONS,
    correct_index: tf.answer ? 0 : 1,
    explanation: tf.explanation ? String(tf.explanation).trim() : null,
    category: String(record.category ?? "unknown"),
    hint: record.details?.hint ? String(record.details.hint).trim() : null,
    funfact: normalizeFunfact(record),
    difficulty: Number.isInteger(record.details?.difficulty)
      ? record.details.difficulty
      : null,
    image_url: resolveImageUrl(record, blobUrlMap),
  };
}

function toRows(records, blobUrlMap) {
  const rows = [];
  for (const record of records) {
    const mcq = toMcqRow(record, blobUrlMap);
    if (mcq) rows.push(mcq);
    const tf = toTfRow(record, blobUrlMap);
    if (tf) rows.push(tf);
  }
  return rows;
}

async function upsertRows(sql, rows) {
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
        "hint",
        "funfact",
        "difficulty",
        "image_url",
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
        hint = excluded.hint,
        funfact = excluded.funfact,
        difficulty = excluded.difficulty,
        image_url = excluded.image_url,
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

const raw = JSON.parse(await readFile(FUNFACT_JSON, "utf8"));
const records = Array.isArray(raw.records) ? raw.records : [];
const blobUrlMap = await loadBlobUrlMap();
const rows = toRows(records, blobUrlMap);

if (rows.length === 0) {
  throw new Error("deepseek_funfact_questions.json 中没有可导入的记录");
}

const mcqCount = rows.filter((row) => row.format === "multiple_choice").length;
const tfCount = rows.filter((row) => row.format === "true_false").length;
const withProxyImage = rows.filter((row) =>
  row.image_url?.startsWith("/api/event-images"),
).length;
const withRemoteImage = rows.filter(
  (row) => row.image_url && !row.image_url.startsWith("/api/event-images"),
).length;
const withoutImage = rows.filter((row) => !row.image_url).length;
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
      `导入完成：${upserted} 条（选择题 ${mcqCount}，判断题 ${tfCount}）`,
      `来源记录 ${records.length} 条`,
      `代理配图 ${withProxyImage} 条`,
      `远程配图 ${withRemoteImage} 条`,
      `无配图 ${withoutImage} 条`,
      `跳过 ${records.length * 2 - rows.length} 条不完整子题`,
    ].join("，"),
  );
} finally {
  await sql.end();
}
