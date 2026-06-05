import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env.mjs";

await loadEnvFiles();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  const seed = await readFile(
    path.join(process.cwd(), "db/seed-events.sql"),
    "utf8",
  );
  await sql.unsafe(seed);
  console.log("Historical events seed is ready.");
} finally {
  await sql.end();
}
