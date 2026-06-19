import { access, readFile } from "node:fs/promises";
import path from "node:path";

const questionsPath = path.join(
  process.cwd(),
  "public/data/anime-guessr-questions.json",
);
const sourceDir = path.join(process.cwd(), "scripts/python/rawdata/anime");

function normalizeObjectKey(value) {
  return value.replaceAll("\\", "/").replace(/^\/+/, "");
}

function resolveLocalPath(sourceDir, objectKey) {
  const normalized = normalizeObjectKey(objectKey);
  if (!normalized.startsWith("anime/")) return null;
  const relative = normalized.slice("anime/".length);
  return path.join(sourceDir, ...relative.split("/"));
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const payload = JSON.parse(await readFile(questionsPath, "utf8"));
const questions = Array.isArray(payload?.questions) ? payload.questions : [];
const questionsWithImageField = questions.filter(
  (question) =>
    typeof question?.imagePath === "string" && question.imagePath.trim(),
).length;
const imagePaths = [
  ...new Set(
    questions
      .map((q) => q.imagePath)
      .filter((value) => typeof value === "string" && value.trim()),
  ),
];

let localExists = 0;
let localMissing = 0;
for (const objectKey of imagePaths) {
  const localPath = resolveLocalPath(sourceDir, objectKey);
  if (localPath && (await fileExists(localPath))) localExists += 1;
  else localMissing += 1;
}

console.log(
  JSON.stringify(
    {
      questionsPath,
      totalQuestions: questions.length,
      questionsWithImageField,
      uniqueImagePaths: imagePaths.length,
      questionsWithoutImagePath: questions.length - questionsWithImageField,
      imagePathWithLocalFile: localExists,
      imagePathMissingLocalFile: localMissing,
      note:
        "上传脚本默认只处理「题库有 imagePath 且本地 rawdata/anime 有对应文件」的条目。总题数含无配图题（仍可玩街景）。重建题库：npm run data:build-anime-guessr",
    },
    null,
    2,
  ),
);
