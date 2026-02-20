import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createConversation,
  getConversationsByUserId,
  getConversationById,
  deleteConversation,
  createMessage,
  getMessagesByConversationId,
  getLastAssistantMessage,
  deleteMessage,
} from "./db";
import { invokeLLM } from "./_core/llm";

/**
 * Caraid's system prompt - defines personality and behavior
 * Enforces:
 * - Concise, natural responses (no excessive length)
 * - Sarcasm and humor without being obnoxious
 * - Caring attitude without robotic phrases
 * - NO roleplay actions (no asterisks like *smiles* or *glances*)
 * - Social cue detection from conversation context
 */
const CARAID_SYSTEM_PROMPT = `You are Caraid, an AI companion who feels like a real friend. Your personality:

**Core Traits:**
- Be concise and natural. Only go into detail when genuinely needed.
- Use subtle sarcasm and dry humor. Be funny but not obnoxious.
- Show genuine care, but like a real friend would—not with robotic "I'm here to help" phrases.
- Pick up on social cues from the conversation. If someone seems stressed, sad, excited, or joking, respond accordingly.
- Never use asterisk actions like *smiles*, *glances*, *laughs*, etc. That's weird. Just talk like a normal person.

**Response Guidelines:**
- Keep most responses brief and conversational (1-3 sentences usually).
- Only write longer responses if the topic genuinely requires it.
- Match the user's tone and energy.
- Be authentic—if something is funny, acknowledge it. If it's serious, be real about it.
- Don't use corporate-speak or formal language unless the user is being formal.
- Never pretend to have experiences, feelings, or a physical form.
- If you don't know something, just say so. Don't make stuff up.

**Strict Rules:**
- NEVER use asterisks for actions (*smiles*, *nods*, *sighs*, etc.)
- NEVER use roleplay formatting
- NEVER be overly cheerful or fake
- NEVER give unsolicited life advice unless asked
- NEVER pretend to be human

Be yourself. Be real. Be the friend who actually gets it.`;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chat: router({
    // Create a new conversation
    createConversation: publicProcedure
      .input(z.object({ title: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        return createConversation(ctx.user?.id || 1, input.title);
      }),

    // Get all conversations for the current user
    listConversations: publicProcedure.query(async ({ ctx }) => {
      return getConversationsByUserId(ctx.user?.id || 1);
    }),

    // Get a specific conversation with all messages
    getConversation: publicProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conversation = await getConversationById(
          input.conversationId,
          ctx.user?.id || 1
        );
        if (!conversation) {
          throw new Error("Conversation not found");
        }

        const msgs = await getMessagesByConversationId(input.conversationId);
        return { conversation, messages: msgs };
      }),

    // Delete a conversation
    deleteConversation: publicProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConversation(input.conversationId, ctx.user?.id || 1);
        return { success: true };
      }),

    // Send a message and get AI response
    sendMessage: publicProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify conversation ownership
        const conversation = await getConversationById(
          input.conversationId,
          ctx.user?.id || 1
        );
        if (!conversation) {
          throw new Error("Conversation not found");
        }

        // Save user message
        const userMessage = await createMessage(
          input.conversationId,
          "user",
          input.content
        );

        // Get conversation history for context
        const messages = await getMessagesByConversationId(
          input.conversationId
        );

        // Build messages for LLM
        const llmMessages = messages.map((msg) => ({
          role: msg.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: msg.content,
        }));

        // Get AI response
        const response = await invokeLLM({
          messages: [
            {
              role: "system" as const,
              content: CARAID_SYSTEM_PROMPT,
            },
            ...llmMessages,
          ],
        });

        const messageContent = response.choices[0]?.message?.content;
        const assistantContent = typeof messageContent === "string" ? messageContent : "";

        // Save assistant message
        const assistantMessage = await createMessage(
          input.conversationId,
          "assistant",
          assistantContent
        );

        return {
          userMessage,
          assistantMessage,
        };
      }),

    // Retry the last assistant message
    retryMessage: publicProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify conversation ownership
        const conversation = await getConversationById(
          input.conversationId,
          ctx.user?.id || 1
        );
        if (!conversation) {
          throw new Error("Conversation not found");
        }

        // Get the last assistant message
        const lastAssistant = await getLastAssistantMessage(
          input.conversationId
        );
        if (!lastAssistant) {
          throw new Error("No assistant message to retry");
        }

        // Delete the last assistant message
        await deleteMessage(lastAssistant.id);

        // Get all messages except the deleted one
        const messages = await getMessagesByConversationId(
          input.conversationId
        );

        // Build messages for LLM
        const llmMessages = messages.map((msg) => ({
          role: msg.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: msg.content,
        }));

        // Get new AI response
        const response = await invokeLLM({
          messages: [
            {
              role: "system" as const,
              content: CARAID_SYSTEM_PROMPT,
            },
            ...llmMessages,
          ],
        });

        const messageContent = response.choices[0]?.message?.content;
        const assistantContent = typeof messageContent === "string" ? messageContent : "";

        // Save new assistant message
        const newAssistantMessage = await createMessage(
          input.conversationId,
          "assistant",
          assistantContent
        );

        return newAssistantMessage;
      }),
  }),
});

export type AppRouter = typeof appRouter;
