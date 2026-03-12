import { ENV } from "./_core/env";
import { adminDb } from "./_core/firebase-admin";

type Role = "user" | "admin";
type MessageRole = "user" | "assistant";
type IdeaChangeType = "edit" | "ai_session" | "privacy_change" | "created";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type InsertUser = Partial<Omit<User, "id" | "createdAt" | "updatedAt">> & {
  openId: string;
};

export type Idea = {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  problem: string | null;
  targetUsers: string | null;
  solution: string | null;
  notes: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertIdea = Omit<Idea, "id" | "createdAt" | "updatedAt"> &
  Partial<Pick<Idea, "createdAt" | "updatedAt">>;

export type Conversation = {
  id: number;
  ideaId: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertConversation = Omit<Conversation, "id" | "createdAt" | "updatedAt"> &
  Partial<Pick<Conversation, "createdAt" | "updatedAt">>;

export type Message = {
  id: number;
  conversationId: number;
  role: MessageRole;
  content: string;
  createdAt: Date;
};

export type InsertMessage = Omit<Message, "id" | "createdAt"> & Partial<Pick<Message, "createdAt">>;

export type Comment = {
  id: number;
  ideaId: number;
  userId: number;
  content: string;
  createdAt: Date;
};

export type InsertComment = Omit<Comment, "id" | "createdAt"> & Partial<Pick<Comment, "createdAt">>;

export type IdeaHistory = {
  id: number;
  ideaId: number;
  userId: number;
  changeType: IdeaChangeType;
  changeSummary: string | null;
  previousData?: unknown;
  createdAt: Date;
};

export type InsertIdeaHistory = Omit<IdeaHistory, "id" | "createdAt"> &
  Partial<Pick<IdeaHistory, "createdAt">>;

const countersRef = adminDb.collection("_meta").doc("counters");

const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  return new Date(value);
};

async function nextId(counterName: string): Promise<number> {
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(countersRef);
    const current = (snap.data()?.[counterName] as number | undefined) ?? 0;
    const next = current + 1;
    tx.set(countersRef, { [counterName]: next }, { merge: true });
    return next;
  });
}

export async function getDb() {
  return adminDb;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const query = await adminDb.collection("users").where("openId", "==", user.openId).limit(1).get();
  const now = new Date();
  const role: Role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");

  if (query.empty) {
    const id = await nextId("users");
    await adminDb.collection("users").doc(String(id)).set({
      id,
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? now,
    });
    return;
  }

  const doc = query.docs[0];
  await doc.ref.set(
    {
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? now,
    },
    { merge: true },
  );
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const snap = await adminDb.collection("users").where("openId", "==", openId).limit(1).get();
  if (snap.empty) return undefined;
  const raw = snap.docs[0].data();
  return {
    ...raw,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
    lastSignedIn: toDate(raw.lastSignedIn),
  } as User;
}

export async function getUserById(userId: number): Promise<User | undefined> {
  const snap = await adminDb.collection("users").doc(String(userId)).get();
  if (!snap.exists) return undefined;
  const raw = snap.data()!;
  return {
    ...raw,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
    lastSignedIn: toDate(raw.lastSignedIn),
  } as User;
}

