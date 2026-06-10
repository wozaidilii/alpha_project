import { z } from "zod";
import {
  getRandomHistoricalEvents,
  getHistoricalEventsByIds,
} from "~/server/data/event-store";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const difficultyInput = z.number().int().min(1).max(5).optional();

export const eventRouter = createTRPCRouter({
  random: publicProcedure
    .input(
      z.object({
        count: z.number().int().min(1).max(20),
        difficulty: difficultyInput,
      }),
    )
    .query(({ input }) => {
      return getRandomHistoricalEvents(input);
    }),

  byIds: publicProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(20) }))
    .query(({ input }) => {
      return getHistoricalEventsByIds(input.ids);
    }),
});
