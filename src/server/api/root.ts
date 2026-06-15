import { eventRouter } from "~/server/api/routers/event";
import { funfactRouter } from "~/server/api/routers/funfact";
import { locationTuxunRouter } from "~/server/api/routers/location-tuxun";
import { postRouter } from "~/server/api/routers/post";
import { playerRouter } from "~/server/api/routers/player";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  event: eventRouter,
  funfact: funfactRouter,
  locationTuxun: locationTuxunRouter,
  post: postRouter,
  player: playerRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
