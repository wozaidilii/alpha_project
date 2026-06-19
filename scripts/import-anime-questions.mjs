import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env.mjs";
import { ANIME_JSON } from "./event-image-paths.mjs";

const args = new Set(process.argv.slice(2));
const onlyClean = args.has("--only-clean");

function normalizeFunfact(record) {
  const raw = record.details?.funfact;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeQualityFlags(record) {
  const raw = record.quality_flags;
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((item) => String(item).trim()).filter(Boolean))];
}

function inferRadiusKm(location, locationScope) {
  const name = String(location ?? "").trim();
  if (locationScope === "city" || /市$/.test(name)) return 12;
  if (/区$/.test(name)) return 8;
  if (/町$|村$/.test(name)) return 6;
  if (/岛$|島$/.test(name)) return 10;
  return 10;
}

function resolveSourceId(record) {
  const parentTaskId = record.raw?.parent_task_id;
  if (parentTaskId) return String(parentTaskId);
  const match = String(record.id).match(/^(.*)_d\d+_\d+$/);
  return match?.[1] ?? String(record.id);
}

function resolveModernName(record) {
  return (
    String(record.details?.modern_name ?? "").trim() ||
    String(record.raw?.summary_place_input ?? "").trim() ||
    String(record.location ?? "").trim()
  );
}

function resolveAnimeTitle(record) {
  return (
    String(record.details?.anime_title ?? "").trim() ||
    String(record.raw?.anime_title ?? "").trim() ||
    String(record.title ?? "").trim()
  );
}

function resolveRegion(record) {
  const value =
    record.details?.region ??
    record.raw?.region ??
    record.details?.summary_category;
  const text = String(value ?? "").trim();
  return text || null;
}

function isImportable(record) {
  const hint = String(record.details?.hint ?? record.description ?? "").trim();
  const animeTitle = resolveAnimeTitle(record);
  return Boolean(
    record.id &&
      record.title &&
      hint &&
      animeTitle &&
      record.location &&
      typeof record.lat === "number" &&
      typeof record.lng === "number",
  );
}

function toRow(record) {
  const hint = String(record.details?.hint ?? record.description ?? "").trim();
  const location = String(record.location).trim();
  const modernName = resolveModernName(record);
  const animeTitle = resolveAnimeTitle(record);
  const qualityFlags = normalizeQualityFlags(record);
  const locationScope = record.details?.location_scope
    ? String(record.details.location_scope).trim()
    : null;

  return {
    id: String(record.id),
    source_id: resolveSourceId(record),
    location,
    modern_name: modernName || location,
    center_lat: record.lat,
    center_lng: record.lng,
    radius_km: inferRadiusKm(location, locationScope),
    title: String(record.title).trim(),
    anime_title: animeTitle,
    aspect: record.details?.aspect ? String(record.details.aspect).trim() : null,
    hint,
    funfact: normalizeFunfact(record),
    difficulty:
      Number.isInteger(record.details?.difficulty) &&
      record.details.difficulty >= 1 &&
      record.details.difficulty <= 5
        ? record.details.difficulty
        : null,
    quality_flags: qualityFlags,
    year: Number.isInteger(record.year) ? record.year : null,
    year_end: Number.isInteger(record.details?.year_end)
      ? record.details.year_end
      : null,
    year_note: record.details?.year_note
      ? String(record.details.year_note).trim()
      : null,
    category: String(record.category ?? "anime").trim(),
    region: resolveRegion(record),
    prefectures: normalizeStringArray(
      record.details?.prefectures ?? record.raw?.prefectures,
    ),
    subject_note: record.details?.subject_note
      ? String(record.details.subject_note).trim()
      : null,
    location_scope: locationScope,
    location_note: record.details?.location_note
      ? String(record.details.location_note).trim()
      : null,
    real_place_name: record.details?.real_place_name
      ? String(record.details.real_place_name).trim()
      : null,
    fictional_place_names: normalizeStringArray(
      record.details?.fictional_place_names,
    ),
    enabled: true,
  };
}

async function upsertRows(sql, rows) {
  const batchSize = 50;
  let upserted = 0;

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    await sql`
      insert into anime_tuxun_questions ${sql(
        batch,
        "id",
        "source_id",
        "location",
        "modern_name",
        "center_lat",
        "center_lng",
        "radius_km",
        "title",
        "anime_title",
        "aspect",
        "hint",
        "funfact",
        "difficulty",
        "quality_flags",
        "year",
        "year_end",
        "year_note",
        "category",
        "region",
        "prefectures",
        "subject_note",
        "location_scope",
        "location_note",
        "real_place_name",
        "fictional_place_names",
        "enabled",
      )}
      on conflict (id) do update set
        source_id = excluded.source_id,
        location = excluded.location,
        modern_name = excluded.modern_name,
        center_lat = excluded.center_lat,
        center_lng = excluded.center_lng,
        radius_km = excluded.radius_km,
        title = excluded.title,
        anime_title = excluded.anime_title,
        aspect = excluded.aspect,
        hint = excluded.hint,
        funfact = excluded.funfact,
        difficulty = excluded.difficulty,
        quality_flags = excluded.quality_flags,
        year = excluded.year,
        year_end = excluded.year_end,
        year_note = excluded.year_note,
        category = excluded.category,
        region = excluded.region,
        prefectures = excluded.prefectures,
        subject_note = excluded.subject_note,
        location_scope = excluded.location_scope,
        location_note = excluded.location_note,
        real_place_name = excluded.real_place_name,
        fictional_place_names = excluded.fictional_place_names,
        enabled = excluded.enabled,
        updated_at = now()
    `;
    upserted += batch.length;
    console.log(`已导入 ${upserted}/${rows.length} 条动漫寻图题`);
  }

  return upserted;
}

await loadEnvFiles();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const raw = JSON.parse(await readFile(ANIME_JSON, "utf8"));
const records = Array.isArray(raw.records) ? raw.records : [];
const importable = records.filter(isImportable);
const rows = importable
  .filter((record) => {
    if (!onlyClean) return true;
    return normalizeQualityFlags(record).length === 0;
  })
  .map(toRow);

if (rows.length === 0) {
  throw new Error("deepseek_anime_questions.json 中没有可导入的记录");
}

const uniqueLocations = new Set(rows.map((row) => row.location)).size;
const uniqueAnime = new Set(rows.map((row) => row.anime_title)).size;
const withDifficulty = rows.filter((row) => row.difficulty != null).length;
const withFlags = rows.filter((row) => row.quality_flags.length > 0).length;
const flagCounts = rows.reduce((counts, row) => {
  for (const flag of row.quality_flags) {
    counts[flag] = (counts[flag] ?? 0) + 1;
  }
  return counts;
}, {});

const sql = postgres(databaseUrl, { max: 1 });

try {
  const upserted = await upsertRows(sql, rows);
  console.log(
    [
      `导入完成：${upserted} 条动漫寻图题`,
      `覆盖 ${uniqueLocations} 个城市`,
      `涉及 ${uniqueAnime} 部动漫`,
      `含难度 ${withDifficulty} 条`,
      `含 quality_flags ${withFlags} 条`,
      onlyClean ? "已启用 --only-clean 过滤" : null,
      `来源记录 ${records.length} 条`,
      `跳过 ${records.length - importable.length} 条不完整记录`,
      onlyClean
        ? `额外跳过 ${importable.length - rows.length} 条带 flag 记录`
        : null,
      Object.keys(flagCounts).length > 0
        ? `flags 分布 ${JSON.stringify(flagCounts)}`
        : null,
    ]
      .filter(Boolean)
      .join("，"),
  );
} finally {
  await sql.end();
}
