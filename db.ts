import { eq, and, between, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, workers, dailyProgress, type InsertWorker, type Worker, type DailyProgress } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ───────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Worker helpers ─────────────────────────────────────────────────

export async function listWorkers(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(workers).where(eq(workers.isActive, 1)).orderBy(workers.name);
  }
  return db.select().from(workers).orderBy(workers.name);
}

export async function getWorkerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
  return result[0];
}

export async function createWorker(data: { name: string; lineUserId?: string; language?: "ja" | "en" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const values: InsertWorker = {
    name: data.name,
    lineUserId: data.lineUserId ?? null,
    language: data.language ?? "ja",
  };
  const result = await db.insert(workers).values(values);
  return { id: result[0].insertId };
}

export async function updateWorker(id: number, data: { name?: string; lineUserId?: string; language?: "ja" | "en"; isActive?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.lineUserId !== undefined) updateSet.lineUserId = data.lineUserId;
  if (data.language !== undefined) updateSet.language = data.language;
  if (data.isActive !== undefined) updateSet.isActive = data.isActive;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(workers).set(updateSet).where(eq(workers.id, id));
}

export async function deleteWorker(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workers).set({ isActive: 0 }).where(eq(workers.id, id));
}

// ─── Daily Progress helpers ─────────────────────────────────────────

export async function getTodayProgress(dateStr: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyProgress).where(eq(dailyProgress.date, dateStr));
}

export async function getProgressByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyProgress)
    .where(between(dailyProgress.date, startDate, endDate))
    .orderBy(desc(dailyProgress.date));
}

export async function upsertDailyProgress(workerId: number, dateStr: string, step: "wakeUp" | "onTheWay" | "arrived", timeMs: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(dailyProgress)
    .where(and(eq(dailyProgress.workerId, workerId), eq(dailyProgress.date, dateStr)))
    .limit(1);

  if (existing.length > 0) {
    const updateSet: Record<string, unknown> = {};
    if (step === "wakeUp") updateSet.wakeUpTime = timeMs;
    else if (step === "onTheWay") updateSet.onTheWayTime = timeMs;
    else if (step === "arrived") updateSet.arrivedTime = timeMs;
    await db.update(dailyProgress).set(updateSet).where(eq(dailyProgress.id, existing[0].id));
    return existing[0].id;
  } else {
    const values: any = {
      workerId,
      date: dateStr,
    };
    if (step === "wakeUp") values.wakeUpTime = timeMs;
    else if (step === "onTheWay") values.onTheWayTime = timeMs;
    else if (step === "arrived") values.arrivedTime = timeMs;
    const result = await db.insert(dailyProgress).values(values);
    return result[0].insertId;
  }
}

export async function getSummaryForDate(dateStr: string) {
  const db = await getDb();
  if (!db) return { total: 0, awake: 0, onTheWay: 0, arrived: 0, noResponse: 0 };

  const activeWorkers = await db.select().from(workers).where(eq(workers.isActive, 1));
  const progress = await db.select().from(dailyProgress).where(eq(dailyProgress.date, dateStr));

  const progressMap = new Map(progress.map(p => [p.workerId, p]));
  let awake = 0, onTheWay = 0, arrived = 0, noResponse = 0;

  for (const w of activeWorkers) {
    const p = progressMap.get(w.id);
    if (!p) { noResponse++; continue; }
    if (p.arrivedTime) { arrived++; }
    else if (p.onTheWayTime) { onTheWay++; }
    else if (p.wakeUpTime) { awake++; }
    else { noResponse++; }
  }

  return { total: activeWorkers.length, awake, onTheWay, arrived, noResponse };
}
