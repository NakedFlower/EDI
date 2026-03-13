import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { generateMentorResponse } from "./_core/openai";
import * as db from "./db";

const ideaInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  problem: z.string().optional().nullable(),
  targetUsers: z.string().optional().nullable(),
  solution: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  ideas: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserIdeas(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const idea = await db.getIdeaById(input.id);
        if (!idea) throw new Error("Idea not found");
        if (idea.userId !== ctx.user.id && !idea.isPublic) throw new Error("Access denied");
        return idea;
      }),

    create: protectedProcedure
      .input(ideaInputSchema)
      .mutation(async ({ ctx, input }) => {
        const ideaId = await db.createIdea({
          userId: ctx.user.id,
          title: input.title,
          description: input.description ?? null,
          problem: input.problem ?? null,
          targetUsers: input.targetUsers ?? null,
          solution: input.solution ?? null,
          notes: input.notes ?? null,
          isPublic: input.isPublic ?? false,
        });
        await db.addIdeaHistory({
          ideaId,
          userId: ctx.user.id,
          changeType: "created",
          changeSummary: `"${input.title}" 아이디어 생성`,
        });
        return { id: ideaId };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number() }).merge(ideaInputSchema.partial()))
      .mutation(async ({ ctx, input }) => {
        const idea = await db.getIdeaById(input.id);
        if (!idea || idea.userId !== ctx.user.id) throw new Error("Access denied");
        const { id, ...updateData } = input;
        const changes: string[] = [];
        if (updateData.title && updateData.title !== idea.title) changes.push("title");
        if (updateData.description !== undefined && updateData.description !== idea.description) changes.push("description");
        if (updateData.problem !== undefined && updateData.problem !== idea.problem) changes.push("problem");
        if (updateData.targetUsers !== undefined && updateData.targetUsers !== idea.targetUsers) changes.push("target users");
        if (updateData.solution !== undefined && updateData.solution !== idea.solution) changes.push("solution");
        if (updateData.notes !== undefined && updateData.notes !== idea.notes) changes.push("notes");
        await db.updateIdea(id, updateData);
        if (changes.length > 0) {
          await db.addIdeaHistory({
            ideaId: id,
            userId: ctx.user.id,
            changeType: "edit",
            changeSummary: `수정됨: ${changes.join(", ")}`,
            previousData: {
              title: idea.title,
              description: idea.description,
              problem: idea.problem,
              targetUsers: idea.targetUsers,
              solution: idea.solution,
              notes: idea.notes,
            },
          });
        }
        if (updateData.isPublic !== undefined && updateData.isPublic !== idea.isPublic) {
          await db.addIdeaHistory({
            ideaId: id,
            userId: ctx.user.id,
            changeType: "privacy_change",
            changeSummary: updateData.isPublic ? "공개로 변경" : "비공개로 변경",
          });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const idea = await db.getIdeaById(input.id);
        if (!idea || idea.userId !== ctx.user.id) throw new Error("Access denied");
        await db.deleteIdea(input.id);
        return { success: true };
      }),

    commentCounts: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserIdeaCommentCounts(ctx.user.id);
    }),

    togglePrivacy: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const idea = await db.getIdeaById(input.id);
        if (!idea || idea.userId !== ctx.user.id) throw new Error("Access denied");
        const newIsPublic = !idea.isPublic;
        await db.updateIdea(input.id, { isPublic: newIsPublic });
        await db.addIdeaHistory({
          ideaId: input.id,
          userId: ctx.user.id,
          changeType: "privacy_change",
          changeSummary: newIsPublic ? "공개로 변경" : "비공개로 변경",
        });
        return { isPublic: newIsPublic };
      }),
  }),

  community: router({
    feed: publicProcedure.query(async () => {
      return db.getPublicIdeas();
    }),

    getIdea: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const idea = await db.getIdeaById(input.id);
        if (!idea || !idea.isPublic) throw new Error("Idea not found or not public");
        const author = await db.getUserById(idea.userId);
        return { ...idea, authorName: author?.name ?? "익명" };
      }),

    comments: protectedProcedure
      .input(z.object({ ideaId: z.number() }))
      .query(({ input }) => {
        return db.getIdeaComments(input.ideaId);
      }),

    addComment: protectedProcedure
      .input(z.object({ ideaId: z.number(), content: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const idea = await db.getIdeaById(input.ideaId);
        if (!idea || !idea.isPublic) throw new Error("Cannot comment on non-public idea");
        const commentId = await db.addComment({
          ideaId: input.ideaId,
          userId: ctx.user.id,
          content: input.content,
        });
        return { id: commentId };
      }),
  }),

  coach: router({
    getConversation: protectedProcedure
      .input(z.object({ ideaId: z.number() }))
      .query(async ({ ctx, input }) => {
        const idea = await db.getIdeaById(input.ideaId);
        if (!idea || idea.userId !== ctx.user.id) throw new Error("Access denied");
        const conversation = await db.getOrCreateConversation(input.ideaId, ctx.user.id);
        const msgs = await db.getConversationMessages(conversation.id);
        return { conversation, messages: msgs, idea };
      }),

    sendMessage: protectedProcedure
      .input(z.object({ ideaId: z.number(), message: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        const idea = await db.getIdeaById(input.ideaId);
        if (!idea || idea.userId !== ctx.user.id) throw new Error("Access denied");
        const conversation = await db.getOrCreateConversation(input.ideaId, ctx.user.id);
        
        await db.addMessage({
          conversationId: conversation.id,
          role: "user",
          content: input.message,
        });

        const messages = await db.getConversationMessages(conversation.id);
        const conversationHistory = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const aiContent = await generateMentorResponse({
          userMessage: input.message,
          conversationHistory,
          idea: {
            title: idea.title,
            description: idea.description,
            problem: idea.problem,
            targetUsers: idea.targetUsers,
            solution: idea.solution,
            notes: idea.notes,
          },
        });

        await db.addMessage({
          conversationId: conversation.id,
          role: "assistant",
          content: aiContent,
        });
        
        await db.addIdeaHistory({
          ideaId: input.ideaId,
          userId: ctx.user.id,
          changeType: "ai_session",
          changeSummary: "AI 멘토링 대화 진행",
        });
        
        return { response: aiContent };
      }),
  }),

  history: router({
    get: protectedProcedure
      .input(z.object({ ideaId: z.number() }))
      .query(async ({ ctx, input }) => {
        const idea = await db.getIdeaById(input.ideaId);
        if (!idea || idea.userId !== ctx.user.id) throw new Error("Access denied");
        return db.getIdeaHistory(input.ideaId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
