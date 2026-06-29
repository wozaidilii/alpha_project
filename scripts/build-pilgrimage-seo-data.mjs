import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_PATH = path.join(
  process.cwd(),
  "public/data/anime-guessr-questions.json",
);
const OUTPUT_DIR = path.join(process.cwd(), "public/data/seo");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "index.json");

function subjectIdFromQuestion(question) {
  const tag = (question.tags ?? []).find((item) =>
    String(item).startsWith("subject:"),
  );
  if (tag) return String(tag).slice("subject:".length);
  const match = /^anitabi_(\d+)_/u.exec(question.id ?? "");
  return match?.[1] ?? null;
}

function slugifyAnime(subjectId, animeTitle) {
  const trimmed = String(animeTitle ?? "").trim();
  const suffix = trimmed
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return suffix ? `${subjectId}-${suffix}` : `anime-${subjectId}`;
}

function slugifyLocation(location) {
  return encodeURIComponent(String(location ?? "").trim());
}

function pickLocalized(question, field) {
  return {
    zh: question[field],
    ja: question.locales?.ja?.[field] ?? question[field],
    en: question.locales?.en?.[field] ?? question[field],
  };
}

function toSpotEntry(question, subjectId, subjectSlug, locationSlug) {
  return {
    id: question.id,
    subjectId,
    subjectSlug,
    locationSlug,
    lat: question.lat,
    lng: question.lng,
    year: question.year ?? null,
    difficulty: question.difficulty ?? null,
    confidence: question.confidence ?? "unknown",
    imagePath: question.imagePath ?? null,
    sourceUrl: question.sourceUrl ?? null,
    title: pickLocalized(question, "title"),
    description: pickLocalized(question, "description"),
    animeTitle: pickLocalized(question, "animeTitle"),
    location: pickLocalized(question, "location"),
    answerName: pickLocalized(question, "answerName"),
    aspect: question.aspect ?? null,
    episodeContext: question.episodeContext ?? null,
    funfact: Array.isArray(question.funfact) ? question.funfact.slice(0, 5) : [],
  };
}

async function main() {
  const raw = await readFile(SOURCE_PATH, "utf8");
  const payload = JSON.parse(raw);
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];

  const animeMap = new Map();
  const locationMap = new Map();
  const spots = {};

  for (const question of questions) {
    if (!question?.id || typeof question.lat !== "number") continue;

    const subjectId = subjectIdFromQuestion(question) ?? "unknown";
    const animeTitle = question.animeTitle ?? "Unknown";
    const subjectSlug = slugifyAnime(subjectId, animeTitle);
    const locationName = question.location ?? "unknown";
    const locationSlug = slugifyLocation(locationName);

    if (!animeMap.has(subjectId)) {
      animeMap.set(subjectId, {
        subjectId,
        slug: subjectSlug,
        animeTitle,
        spotCount: 0,
        locationSlugs: new Set(),
        years: new Set(),
      });
    }
    const anime = animeMap.get(subjectId);
    anime.spotCount += 1;
    anime.locationSlugs.add(locationSlug);
    if (question.year) anime.years.add(question.year);

    if (!locationMap.has(locationSlug)) {
      locationMap.set(locationSlug, {
        slug: locationSlug,
        name: locationName,
        spotCount: 0,
        subjectIds: new Set(),
      });
    }
    const location = locationMap.get(locationSlug);
    location.spotCount += 1;
    location.subjectIds.add(subjectId);

    spots[question.id] = toSpotEntry(
      question,
      subjectId,
      subjectSlug,
      locationSlug,
    );
  }

  const animes = [...animeMap.values()]
    .map((item) => ({
      subjectId: item.subjectId,
      slug: item.slug,
      animeTitle: item.animeTitle,
      spotCount: item.spotCount,
      locationCount: item.locationSlugs.size,
      years: [...item.years].sort((a, b) => a - b),
    }))
    .sort(
      (a, b) =>
        b.spotCount - a.spotCount ||
        a.animeTitle.localeCompare(b.animeTitle, "zh"),
    );

  const locations = [...locationMap.values()]
    .map((item) => ({
      slug: item.slug,
      name: item.name,
      spotCount: item.spotCount,
      animeCount: item.subjectIds.size,
    }))
    .sort(
      (a, b) =>
        b.spotCount - a.spotCount || a.name.localeCompare(b.name, "zh"),
    );

  const spotIds = Object.keys(spots).sort();

  const output = {
    generatedAt: new Date().toISOString(),
    sourceQuestionCount: questions.length,
    spotCount: spotIds.length,
    animeCount: animes.length,
    locationCount: locations.length,
    animes,
    locations,
    spotIds,
    spots,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output));

  console.log(
    `pilgrimage SEO index: ${spotIds.length} spots, ${animes.length} anime, ${locations.length} locations`,
  );
  console.log(`written to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
