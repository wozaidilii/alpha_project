import { z } from "zod";
import {
  getRandomFunfactQuestions,
  getFunfactQuestionsByIds,
} from "~/server/data/funfact-store";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const funfactRouter = createTRPCRouter({
  random: publicProcedure
    .input(z.object({ count: z.number().int().min(1).max(20) }))
    .query(({ input }) => {
      return getRandomFunfactQuestions(input.count);
    }),

  byIds: publicProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(20) }))
    .query(({ input }) => {
      return getFunfactQuestionsByIds(input.ids);
    }),
});
