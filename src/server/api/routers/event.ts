import { z } from "zod";
import { getRandomHistoricalEvents } from "~/server/data/event-store";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const eventRouter = createTRPCRouter({
  random: publicProcedure
    .input(z.object({ count: z.number().int().min(1).max(20) }))
    .query(({ input }) => {
      return getRandomHistoricalEvents(input.count);
    }),
});
