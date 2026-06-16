import { z } from "zod";
import {
  getRandomHistoryYearPuzzle,
  getRandomLocationTuxunPuzzle,
  markLocationTuxunStreetViewUnavailable,
  saveLocationTuxunStreetViewScene,
} from "~/server/data/location-tuxun-store";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const difficultyInput = z.number().int().min(1).max(5).optional();
const sceneInput = z.object({
  location: z.string().min(1),
  lat: z.number().finite(),
  lng: z.number().finite(),
  panoId: z.string().min(1).optional(),
});

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
  randomYear: publicProcedure
    .input(
      z.object({
        excludePuzzleId: z.string().min(1).optional(),
        difficulty: difficultyInput,
      }),
    )
    .query(({ input }) => {
      return getRandomHistoryYearPuzzle(input);
    }),
  saveStreetViewScene: publicProcedure.input(sceneInput).mutation(({ input }) =>
    saveLocationTuxunStreetViewScene({
      location: input.location,
      lat: input.lat,
      lng: input.lng,
      panoId: input.panoId,
    }),
  ),
  markStreetViewUnavailable: publicProcedure
    .input(z.object({ location: z.string().min(1) }))
    .mutation(({ input }) =>
      markLocationTuxunStreetViewUnavailable(input.location),
    ),
});
