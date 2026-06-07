import { z } from "zod";
import {
  getRandomHistoricalEvents,
  getHistoricalEventsByIds,
} from "~/server/data/event-store";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const eventRouter = createTRPCRouter({
  random: publicProcedure
    .input(z.object({ count: z.number().int().min(1).max(20) }))
    .query(({ input }) => {
      return getRandomHistoricalEvents(input.count);
    }),

  byIds: publicProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(20) }))
    .query(({ input }) => {
      return getHistoricalEventsByIds(input.ids);
    }),
});
