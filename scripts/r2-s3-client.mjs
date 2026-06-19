import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const DEFAULT_R2_BUCKET = "anime-gussr";

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export function resolveR2S3Config() {
  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID?.trim() ??
    process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY?.trim() ??
    process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ?? process.env.R2_S3_ENDPOINT?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim() || DEFAULT_R2_BUCKET;

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    endpoint: endpoint.replace(/\/+$/, ""),
    bucket,
  };
}

export function isR2S3Configured() {
  return resolveR2S3Config() != null;
}

export function createR2S3Client(config = resolveR2S3Config()) {
  if (!config) {
    throw new Error(
      "R2 S3 凭证未配置。请在 .env.local 设置 R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_ENDPOINT。",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function resolveContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export async function verifyR2S3Connection(config = resolveR2S3Config()) {
  const client = createR2S3Client(config);
  await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
}

export async function r2ObjectExists(objectKey, config = resolveR2S3Config()) {
  const client = createR2S3Client(config);
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound") {
      return false;
    }
    throw error;
  }
}

export async function uploadToR2({ localPath, objectKey, config = resolveR2S3Config() }) {
  const client = createR2S3Client(config);
  const body = await readFile(localPath);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: resolveContentType(localPath),
    }),
  );
}
