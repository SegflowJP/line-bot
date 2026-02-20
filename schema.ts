import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow (admin/manager).
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Workers table — each worker tracked by the LINE bot.
 * lineUserId is the LINE platform user ID.
 * language stores their preferred language for LINE messages (ja or en).
 */
export const workers = mysqlTable("workers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  lineUserId: varchar("lineUserId", { length: 64 }),
  language: mysqlEnum("language", ["ja", "en"]).default("ja").notNull(),
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Worker = typeof workers.$inferSelect;
export type InsertWorker = typeof workers.$inferInsert;

/**
 * Daily progress table — tracks the 3-step check-in for each worker per day.
 * Timestamps stored as UTC milliseconds (bigint) for each step.
 * null means the worker has not completed that step yet.
 */
export const dailyProgress = mysqlTable("daily_progress", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("workerId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  wakeUpTime: bigint("wakeUpTime", { mode: "number" }), // UTC ms
  onTheWayTime: bigint("onTheWayTime", { mode: "number" }), // UTC ms
  arrivedTime: bigint("arrivedTime", { mode: "number" }), // UTC ms
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyProgress = typeof dailyProgress.$inferSelect;
export type InsertDailyProgress = typeof dailyProgress.$inferInsert;
