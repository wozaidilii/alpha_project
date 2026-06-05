import { readFile } from "node:fs/promises";
import path from "node:path";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const normalized = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length).trim()
    : trimmed;
  const separatorIndex = normalized.indexOf("=");
  if (separatorIndex === -1) return null;

  const key = normalized.slice(0, separatorIndex).trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return null;

  let value = normalized.slice(separatorIndex + 1).trim();
  const quote = value[0];
  if ((quote === "\"" || quote === "'") && value.endsWith(quote)) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, "").trim();
  }

  if (quote === "\"") {
    value = value
      .replaceAll("\\n", "\n")
      .replaceAll("\\r", "\r")
      .replaceAll("\\t", "\t");
  }

  return [key, value];
}

export async function loadEnvFiles(files = [".env", ".env.local"]) {
  const shellKeys = new Set(Object.keys(process.env));

  for (const file of files) {
    let contents;
    try {
      contents = await readFile(path.join(process.cwd(), file), "utf8");
    } catch {
      continue;
    }

    for (const line of contents.split(/\r?\n/)) {
      const entry = parseEnvLine(line);
      if (!entry) continue;

      const [key, value] = entry;
      if (!shellKeys.has(key)) {
        process.env[key] = value;
      }
    }
  }
}
