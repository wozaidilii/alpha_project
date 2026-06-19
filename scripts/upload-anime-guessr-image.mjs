#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

const BUCKET = "anime-gussr";
const PUBLIC_BASE_URL = "https://pub-fb0cf55dbd0b4c4cb42bf8312f34dbd4.r2.dev";

function quoteShell(value) {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function joinUrl(baseUrl, objectKey) {
  return `${baseUrl.replace(/\/+$/, "")}/${objectKey.replace(/^\/+/, "")}`;
}

function normalizeObjectKey(value) {
  return value
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/^anime-gussr\//, "");
}

function printUsage() {
  console.log(
    [
      "Upload a 猜动漫模式 image to the Cloudflare R2 anime-gussr bucket.",
      "",
      "Prerequisites:",
      "  npx wrangler login",
      "  npx wrangler r2 bucket dev-url enable anime-gussr",
      "",
      "Usage:",
      "  npm run images:upload-anime -- <local-file> [object-key]",
      "",
      "Examples:",
      "  npm run images:upload-anime -- public/images/anime-placeholder.jpg anime-placeholder.jpg",
      "  npm run images:upload-anime -- ./scene.jpg anime/51_CLANNAD/5c4dgq9pm.jpg",
      "",
      "Raw Wrangler command:",
      "  npx wrangler r2 object put anime-gussr/<object-key> --file <local-file> --remote",
      "",
      `Public base URL: ${PUBLIC_BASE_URL}`,
    ].join("\n"),
  );
}

const [localFile, requestedObjectKey] = process.argv.slice(2);

if (!localFile || localFile === "-h" || localFile === "--help") {
  printUsage();
  process.exit(localFile ? 0 : 1);
}

const objectKey = normalizeObjectKey(
  requestedObjectKey ?? path.basename(localFile),
);

if (!objectKey) {
  console.error("Object key cannot be empty.");
  process.exit(1);
}

const objectPath = `${BUCKET}/${objectKey}`;
const wranglerArgs = [
  "wrangler",
  "r2",
  "object",
  "put",
  objectPath,
  "--file",
  localFile,
  "--remote",
];

console.log(`Running: npx ${wranglerArgs.map(quoteShell).join(" ")}`);

const result = spawnSync("npx", wranglerArgs, {
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Public URL: ${joinUrl(PUBLIC_BASE_URL, objectKey)}`);
