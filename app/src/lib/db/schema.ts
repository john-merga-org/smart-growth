import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * User activity only — content lives in git (design §1).
 * Single user today, but every table carries user_id so multi-user is a migration, not a rewrite.
 * Every table has RLS on with no policies: Supabase's Data API (anon/authenticated roles) sees nothing,
 * while the app connects as the table owner, which RLS doesn't apply to. New tables need .enableRLS() too.
 */
const userId = () => text("user_id").notNull().default("me");
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const settings = pgTable("settings", {
  userId: userId().primaryKey(),
  tz: text("tz").notNull().default("UTC"),
  dailyResolveCap: integer("daily_resolve_cap").notNull().default(4),
  dailyCardCap: integer("daily_card_cap").notNull().default(20),
  aiMonthlyCapUsd: real("ai_monthly_cap_usd").notNull().default(10),
}).enableRLS();

export const courseState = pgTable("course_state", {
  userId: userId(),
  courseId: text("course_id").notNull(),
  startedOn: text("started_on"), // Day
}, (t) => [primaryKey({ columns: [t.userId, t.courseId] })]).enableRLS();

export const unitProgress = pgTable("unit_progress", {
  userId: userId(),
  courseId: text("course_id").notNull(),
  unitId: text("unit_id").notNull(),
  buildUrl: text("build_url"),
  buildChecked: boolean("build_checked").notNull().default(false),
  checkpointPassedAt: timestamp("checkpoint_passed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  milestoneScore: text("milestone_score"),
  milestoneNotes: text("milestone_notes"),
}, (t) => [primaryKey({ columns: [t.userId, t.courseId, t.unitId] })]).enableRLS();

export const sectionReads = pgTable("section_reads", {
  userId: userId(),
  courseId: text("course_id").notNull(),
  unitId: text("unit_id").notNull(),
  sectionId: text("section_id").notNull(),
  readAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.courseId, t.unitId, t.sectionId] })]).enableRLS();

/** Drill commits, quiz answers, checkpoint self-grades. Append-only history; latest row wins. */
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  userId: userId(),
  blockKey: text("block_key").notNull(), // course/unit/blockId
  kind: text("kind").notNull(), // drill | quiz | ask | build
  response: jsonb("response"),
  correct: boolean("correct"),
  createdAt: createdAt(),
}, (t) => [index("responses_block_idx").on(t.userId, t.blockKey)]).enableRLS();

/** One row per DSA problem: its place on the re-solve ladder (srs/ladder.ts). */
export const problems = pgTable("problems", {
  userId: userId(),
  key: text("key").notNull(), // lc-217
  courseId: text("course_id").notNull(),
  unitId: text("unit_id").notNull(),
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull(),
  pattern: text("pattern").notNull(),
  url: text("url").notNull(),
  nc: boolean("nc").notNull().default(false),
  status: text("status").notNull().default("new"),
  step: integer("step").notNull().default(0),
  anchor: text("anchor"),
  due: text("due"), // Day
  firstSolvedOn: text("first_solved_on"),
  retiredOn: text("retired_on"),
}, (t) => [primaryKey({ columns: [t.userId, t.key] })]).enableRLS();

export const attempts = pgTable("attempts", {
  id: serial("id").primaryKey(),
  userId: userId(),
  problemKey: text("problem_key").notNull(),
  kind: text("kind").notNull(), // first | resolve
  difficulty: text("difficulty").notNull(),
  ladderLabel: text("ladder_label"), // "+3" etc. at the time of the attempt
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  pauseMs: integer("pause_ms").notNull().default(0),
  pauseUsed: boolean("pause_used").notNull().default(false),
  hintTaken: boolean("hint_taken").notNull().default(false),
  keptGoing: boolean("kept_going").notNull().default(false),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  endedOn: text("ended_on"), // Day, for daily caps
  outcome: text("outcome"), // solved | failed | needed-solution | abandoned
  passed: boolean("passed"),
  alone: boolean("alone"),
  flags: text("flags").array().notNull().default(sql`'{}'::text[]`),
  timeMs: integer("time_ms"),
  notes: text("notes"),
}, (t) => [index("attempts_problem_idx").on(t.userId, t.problemKey), index("attempts_open_idx").on(t.userId, t.endedAt)]).enableRLS();

export const mistakes = pgTable("mistakes", {
  id: serial("id").primaryKey(),
  userId: userId(),
  day: text("day").notNull(),
  problemKey: text("problem_key"),
  problemTitle: text("problem_title"),
  category: text("category").notNull(),
  what: text("what").notNull(),
  rule: text("rule").notNull(),
  createdAt: createdAt(),
}).enableRLS();

/** FSRS review cards: concept cards, wrong quiz answers, failed checkpoint asks, highlight cards. */
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  userId: userId(),
  kind: text("kind").notNull(), // concept | quiz | ask | highlight
  sourceKey: text("source_key").notNull(), // block key, or "highlight:<id>"
  courseId: text("course_id").notNull(),
  unitId: text("unit_id").notNull(),
  front: text("front"), // highlight cards only — others re-render their block
  back: text("back"),
  due: timestamp("due", { withTimezone: true }).notNull(),
  fsrs: jsonb("fsrs").notNull(),
  suspended: boolean("suspended").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("cards_source_idx").on(t.userId, t.sourceKey), index("cards_due_idx").on(t.userId, t.due)]).enableRLS();

export const reviewLogs = pgTable("review_logs", {
  id: serial("id").primaryKey(),
  userId: userId(),
  cardId: integer("card_id").notNull(),
  rating: integer("rating").notNull(), // 1 Again 2 Hard 3 Good 4 Easy
  wasDue: timestamp("was_due", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedOn: text("reviewed_on").notNull(),
}, (t) => [index("review_logs_day_idx").on(t.userId, t.reviewedOn)]).enableRLS();

export const highlights = pgTable("highlights", {
  id: serial("id").primaryKey(),
  userId: userId(),
  courseId: text("course_id").notNull(),
  unitId: text("unit_id").notNull(),
  sectionId: text("section_id"),
  color: text("color").notNull(), // key | confused | aha | interview
  exact: text("exact").notNull(),
  prefix: text("prefix").notNull().default(""),
  suffix: text("suffix").notNull().default(""),
  note: text("note"),
  orphan: boolean("orphan").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }), // for "confused" → Struggles log
  createdAt: createdAt(),
}, (t) => [index("highlights_unit_idx").on(t.userId, t.courseId, t.unitId)]).enableRLS();

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: userId(),
  courseId: text("course_id"),
  unitId: text("unit_id"),
  body: text("body").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  struggle: boolean("struggle").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const resources = pgTable("resources", {
  userId: userId(),
  href: text("href").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  courseId: text("course_id"),
  unitId: text("unit_id"),
  status: text("status").notNull(), // done | saved
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.href] })]).enableRLS();

export const mocks = pgTable("mocks", {
  id: serial("id").primaryKey(),
  userId: userId(),
  day: text("day").notNull(),
  platform: text("platform").notNull(),
  problems: text("problems").notNull(),
  result: text("result").notNull(), // pass | fail | lean-hire | ...
  brokeDown: text("broke_down"),
  fix: text("fix"),
  createdAt: createdAt(),
}).enableRLS();

/** Study-time log for the dashboard: one row per finished activity. */
export const activity = pgTable("activity", {
  id: serial("id").primaryKey(),
  userId: userId(),
  courseId: text("course_id"),
  kind: text("kind").notNull(), // read | attempt | review | quiz | drill | ask
  day: text("day").notNull(),
  minutes: real("minutes").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index("activity_day_idx").on(t.userId, t.day)]).enableRLS();
