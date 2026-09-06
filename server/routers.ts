import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { createTrip, listTripsByUser, updateTripForUser } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const itinerarySchema = z.string().min(2).max(200_000);
const tripFields = {
  destination: z.string().min(2).max(255),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(2000).optional().nullable(),
  coverImage: z.string().max(2_000_000).optional().nullable(),
  itinerary: itinerarySchema,
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  trips: router({
    list: protectedProcedure.query(({ ctx }) => listTripsByUser(ctx.user.id)),
    create: protectedProcedure.input(z.object(tripFields)).mutation(({ ctx, input }) => createTrip(ctx.user.id, input)),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), destination: tripFields.destination.optional(), startDate: tripFields.startDate.optional(), endDate: tripFields.endDate.optional(), description: tripFields.description, coverImage: tripFields.coverImage, itinerary: tripFields.itinerary.optional() })).mutation(({ ctx, input }) => {
      const { id, ...changes } = input;
      return updateTripForUser(ctx.user.id, id, changes);
    }),
  }),
});

export type AppRouter = typeof appRouter;
