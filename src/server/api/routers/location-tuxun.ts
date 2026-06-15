import { z } from "zod";
import { getRandomLocationTuxunPuzzle } from "~/server/data/location-tuxun-store";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const difficultyInput = z.number().int().min(1).max(5).optional();

export const locationTuxunRouter = createTRPCRouter({
  random: publicProcedure
    .input(
      z.object({
        excludeLocation: z.string().min(1).optional(),
        difficulty: difficultyInput,
      }),
    )
    .query(({ input }) => {
      return getRandomLocationTuxunPuzzle(input);
    }),
});
