import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const JAPAN_BOUNDS = {
  southWest: { lat: 24.0, lng: 122.9 },
  northEast: { lat: 45.8, lng: 153.99 },
};

const LOCALIZED_OUTPUT_LOCALES = ["ja", "en"];
const LOCALIZED_TEXT_KEYS = [
  "title",
  "description",
  "animeTitle",
  "aspect",
  "location",
  "answerName",
  "episodeContext",
  "funfact",
];

const LOCAL_ANIME_ROOT = path.join(
  process.cwd(),
  "scripts/python/rawdata/anime",
);
const LOCAL_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const inputPath = process.argv[2];
const outputPath =
  process.argv[3] ??
  path.join(process.cwd(), "public/data/anime-guessr-questions.json");

if (!inputPath) {
  console.error(
    "Usage: node scripts/build-anime-guessr-questions.mjs <deepseek_anitabi_points.json> [output.json]",
  );
  process.exit(1);
}

function isInsideJapan(record) {
  return (
    Number.isFinite(record.lat) &&
    Number.isFinite(record.lng) &&
    record.lat >= JAPAN_BOUNDS.southWest.lat &&
    record.lat <= JAPAN_BOUNDS.northEast.lat &&
    record.lng >= JAPAN_BOUNDS.southWest.lng &&
    record.lng <= JAPAN_BOUNDS.northEast.lng
  );
}

function cleanString(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function localizedDetails(record, locale) {
  const details = record.details ?? {};
  const i18n = details.i18n?.[locale];
  return i18n && typeof i18n === "object" ? i18n : {};
}

function compactLocalizedText(record, locale, fallback) {
  const details = record.details ?? {};
  const raw = record.raw ?? {};
  const i18n = localizedDetails(record, locale);
  const animeTitle =
    cleanString(i18n.anime_title) ??
    cleanString(details.anime_title) ??
    cleanString(raw.subject_cn) ??
    cleanString(raw.subject_dir) ??
    fallback?.animeTitle ??
    "未知作品";
  const location =
    cleanString(i18n.location) ??
    cleanString(record.location) ??
    cleanString(details.subject_city) ??
    fallback?.location ??
    "日本";
  const answerName =
    cleanString(i18n.real_place_name) ??
    cleanString(details.real_place_name) ??
    cleanString(raw.point_cn) ??
    cleanString(raw.point_name) ??
    cleanString(record.location) ??
    fallback?.answerName ??
    location;
  const funfact = Array.isArray(i18n.funfact)
    ? i18n.funfact.map(cleanString).filter(Boolean).slice(0, 3)
    : Array.isArray(details.funfact)
      ? details.funfact.map(cleanString).filter(Boolean).slice(0, 3)
      : (fallback?.funfact ?? []);

  return {
    title:
      cleanString(i18n.title) ??
      cleanString(details.title) ??
      cleanString(record.title) ??
      fallback?.title ??
      animeTitle,
    description:
      cleanString(i18n.hint) ??
      cleanString(i18n.description) ??
      cleanString(details.hint) ??
      cleanString(record.description) ??
      fallback?.description ??
      "",
    animeTitle,
    aspect:
      cleanString(i18n.aspect) ??
      cleanString(details.aspect) ??
      cleanString(raw.point_name) ??
      fallback?.aspect,
    location,
    answerName,
    episodeContext:
      cleanString(i18n.episode_context) ??
      cleanString(details.episode_context) ??
      fallback?.episodeContext,
    funfact,
    tags: [
      animeTitle,
      location,
      ...(Array.isArray(record.tags) ? record.tags : []),
    ].filter(Boolean),
  };
}

function compactLocaleOverride(text, fallback) {
  return Object.fromEntries(
    LOCALIZED_TEXT_KEYS.flatMap((key) => {
      const value = text[key];
      if (value === undefined) return [];
      if (JSON.stringify(value) === JSON.stringify(fallback[key])) return [];
      return [[key, value]];
    }),
  );
}

function resolveImagePath(record) {
  const fromRecord =
    record.image_url ??
    record.images?.find((image) => image.role === "point")?.local_path;
  if (fromRecord) return fromRecord;

  const raw = record.raw ?? {};
  const subjectDir = cleanString(raw.subject_dir);
  const pointId = cleanString(raw.point_id);
  if (!subjectDir || !pointId) return undefined;

  for (const ext of LOCAL_IMAGE_EXTENSIONS) {
    const absolutePath = path.join(LOCAL_ANIME_ROOT, subjectDir, `${pointId}${ext}`);
    if (existsSync(absolutePath)) {
      return `anime/${subjectDir}/${pointId}${ext}`;
    }
  }

  return undefined;
}

function compactRecord(record) {
  const details = record.details ?? {};
  const imagePath = resolveImagePath(record);
  const zh = compactLocalizedText(record, "zh");
  const locales = Object.fromEntries(
    LOCALIZED_OUTPUT_LOCALES.map((locale) => [
      locale,
      compactLocaleOverride(compactLocalizedText(record, locale, zh), zh),
    ]),
  );

  const question = {
    id: record.id,
    title: zh.title,
    description: zh.description,
    animeTitle: zh.animeTitle,
    aspect: zh.aspect,
    lat: record.lat,
    lng: record.lng,
    location: zh.location,
    answerName: zh.answerName,
    episodeContext: zh.episodeContext,
    sourceUrl: record.source_url,
    funfact: zh.funfact,
    difficulty:
      Number.isInteger(details.difficulty) &&
      details.difficulty >= 1 &&
      details.difficulty <= 5
        ? details.difficulty
        : undefined,
    confidence: details.confidence ?? "unknown",
    tags: zh.tags,
    locales,
  };

  if (Number.isFinite(record.year)) {
    question.year = record.year;
  }
  if (imagePath) {
    question.imagePath = imagePath;
  }

  return question;
}

const input = JSON.parse(await readFile(inputPath, "utf8"));
const records = Array.isArray(input.records) ? input.records : [];

const questions = records
  .filter(
    (record) => isInsideJapan(record) && typeof record.id === "string",
  )
  .map(compactRecord);

const payload = {
  schemaVersion: 1,
  source: input.source ?? "deepseek+anitabi",
  sourceSchemaVersion: input.schema_version,
  generatedAt: new Date().toISOString(),
  sourceTotal: records.length,
  filters: {
    country: "japan",
  },
  questions,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

const withImagePath = questions.filter((question) => question.imagePath).length;

console.log(
  JSON.stringify(
    {
      outputPath,
      sourceTotal: records.length,
      questions: questions.length,
      withImagePath,
      withoutImagePath: questions.length - withImagePath,
    },
    null,
    2,
  ),
);
