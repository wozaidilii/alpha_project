/** 解析 @vercel/blob put() 所需的鉴权参数 */

const OIDC_DEV_DISABLED =
  /OIDC is enabled for this project, but not for the "development" environment/i;

export function resolveBlobAccess() {
  const configured = process.env.BLOB_ACCESS?.trim().toLowerCase();
  if (configured === "public" || configured === "private") {
    return configured;
  }
  return "private";
}

export function resolveBlobPutOptions() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    return { token, mode: "token" };
  }

  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const storeId = process.env.BLOB_STORE_ID?.trim();
  if (oidcToken && storeId) {
    return { oidcToken, storeId, mode: "oidc" };
  }

  const hints = [
    "本地脚本上传需要以下任一鉴权方式：",
    "1) 在 .env.local 设置 BLOB_READ_WRITE_TOKEN（Blob Store → Settings → Read-Write Token）",
    "2) 或同时设置 VERCEL_OIDC_TOKEN + BLOB_STORE_ID，并在 Blob Store 的 Projects 里为 alpha-project 开启 Development 环境的 OIDC",
    "3) 然后执行 vercel env pull .env.local",
  ];

  if (oidcToken && !storeId) {
    hints.unshift(
      "已检测到 VERCEL_OIDC_TOKEN，但缺少 BLOB_STORE_ID。请运行 vercel env pull .env.local。",
    );
  } else if (storeId && !oidcToken) {
    hints.unshift(
      "已检测到 BLOB_STORE_ID，但缺少 VERCEL_OIDC_TOKEN。请运行 vercel env pull .env.local。",
    );
  }

  throw new Error(hints.join("\n"));
}

export function formatBlobAuthError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!OIDC_DEV_DISABLED.test(message)) {
    return message;
  }

  return [
    message,
    "",
    "原因：当前 Blob Store 创建时未包含 Development 环境，本地 vercel env pull 拿到的 OIDC 无法写入。",
    "解决方案（推荐用 CLI，控制台没有单独的 Development 勾选框）：",
    "1) 删除空 Store 并用 CLI 重建（含 development）：",
    "   vercel blob delete-store <storeId> --yes",
    "   vercel blob create-store alpha-project-blob --access private --region hkg1 \\",
    "     --environment production --environment preview --environment development --yes",
    "   vercel env pull .env.local",
    "2) 或把 .env.local 里的 BLOB_READ_WRITE_TOKEN 填好（重建后 vercel env pull 会自动写入）",
  ].join("\n");
}
