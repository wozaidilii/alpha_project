import "server-only";

import { env } from "~/env";

interface Code2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export class WeChatMiniProgramAuthError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
  }
}

export async function exchangeWechatMiniProgramCode(
  code: string,
): Promise<string> {
  const appId = env.WECHAT_MINIPROGRAM_APP_ID;
  const appSecret = env.WECHAT_MINIPROGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    throw new WeChatMiniProgramAuthError(
      "WeChat Mini Program credentials are not configured",
      503,
    );
  }

  const search = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: "authorization_code",
  });

  const response = await fetch(
    `https://api.weixin.qq.com/sns/jscode2session?${search.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new WeChatMiniProgramAuthError("WeChat auth request failed");
  }

  const data = (await response.json()) as Code2SessionResponse;

  if (typeof data.openid === "string" && data.openid.length > 0) {
    return data.openid;
  }

  throw new WeChatMiniProgramAuthError(
    data.errmsg ?? "WeChat auth response did not include openid",
  );
}
