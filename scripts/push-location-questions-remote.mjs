import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env.mjs";

function resolveRemoteDatabaseUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    null
  );
}

function runNodeScript(scriptName) {
  const scriptPath = path.join(process.cwd(), "scripts", scriptName);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} 退出码 ${code}`));
    });
  });
}

await loadEnvFiles();

const remoteUrl = resolveRemoteDatabaseUrl();
if (!remoteUrl) {
  throw new Error(
    "远程库未配置。请在 .env.local 中设置 DATABASE_URL_UNPOOLED（Neon 直连）",
  );
}

process.env.DATABASE_URL = remoteUrl;

console.log("=== push location questions to remote ===");
console.log(`目标库：${remoteUrl.replace(/:[^:@/]+@/, ":****@")}`);

const sql = postgres(remoteUrl, { max: 1, ssl: "require" });

try {
  const schema = await readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");
  await sql.unsafe(schema);
  console.log("远程 schema 已就绪。");
} finally {
  await sql.end();
}

await runNodeScript("import-location-questions.mjs");
console.log("历史寻图题库已推送到线上数据库。");
