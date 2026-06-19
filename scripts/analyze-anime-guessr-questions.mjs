import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { loadEnvFiles } from "./load-env.mjs";

const LOCAL_PATH = path.join(
  process.cwd(),
  "public/data/anime-guessr-questions.json",
);
const ONLINE_CACHE_PATH = path.join(
  process.cwd(),
  "scripts/data/anime-guessr-questions.online.json",
);
const REPORT_PATH = path.join(
  process.cwd(),
  "scripts/data/anime-guessr-questions.report.json",
);

function parseArgs(argv) {
  const args = { online: null, writeReport: true };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--online") {
      args.online = argv[index + 1] ?? ONLINE_CACHE_PATH;
      index += 1;
    } else if (token === "--no-write") {
      args.writeReport = false;
    }
  }
  return args;
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function topEntries(map, limit = 15) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function subjectIdFromQuestion(question) {
  const tag = (question.tags ?? []).find((item) =>
    String(item).startsWith("subject:"),
  );
  if (tag) return String(tag).slice("subject:".length);
  const match = /^anitabi_(\d+)_/u.exec(question.id ?? "");
  return match?.[1] ?? null;
}

function analyzeBundle(label, payload) {
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const byDifficulty = new Map();
  const byConfidence = new Map();
  const byLocation = new Map();
  const byAnimeTitle = new Map();
  const bySubject = new Map();
  const byYear = new Map();

  let withImagePath = 0;
  let withSourceUrl = 0;
  let withEpisodeContext = 0;
  let withJaLocale = 0;
  let withEnLocale = 0;
  let withFunfact = 0;

  for (const question of questions) {
    increment(byDifficulty, String(question.difficulty ?? "unknown"));
    increment(byConfidence, String(question.confidence ?? "unknown"));
    increment(byLocation, question.location ?? "unknown");
    increment(byAnimeTitle, question.animeTitle ?? "unknown");
    increment(byYear, String(question.year ?? "unknown"));

    const subjectId = subjectIdFromQuestion(question);
    if (subjectId) increment(bySubject, subjectId);

    if (question.imagePath) withImagePath += 1;
    if (question.sourceUrl) withSourceUrl += 1;
    if (question.episodeContext) withEpisodeContext += 1;
    if (question.locales?.ja) withJaLocale += 1;
    if (question.locales?.en) withEnLocale += 1;
    if (Array.isArray(question.funfact) && question.funfact.length > 0) {
      withFunfact += 1;
    }
  }

  return {
    label,
    schemaVersion: payload?.schemaVersion ?? null,
    generatedAt: payload?.generatedAt ?? null,
    source: payload?.source ?? null,
    sourceTotal: payload?.sourceTotal ?? null,
    filters: payload?.filters ?? null,
    questionCount: questions.length,
    uniqueAnimeTitles: byAnimeTitle.size,
    uniqueLocations: byLocation.size,
    uniqueSubjects: bySubject.size,
    coverage: {
      withImagePath,
      withSourceUrl,
      withEpisodeContext,
      withJaLocale,
      withEnLocale,
      withFunfact,
    },
    byDifficulty: topEntries(byDifficulty, 10),
    byConfidence: topEntries(byConfidence, 10),
    topLocations: topEntries(byLocation, 20),
    topAnimeTitles: topEntries(byAnimeTitle, 20),
    topSubjects: topEntries(bySubject, 20),
    byYear: topEntries(byYear, 12),
    questionIds: questions.map((question) => question.id),
  };
}

function compareBundles(local, online) {
  const localIds = new Set(local.questionIds);
  const onlineIds = new Set(online.questionIds);
  const onlyLocal = [...localIds].filter((id) => !onlineIds.has(id));
  const onlyOnline = [...onlineIds].filter((id) => !localIds.has(id));

  return {
    localCount: localIds.size,
    onlineCount: onlineIds.size,
    sharedCount: [...localIds].filter((id) => onlineIds.has(id)).length,
    onlyLocalCount: onlyLocal.length,
    onlyOnlineCount: onlyOnline.length,
    onlyLocalSample: onlyLocal.slice(0, 20),
    onlyOnlineSample: onlyOnline.slice(0, 20),
  };
}

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function printBundle(bundle) {
  printSection(bundle.label);
  console.log(`题目数：${bundle.questionCount}`);
  console.log(`源数据总量：${bundle.sourceTotal ?? "n/a"}`);
  console.log(`生成时间：${bundle.generatedAt ?? "n/a"}`);
  console.log(`独立作品数：${bundle.uniqueAnimeTitles}`);
  console.log(`独立地点数：${bundle.uniqueLocations}`);
  console.log(`独立 subject 数：${bundle.uniqueSubjects}`);
  console.log(
    `覆盖率：imagePath ${bundle.coverage.withImagePath} · sourceUrl ${bundle.coverage.withSourceUrl} · episodeContext ${bundle.coverage.withEpisodeContext} · ja ${bundle.coverage.withJaLocale} · en ${bundle.coverage.withEnLocale} · funfact ${bundle.coverage.withFunfact}`,
  );
  console.log("难度分布：", bundle.byDifficulty);
  console.log("置信度分布：", bundle.byConfidence);
  console.log("热门地点 Top：", bundle.topLocations.slice(0, 10));
  console.log("热门作品 Top：", bundle.topAnimeTitles.slice(0, 10));
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

const args = parseArgs(process.argv.slice(2));
await loadEnvFiles();

const localPayload = JSON.parse(await readFile(LOCAL_PATH, "utf8"));
const localStats = analyzeBundle("本地 public/data", localPayload);
printBundle(localStats);

let onlineStats = null;
let comparison = null;
const onlinePath = args.online ?? ONLINE_CACHE_PATH;
const onlinePayload = await readJsonIfExists(onlinePath);

if (onlinePayload) {
  onlineStats = analyzeBundle(`线上缓存 ${path.relative(process.cwd(), onlinePath)}`, onlinePayload);
  printBundle(onlineStats);
  comparison = compareBundles(localStats, onlineStats);
  printSection("本地 vs 线上");
  console.log(comparison);
} else {
  console.log(
    `\n未找到线上缓存：${onlinePath}\n可先运行：npm run data:fetch-aniguessr -- --base-url https://你的域名`,
  );
}

const report = {
  generatedAt: new Date().toISOString(),
  local: localStats,
  online: onlineStats,
  comparison,
};

if (args.writeReport) {
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\n报告已写入 ${path.relative(process.cwd(), REPORT_PATH)}`);
}
