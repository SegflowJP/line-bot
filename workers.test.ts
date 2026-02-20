import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => {
  let mockWorkers: any[] = [];
  let mockProgress: any[] = [];
  let nextWorkerId = 1;
  let nextProgressId = 1;

  return {
    listWorkers: vi.fn(async (activeOnly: boolean) => {
      if (activeOnly) return mockWorkers.filter((w) => w.isActive === 1);
      return mockWorkers;
    }),
    createWorker: vi.fn(async (data: any) => {
      const id = nextWorkerId++;
      mockWorkers.push({
        id,
        name: data.name,
        lineUserId: data.lineUserId ?? null,
        language: data.language ?? "ja",
        isActive: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id };
    }),
    updateWorker: vi.fn(async (id: number, data: any) => {
      const worker = mockWorkers.find((w) => w.id === id);
      if (worker) {
        if (data.name !== undefined) worker.name = data.name;
        if (data.lineUserId !== undefined) worker.lineUserId = data.lineUserId;
        if (data.language !== undefined) worker.language = data.language;
        if (data.isActive !== undefined) worker.isActive = data.isActive;
      }
    }),
    deleteWorker: vi.fn(async (id: number) => {
      const worker = mockWorkers.find((w) => w.id === id);
      if (worker) worker.isActive = 0;
    }),
    getTodayProgress: vi.fn(async (dateStr: string) => {
      return mockProgress.filter((p) => p.date === dateStr);
    }),
    getProgressByDateRange: vi.fn(async (startDate: string, endDate: string) => {
      return mockProgress.filter((p) => p.date >= startDate && p.date <= endDate);
    }),
    upsertDailyProgress: vi.fn(async (workerId: number, dateStr: string, step: string, timeMs: number) => {
      let existing = mockProgress.find((p) => p.workerId === workerId && p.date === dateStr);
      if (existing) {
        if (step === "wakeUp") existing.wakeUpTime = timeMs;
        else if (step === "onTheWay") existing.onTheWayTime = timeMs;
        else if (step === "arrived") existing.arrivedTime = timeMs;
        return existing.id;
      } else {
        const id = nextProgressId++;
        const entry: any = { id, workerId, date: dateStr, wakeUpTime: null, onTheWayTime: null, arrivedTime: null };
        if (step === "wakeUp") entry.wakeUpTime = timeMs;
        else if (step === "onTheWay") entry.onTheWayTime = timeMs;
        else if (step === "arrived") entry.arrivedTime = timeMs;
        mockProgress.push(entry);
        return id;
      }
    }),
    getSummaryForDate: vi.fn(async (dateStr: string) => {
      const activeWorkers = mockWorkers.filter((w) => w.isActive === 1);
      const progress = mockProgress.filter((p) => p.date === dateStr);
      const progressMap = new Map(progress.map((p: any) => [p.workerId, p]));
      let awake = 0, onTheWay = 0, arrived = 0, noResponse = 0;
      for (const w of activeWorkers) {
        const p = progressMap.get(w.id) as any;
        if (!p) { noResponse++; continue; }
        if (p.arrivedTime) { arrived++; }
        else if (p.onTheWayTime) { onTheWay++; }
        else if (p.wakeUpTime) { awake++; }
        else { noResponse++; }
      }
      return { total: activeWorkers.length, awake, onTheWay, arrived, noResponse };
    }),
    // Keep original user functions
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getDb: vi.fn(),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-manager",
    email: "manager@woodcompany.jp",
    name: "Test Manager",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("worker procedures", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("creates a worker with Japanese language by default", async () => {
    const result = await caller.worker.create({ name: "田中太郎" });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("creates a worker with English language preference", async () => {
    const result = await caller.worker.create({ name: "John Smith", language: "en" });
    expect(result).toHaveProperty("id");
  });

  it("lists active workers", async () => {
    const workers = await caller.worker.list({ activeOnly: true });
    expect(Array.isArray(workers)).toBe(true);
  });

  it("lists all workers including inactive", async () => {
    const workers = await caller.worker.list({ activeOnly: false });
    expect(Array.isArray(workers)).toBe(true);
  });

  it("updates a worker's language preference", async () => {
    const created = await caller.worker.create({ name: "佐藤花子" });
    const result = await caller.worker.update({ id: created.id, language: "en" });
    expect(result).toEqual({ success: true });
  });

  it("deletes (deactivates) a worker", async () => {
    const created = await caller.worker.create({ name: "鈴木一郎" });
    const result = await caller.worker.delete({ id: created.id });
    expect(result).toEqual({ success: true });
  });
});

describe("progress procedures", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("records a wake-up check-in", async () => {
    const worker = await caller.worker.create({ name: "テスト作業員" });
    const result = await caller.progress.checkin({
      workerId: worker.id,
      date: "2026-02-18",
      step: "wakeUp",
      timeMs: Date.now(),
    });
    expect(result).toHaveProperty("id");
  });

  it("records an on-the-way check-in", async () => {
    const worker = await caller.worker.create({ name: "移動テスト" });
    const result = await caller.progress.checkin({
      workerId: worker.id,
      date: "2026-02-18",
      step: "onTheWay",
      timeMs: Date.now(),
    });
    expect(result).toHaveProperty("id");
  });

  it("records an arrived check-in", async () => {
    const worker = await caller.worker.create({ name: "到着テスト" });
    const result = await caller.progress.checkin({
      workerId: worker.id,
      date: "2026-02-18",
      step: "arrived",
      timeMs: Date.now(),
    });
    expect(result).toHaveProperty("id");
  });

  it("fetches today's progress", async () => {
    const progress = await caller.progress.today({ date: "2026-02-18" });
    expect(Array.isArray(progress)).toBe(true);
  });

  it("fetches progress history for a date range", async () => {
    const history = await caller.progress.history({
      startDate: "2026-02-01",
      endDate: "2026-02-18",
    });
    expect(Array.isArray(history)).toBe(true);
  });

  it("fetches summary statistics for a date", async () => {
    const summary = await caller.progress.summary({ date: "2026-02-18" });
    expect(summary).toHaveProperty("total");
    expect(summary).toHaveProperty("awake");
    expect(summary).toHaveProperty("onTheWay");
    expect(summary).toHaveProperty("arrived");
    expect(summary).toHaveProperty("noResponse");
    expect(typeof summary.total).toBe("number");
  });

  it("validates date format for today query", async () => {
    await expect(
      caller.progress.today({ date: "invalid-date" })
    ).rejects.toThrow();
  });

  it("validates date format for history query", async () => {
    await expect(
      caller.progress.history({ startDate: "bad", endDate: "bad" })
    ).rejects.toThrow();
  });

  it("validates step enum for checkin", async () => {
    await expect(
      caller.progress.checkin({
        workerId: 1,
        date: "2026-02-18",
        step: "invalidStep" as any,
        timeMs: Date.now(),
      })
    ).rejects.toThrow();
  });
});
