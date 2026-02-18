import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, messages, Conversation, Message, InsertConversation, InsertMessage } from "../drizzle/schema";
import { ENV } from './_core/env';

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

// Conversation queries
export async function createConversation(
  userId: number,
  title: string
): Promise<Conversation> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .insert(conversations)
    .values({ userId, title })
    .$returningId();

  const created = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, result[0].id))
    .limit(1);

  return created[0]!;
}

export async function getConversationsByUserId(userId: number): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversationById(
  conversationId: number,
  userId: number
): Promise<Conversation | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  const conversation = result[0];
  if (conversation && conversation.userId !== userId) {
    throw new Error("Unauthorized: conversation does not belong to user");
  }

  return conversation;
}

export async function deleteConversation(
  conversationId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Verify ownership
  const conversation = await getConversationById(conversationId, userId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Delete messages first (foreign key constraint)
  await db.delete(messages).where(eq(messages.conversationId, conversationId));

  // Delete conversation
  await db.delete(conversations).where(eq(conversations.id, conversationId));
}

// Message queries
export async function createMessage(
  conversationId: number,
  sender: "user" | "assistant",
  content: string
): Promise<Message> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .insert(messages)
    .values({ conversationId, sender, content })
    .$returningId();

  const created = await db
    .select()
    .from(messages)
    .where(eq(messages.id, result[0].id))
    .limit(1);

  return created[0]!;
}

export async function getMessagesByConversationId(
  conversationId: number
): Promise<Message[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

export async function getLastAssistantMessage(
  conversationId: number
): Promise<Message | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  return result[0]?.sender === "assistant" ? result[0] : undefined;
}

export async function deleteMessage(messageId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(messages).where(eq(messages.id, messageId));
}
