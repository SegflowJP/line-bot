import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  listWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  getTodayProgress,
  getProgressByDateRange,
  upsertDailyProgress,
  getSummaryForDate,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Worker Management ────────────────────────────────────────────
  worker: router({
    list: protectedProcedure
      .input(z.object({ activeOnly: z.boolean().optional().default(true) }).optional())
      .query(async ({ input }) => {
        return listWorkers(input?.activeOnly ?? true);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        lineUserId: z.string().optional(),
        language: z.enum(["ja", "en"]).optional().default("ja"),
      }))
      .mutation(async ({ input }) => {
        return createWorker(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        lineUserId: z.string().optional(),
        language: z.enum(["ja", "en"]).optional(),
        isActive: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateWorker(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteWorker(input.id);
        return { success: true };
      }),
  }),

  // ─── Daily Progress ───────────────────────────────────────────────
  progress: router({
    today: protectedProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ input }) => {
        return getTodayProgress(input.date);
      }),

    history: protectedProcedure
      .input(z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }))
      .query(async ({ input }) => {
        return getProgressByDateRange(input.startDate, input.endDate);
      }),

    checkin: protectedProcedure
      .input(z.object({
        workerId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        step: z.enum(["wakeUp", "onTheWay", "arrived"]),
        timeMs: z.number(),
      }))
      .mutation(async ({ input }) => {
        const id = await upsertDailyProgress(input.workerId, input.date, input.step, input.timeMs);
        return { id };
      }),

    summary: protectedProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ input }) => {
        return getSummaryForDate(input.date);
      }),
  }),
});

export type AppRouter = typeof appRouter;
