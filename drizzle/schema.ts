import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);
const ideaChangeTypeEnum = pgEnum("idea_change_type", [
  "edit",
  "ai_session",
  "privacy_change",
  "created",
]);

// ─── Users ───────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Ideas ───────────────────────────────────────────────────────────
export const ideas = pgTable("ideas", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  problem: text("problem"),
  targetUsers: text("targetUsers"),
  solution: text("solution"),
  notes: text("notes"),
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Idea = typeof ideas.$inferSelect;
export type InsertIdea = typeof ideas.$inferInsert;

// ─── AI Conversations ────────────────────────────────────────────────
export const conversations = pgTable("conversations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  ideaId: integer("ideaId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ─── Conversation Messages ───────────────────────────────────────────
export const messages = pgTable("messages", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  conversationId: integer("conversationId").notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Community Comments ──────────────────────────────────────────────
export const comments = pgTable("comments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  ideaId: integer("ideaId").notNull(),
  userId: integer("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// ─── Idea History (edit tracking) ────────────────────────────────────
export const ideaHistory = pgTable("idea_history", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  ideaId: integer("ideaId").notNull(),
  userId: integer("userId").notNull(),
  changeType: ideaChangeTypeEnum("changeType").notNull(),
  changeSummary: text("changeSummary"),
  previousData: jsonb("previousData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IdeaHistory = typeof ideaHistory.$inferSelect;
export type InsertIdeaHistory = typeof ideaHistory.$inferInsert;
