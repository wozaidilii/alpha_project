import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    DATABASE_URL: z.string().min(1),
    PUSHER_APP_ID: z.string().optional(),
    PUSHER_KEY: z.string().optional(),
    PUSHER_SECRET: z.string().optional(),
    PUSHER_CLUSTER: z.string().optional(),
    WECHAT_MINIPROGRAM_APP_ID: z.string().optional(),
    WECHAT_MINIPROGRAM_APP_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
    NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
    NEXT_PUBLIC_BAIDU_MAP_AK: z.string().optional(),
    NEXT_PUBLIC_TENCENT_MAP_AK: z.string().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_KEY: process.env.PUSHER_KEY,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
    WECHAT_MINIPROGRAM_APP_ID: process.env.WECHAT_MINIPROGRAM_APP_ID,
    WECHAT_MINIPROGRAM_APP_SECRET: process.env.WECHAT_MINIPROGRAM_APP_SECRET,
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    NEXT_PUBLIC_BAIDU_MAP_AK: process.env.NEXT_PUBLIC_BAIDU_MAP_AK,
    NEXT_PUBLIC_TENCENT_MAP_AK: process.env.NEXT_PUBLIC_TENCENT_MAP_AK,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
