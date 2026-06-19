import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFiles } from "./load-env.mjs";

const OUTPUT_PATH = path.join(
  process.cwd(),
  "scripts/data/anime-guessr-questions.online.json",
);

function parseArgs(argv) {
  const args = {
    baseUrl: null,
    output: OUTPUT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base-url") {
      args.baseUrl = argv[index + 1] ?? null;
      index += 1;
    } else if (token === "--output") {
      args.output = path.resolve(argv[index + 1] ?? OUTPUT_PATH);
      index += 1;
    }
  }

  return args;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

await loadEnvFiles();

const args = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(
  args.baseUrl?.trim() ||
    process.env.ANIGUESSR_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "",
);

if (!baseUrl) {
  console.error(
    "请提供线上站点地址，例如：\n  npm run data:fetch-aniguessr -- --base-url https://your-domain.vercel.app\n或在 .env.local 中设置 ANIGUESSR_BASE_URL",
  );
  process.exit(1);
}

const url = `${baseUrl}/data/anime-guessr-questions.json`;
console.log(`正在拉取：${url}`);

const response = await fetch(url, {
  headers: { accept: "application/json" },
});

if (!response.ok) {
  throw new Error(`拉取失败：HTTP ${response.status} ${response.statusText}`);
}

const payload = await response.json();
const questionCount = Array.isArray(payload?.questions)
  ? payload.questions.length
  : 0;

await mkdir(path.dirname(args.output), { recursive: true });
await writeFile(args.output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`已保存到 ${path.relative(process.cwd(), args.output)}`);
console.log(`线上题目数：${questionCount}`);
console.log(`源数据总量：${payload?.sourceTotal ?? "n/a"}`);
console.log(`生成时间：${payload?.generatedAt ?? "n/a"}`);
console.log("\n下一步可运行：npm run data:anime-guessr-stats");
