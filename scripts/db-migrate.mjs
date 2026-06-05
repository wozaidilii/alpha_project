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
  const schema = await readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");
  await sql.unsafe(schema);
  console.log("Database schema is ready.");
} finally {
  await sql.end();
}
