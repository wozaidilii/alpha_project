import { z } from "zod";
import {
  jsonOk,
  parseJsonBody,
  toErrorResponse,
} from "~/server/api/miniprogram";
import { loginPlayerByWechatOpenId } from "~/server/data/player-store";
import { exchangeWechatMiniProgramCode } from "~/server/wechat/miniprogram-auth";

const LoginBodySchema = z.object({
  code: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, LoginBodySchema);
    const openId = await exchangeWechatMiniProgramCode(body.code);
    const session = await loginPlayerByWechatOpenId(openId);
    return jsonOk(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
