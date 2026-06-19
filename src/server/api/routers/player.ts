import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { normalizeCountryCode } from "~/lib/country";
import {
  getAnimeLeaderboard,
  getBattleHistory,
  getPlayerProfile,
  loginPlayer,
  loginPlayerWithPassword,
  recordBattleHistory,
  recordGameSession,
  recordPlayerActivity,
  registerPlayerWithPassword,
  requestEmailLoginCode,
  requestPasswordResetCode,
  resetPlayerPasswordWithCode,
  updatePlayerProfile,
  updateSoloHighScore,
  verifyEmailLoginCode,
} from "~/server/data/player-store";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const activityPayloadSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

const avatarSchema = z.object({
  icon: z.string().trim().min(1).max(4),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const tokenSchema = z.object({
  token: z.string().min(1),
});

const emailSchema = z.string().trim().email().max(254);
const identifierSchema = z.string().trim().min(1).max(254);
const passwordSchema = z.string().min(8).max(128);
const usernameSchema = z.string().trim().min(1).max(12);
const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z]{2}$/)
  .nullable()
  .optional();

function inferCountryCode(headers: Headers) {
  return normalizeCountryCode(
    headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry"),
  );
}

async function withSessionError<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid player session") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "登录已失效，请重新登录",
      });
    }
    throw error;
  }
}

async function withEmailLoginError<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Invalid email verification code" ||
        error.message === "Email verification code expired"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error.message === "Email verification code expired"
              ? "验证码已过期，请重新获取"
              : "验证码不正确",
        });
      }
      if (error.message === "Too many email verification attempts") {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "验证码错误次数过多，请重新获取",
        });
      }
      if (
        error.message === "Email delivery is not configured" ||
        error.message === "Email verification secret is not configured"
      ) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "邮件验证码服务未配置，请稍后再试",
        });
      }
      if (error.message === "Email verification delivery failed") {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "验证码邮件发送失败，请稍后再试",
        });
      }
    }
    throw error;
  }
}

async function withPasswordLoginError<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Email already registered") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "该邮箱已注册，请直接登录",
        });
      }
      if (error.message === "Username already registered") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "该用户名已被使用，请换一个",
        });
      }
      if (error.message === "Invalid account or password") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "账号或密码不正确",
        });
      }
      if (error.message === "Invalid password reset account") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "无法重置该账号的密码",
        });
      }
    }
    throw error;
  }
}

export const playerRouter = createTRPCRouter({
  requestEmailLoginCode: publicProcedure
    .input(
      z.object({
        email: emailSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      return withEmailLoginError(() =>
        requestEmailLoginCode(input.email, {
          userAgent: ctx.headers.get("user-agent"),
        }),
      );
    }),

  verifyEmailLoginCode: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        code: z
          .string()
          .trim()
          .regex(/^\d{6}$/),
      }),
    )
    .mutation(({ input, ctx }) => {
      return withEmailLoginError(() =>
        verifyEmailLoginCode(input.email, input.code, {
          userAgent: ctx.headers.get("user-agent"),
          countryCode: inferCountryCode(ctx.headers),
        }),
      );
    }),

  registerWithPassword: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        username: usernameSchema,
        password: passwordSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      return withPasswordLoginError(() =>
        registerPlayerWithPassword(input, {
          userAgent: ctx.headers.get("user-agent"),
          countryCode: inferCountryCode(ctx.headers),
        }),
      );
    }),

  loginWithPassword: publicProcedure
    .input(
      z.object({
        identifier: identifierSchema,
        password: passwordSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      return withPasswordLoginError(() =>
        loginPlayerWithPassword(input, {
          userAgent: ctx.headers.get("user-agent"),
        }),
      );
    }),

  requestPasswordResetCode: publicProcedure
    .input(
      z.object({
        email: emailSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      return withEmailLoginError(() =>
        requestPasswordResetCode(input.email, {
          userAgent: ctx.headers.get("user-agent"),
        }),
      );
    }),

  resetPasswordWithCode: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        code: z
          .string()
          .trim()
          .regex(/^\d{6}$/),
        password: passwordSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      return withEmailLoginError(() =>
        withPasswordLoginError(() =>
          resetPlayerPasswordWithCode(input, {
            userAgent: ctx.headers.get("user-agent"),
          }),
        ),
      );
    }),

  login: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        name: z.string().trim().min(1).max(12),
        avatar: avatarSchema.optional(),
      }),
    )
    .mutation(({ input }) => {
      return loginPlayer(input);
    }),

  me: publicProcedure.input(tokenSchema).query(({ input }) => {
    return withSessionError(() => getPlayerProfile(input.token));
  }),

  updateProfile: publicProcedure
    .input(
      tokenSchema.extend({
        name: usernameSchema,
        avatar: avatarSchema,
        countryCode: countryCodeSchema,
      }),
    )
    .mutation(({ input }) => {
      return withPasswordLoginError(() =>
        withSessionError(() => updatePlayerProfile(input)),
      );
    }),

  updateSoloHighScore: publicProcedure
    .input(
      tokenSchema.extend({
        score: z.number().int().nonnegative().max(50000),
      }),
    )
    .mutation(({ input }) => {
      return withSessionError(() => updateSoloHighScore(input));
    }),

  history: publicProcedure.input(tokenSchema).query(({ input }) => {
    return withSessionError(() => getBattleHistory(input.token));
  }),

  recordActivity: publicProcedure
    .input(
      tokenSchema.extend({
        eventType: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .regex(/^[a-z0-9_.:-]+$/i),
        payload: activityPayloadSchema.optional(),
        route: z.string().trim().max(200).optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return withSessionError(() =>
        recordPlayerActivity({
          token: input.token,
          eventType: input.eventType,
          payload: input.payload,
          route: input.route,
          userAgent: ctx.headers.get("user-agent"),
        }),
      );
    }),

  recordGameSession: publicProcedure
    .input(
      z.object({
        token: z.string().min(1).optional(),
        guestId: z.string().trim().min(1).max(120).optional(),
        score: z.number().int().nonnegative().max(50000),
        country: z.string().trim().min(1).max(80),
        mode: z.string().trim().min(1).max(40),
        rounds: z.number().int().nonnegative().max(20),
      }),
    )
    .mutation(({ input }) => {
      return withSessionError(() => recordGameSession(input));
    }),

  leaderboard: publicProcedure
    .input(
      z
        .object({
          token: z.string().min(1).optional(),
          limit: z.number().int().min(1).max(50).optional(),
          rounds: z.union([z.literal(5), z.literal(10)]).optional(),
        })
        .optional(),
    )
    .query(({ input }) => {
      return withSessionError(() => getAnimeLeaderboard(input ?? {}));
    }),

  recordBattle: publicProcedure
    .input(
      tokenSchema.extend({
        roomId: z.string().trim().min(1).max(12),
        outcome: z.enum(["win", "loss", "draw"]),
        opponentName: z.string().trim().min(1).max(12),
        opponentAvatar: avatarSchema,
        totalScore: z.number().int().nonnegative(),
        opponentScore: z.number().int().nonnegative(),
        remainingHp: z.number().int().nonnegative(),
        opponentHp: z.number().int().nonnegative(),
        roundsPlayed: z.number().int().positive().max(20),
      }),
    )
    .mutation(({ input }) => {
      const { token, ...record } = input;
      return withSessionError(() => recordBattleHistory({ token, record }));
    }),
});
