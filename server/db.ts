import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  ideas,
  InsertIdea,
  conversations,
  InsertConversation,
  messages,
  InsertMessage,
  comments,
  InsertComment,
  ideaHistory,
  InsertIdeaHistory,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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
      values.role = "admin";
      updateSet.role = "admin";
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

// ─── Idea Queries ────────────────────────────────────────────────────

export async function getUserIdeas(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ideas).where(eq(ideas.userId, userId)).orderBy(desc(ideas.updatedAt));
}

export async function getIdeaById(ideaId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createIdea(data: InsertIdea) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(ideas).values(data).$returningId();
  return result.id;
}

export async function updateIdea(id: number, data: Partial<InsertIdea>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ideas).set(data).where(eq(ideas.id, id));
}

export async function deleteIdea(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(comments).where(eq(comments.ideaId, id));
  await db.delete(ideaHistory).where(eq(ideaHistory.ideaId, id));
  const convos = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.ideaId, id));
  for (const c of convos) {
    await db.delete(messages).where(eq(messages.conversationId, c.id));
  }
  await db.delete(conversations).where(eq(conversations.ideaId, id));
  await db.delete(ideas).where(eq(ideas.id, id));
}

export async function getPublicIdeas() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: ideas.id,
      userId: ideas.userId,
      title: ideas.title,
      description: ideas.description,
      problem: ideas.problem,
      targetUsers: ideas.targetUsers,
      solution: ideas.solution,
      notes: ideas.notes,
      isPublic: ideas.isPublic,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
      authorName: users.name,
    })
    .from(ideas)
    .leftJoin(users, eq(ideas.userId, users.id))
    .where(eq(ideas.isPublic, true))
    .orderBy(desc(ideas.updatedAt));
}

// ─── Conversation Queries ────────────────────────────────────────────

export async function getOrCreateConversation(ideaId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.ideaId, ideaId), eq(conversations.userId, userId)))
    .orderBy(desc(conversations.updatedAt))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [result] = await db.insert(conversations).values({ ideaId, userId }).$returningId();
  const created = await db.select().from(conversations).where(eq(conversations.id, result.id)).limit(1);
  return created[0];
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

export async function addMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(messages).values(data).$returningId();
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, data.conversationId));
  return result.id;
}

// ─── Comment Queries ─────────────────────────────────────────────────

export async function getIdeaComments(ideaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: comments.id,
      ideaId: comments.ideaId,
      userId: comments.userId,
      content: comments.content,
      createdAt: comments.createdAt,
      authorName: users.name,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.ideaId, ideaId))
    .orderBy(desc(comments.createdAt));
}

export async function addComment(data: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(comments).values(data).$returningId();
  return result.id;
}

// ─── Idea History Queries ────────────────────────────────────────────

export async function getIdeaHistory(ideaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ideaHistory).where(eq(ideaHistory.ideaId, ideaId)).orderBy(desc(ideaHistory.createdAt));
}

export async function addIdeaHistory(data: InsertIdeaHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(ideaHistory).values(data).$returningId();
  return result.id;
}

export async function getCommentCount(ideaId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.ideaId, ideaId));
  return result[0]?.count ?? 0;
}

export async function getUserIdeaCommentCounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const userIdeas = await db
    .select({ id: ideas.id })
    .from(ideas)
    .where(and(eq(ideas.userId, userId), eq(ideas.isPublic, true)));
  if (userIdeas.length === 0) return [];
  const results: { ideaId: number; count: number }[] = [];
  for (const idea of userIdeas) {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.ideaId, idea.id));
    const count = countResult[0]?.count ?? 0;
    if (count > 0) {
      results.push({ ideaId: idea.id, count });
    }
  }
  return results;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