export async function getUserIdeas(userId: number): Promise<Idea[]> {
  const snap = await adminDb.collection("ideas").where("userId", "==", userId).get();
  return snap.docs
    .map((doc) => {
      const raw = doc.data();
      return { ...raw, createdAt: toDate(raw.createdAt), updatedAt: toDate(raw.updatedAt) } as Idea;
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getIdeaById(ideaId: number): Promise<Idea | undefined> {
  const snap = await adminDb.collection("ideas").doc(String(ideaId)).get();
  if (!snap.exists) return undefined;
  const raw = snap.data()!;
  return { ...raw, createdAt: toDate(raw.createdAt), updatedAt: toDate(raw.updatedAt) } as Idea;
}

export async function createIdea(data: InsertIdea): Promise<number> {
  const id = await nextId("ideas");
  const now = new Date();
  await adminDb.collection("ideas").doc(String(id)).set({
    id,
    ...data,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  });
  return id;
}

export async function updateIdea(id: number, data: Partial<InsertIdea>): Promise<void> {
  await adminDb.collection("ideas").doc(String(id)).set({ ...data, updatedAt: new Date() }, { merge: true });
}

export async function deleteIdea(id: number): Promise<void> {
  const [commentSnap, historySnap, convoSnap] = await Promise.all([
    adminDb.collection("comments").where("ideaId", "==", id).get(),
    adminDb.collection("ideaHistory").where("ideaId", "==", id).get(),
    adminDb.collection("conversations").where("ideaId", "==", id).get(),
  ]);

  const batch = adminDb.batch();
  commentSnap.docs.forEach((d) => batch.delete(d.ref));
  historySnap.docs.forEach((d) => batch.delete(d.ref));

  for (const convo of convoSnap.docs) {
    const convoId = convo.data().id as number;
    const msgSnap = await adminDb.collection("messages").where("conversationId", "==", convoId).get();
    msgSnap.docs.forEach((m) => batch.delete(m.ref));
    batch.delete(convo.ref);
  }

  batch.delete(adminDb.collection("ideas").doc(String(id)));
  await batch.commit();
}

export async function getPublicIdeas() {
  const ideasSnap = await adminDb.collection("ideas").where("isPublic", "==", true).get();
  const items = ideasSnap.docs.map((doc) => {
    const raw = doc.data();
    return { ...raw, createdAt: toDate(raw.createdAt), updatedAt: toDate(raw.updatedAt) } as Idea;
  });

  const result = [] as Array<Idea & { authorName: string | null }>;
  for (const idea of items) {
    const author = await getUserById(idea.userId);
    result.push({ ...idea, authorName: author?.name ?? null });
  }
  return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getOrCreateConversation(ideaId: number, userId: number): Promise<Conversation> {
  const snap = await adminDb
    .collection("conversations")
    .where("ideaId", "==", ideaId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (!snap.empty) {
    const raw = snap.docs[0].data();
    return { ...raw, createdAt: toDate(raw.createdAt), updatedAt: toDate(raw.updatedAt) } as Conversation;
  }

  const id = await nextId("conversations");
  const now = new Date();
  const conversation: Conversation = { id, ideaId, userId, createdAt: now, updatedAt: now };
  await adminDb.collection("conversations").doc(String(id)).set(conversation);
  return conversation;
}

export async function getConversationMessages(conversationId: number): Promise<Message[]> {
  const snap = await adminDb.collection("messages").where("conversationId", "==", conversationId).get();
  return snap.docs
    .map((doc) => {
      const raw = doc.data();
      return { ...raw, createdAt: toDate(raw.createdAt) } as Message;
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function addMessage(data: InsertMessage): Promise<number> {
  const id = await nextId("messages");
  await adminDb.collection("messages").doc(String(id)).set({
    id,
    ...data,
    createdAt: data.createdAt ?? new Date(),
  });
  await adminDb.collection("conversations").doc(String(data.conversationId)).set({ updatedAt: new Date() }, { merge: true });
  return id;
}

export async function getIdeaComments(ideaId: number) {
  const snap = await adminDb.collection("comments").where("ideaId", "==", ideaId).get();
  const comments = snap.docs
    .map((doc) => {
      const raw = doc.data();
      return { ...raw, createdAt: toDate(raw.createdAt) } as Comment;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const result = [] as Array<Comment & { authorName: string | null }>;
  for (const comment of comments) {
    const author = await getUserById(comment.userId);
    result.push({ ...comment, authorName: author?.name ?? null });
  }
  return result;
}

export async function addComment(data: InsertComment): Promise<number> {
  const id = await nextId("comments");
  await adminDb.collection("comments").doc(String(id)).set({
    id,
    ...data,
    createdAt: data.createdAt ?? new Date(),
  });
  return id;
}

export async function getIdeaHistory(ideaId: number): Promise<IdeaHistory[]> {
  const snap = await adminDb.collection("ideaHistory").where("ideaId", "==", ideaId).get();
  return snap.docs
    .map((doc) => {
      const raw = doc.data();
      return { ...raw, createdAt: toDate(raw.createdAt) } as IdeaHistory;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function addIdeaHistory(data: InsertIdeaHistory): Promise<number> {
  const id = await nextId("ideaHistory");
  await adminDb.collection("ideaHistory").doc(String(id)).set({
    id,
    ...data,
    createdAt: data.createdAt ?? new Date(),
  });
  return id;
}

export async function getCommentCount(ideaId: number): Promise<number> {
  const snap = await adminDb.collection("comments").where("ideaId", "==", ideaId).get();
  return snap.size;
}

export async function getUserIdeaCommentCounts(userId: number) {
  const ideas = await getUserIdeas(userId);
  const publicIdeas = ideas.filter((idea) => idea.isPublic);
  const results: { ideaId: number; count: number }[] = [];
  for (const idea of publicIdeas) {
    const count = await getCommentCount(idea.id);
    if (count > 0) results.push({ ideaId: idea.id, count });
  }
  return results;
}
