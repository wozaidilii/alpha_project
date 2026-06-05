import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getBattleHistory,
  getPlayerProfile,
  loginPlayer,
  recordBattleHistory,
  updatePlayerProfile,
  updateSoloHighScore,
} from "~/server/data/player-store";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const avatarSchema = z.object({
  icon: z.string().trim().min(1).max(4),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const tokenSchema = z.object({
  token: z.string().min(1),
});

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

export const playerRouter = createTRPCRouter({
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
        name: z.string().trim().min(1).max(12),
        avatar: avatarSchema,
      }),
    )
    .mutation(({ input }) => {
      return withSessionError(() => updatePlayerProfile(input));
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
