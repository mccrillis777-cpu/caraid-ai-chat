import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// Mock the db module
vi.mock("./db", () => ({
  createConversation: vi.fn(async (userId, title) => ({
    id: 1,
    userId,
    title,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  getConversationsByUserId: vi.fn(async (userId) => [
    {
      id: 1,
      userId,
      title: "Test Chat",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getConversationById: vi.fn(async (convId, userId) => ({
    id: convId,
    userId,
    title: "Test Chat",
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  deleteConversation: vi.fn(async () => undefined),
  createMessage: vi.fn(async (convId, sender, content) => ({
    id: 1,
    conversationId: convId,
    sender,
    content,
    createdAt: new Date(),
  })),
  getMessagesByConversationId: vi.fn(async () => []),
  getLastAssistantMessage: vi.fn(async () => undefined),
  deleteMessage: vi.fn(async () => undefined),
}));

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: "That's pretty funny, not gonna lie.",
        },
      },
    ],
  })),
}));

function createAuthContext(): TrpcContext {
  const user: User = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
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

describe("chat procedures", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
    vi.clearAllMocks();
  });

  describe("createConversation", () => {
    it("creates a new conversation with a title", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.chat.createConversation({
        title: "New Chat",
      });

      expect(result).toMatchObject({
        id: expect.any(Number),
        userId: 1,
        title: "New Chat",
      });
    });

    it("rejects empty titles", async () => {
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.chat.createConversation({ title: "" })
      ).rejects.toThrow();
    });
  });

  describe("listConversations", () => {
    it("returns all conversations for the user", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.chat.listConversations();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getConversation", () => {
    it("returns a conversation with its messages", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.chat.getConversation({
        conversationId: 1,
      });

      expect(result).toHaveProperty("conversation");
      expect(result).toHaveProperty("messages");
      expect(Array.isArray(result.messages)).toBe(true);
    });
  });

  describe("deleteConversation", () => {
    it("deletes a conversation", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.chat.deleteConversation({
        conversationId: 1,
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("sendMessage", () => {
    it("sends a user message and gets AI response", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.chat.sendMessage({
        conversationId: 1,
        content: "Hey Caraid, how are you?",
      });

      expect(result).toHaveProperty("userMessage");
      expect(result).toHaveProperty("assistantMessage");
      expect(result.userMessage.sender).toBe("user");
      expect(result.assistantMessage.sender).toBe("assistant");
    });

    it("rejects empty messages", async () => {
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.chat.sendMessage({
          conversationId: 1,
          content: "",
        })
      ).rejects.toThrow();
    });
  });

  describe("retryMessage", () => {
    it("regenerates the last assistant message", async () => {
      const { getLastAssistantMessage } = await import("./db");
      vi.mocked(getLastAssistantMessage).mockResolvedValueOnce({
        id: 1,
        conversationId: 1,
        sender: "assistant",
        content: "Old response",
        createdAt: new Date(),
      });

      const caller = appRouter.createCaller(ctx);
      const result = await caller.chat.retryMessage({
        conversationId: 1,
      });

      expect(result).toHaveProperty("id");
      expect(result.sender).toBe("assistant");
    });

    it("throws error when no assistant message exists", async () => {
      const { getLastAssistantMessage } = await import("./db");
      vi.mocked(getLastAssistantMessage).mockResolvedValueOnce(undefined);

      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.chat.retryMessage({ conversationId: 1 })
      ).rejects.toThrow("No assistant message to retry");
    });
  });
});
