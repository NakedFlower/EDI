import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

function buildMentorResponse(message: string, idea: {
  title: string;
  problem: string | null;
  targetUsers: string | null;
  solution: string | null;
}) {
  const normalized = message.trim();
  const opener = `좋아요. "${idea.title}" 아이디어를 조금 더 날카롭게 다듬어보죠.`;

  const question1 = idea.targetUsers
    ? `현재 타겟 사용자("${idea.targetUsers}")가 돈 또는 시간을 아낀다고 체감하는 핵심 순간을 한 문장으로 정의할 수 있을까요?`
    : "가장 먼저 집중할 단일 타겟 사용자군을 한 문장으로 정의해볼까요?";

  const question2 = idea.problem
    ? `지금 정의한 문제("${idea.problem}")가 실제로 자주 발생한다는 증거를 어떤 방식으로 검증할 계획인가요?`
    : "이 아이디어가 해결하려는 문제를 '언제, 누구에게, 얼마나 자주 발생하는지'로 구체화해볼까요?";

  const question3 = idea.solution
    ? `현재 솔루션("${idea.solution}")에서 사용자가 처음 5분 안에 가치를 느끼는 최소 경험(MVP)은 무엇인가요?`
    : "지금 당장 1주일 안에 만들 수 있는 가장 작은 MVP는 어떤 형태일까요?";

  return [
    opener,
    `당신이 방금 말한 내용("${normalized.slice(0, 120)}${normalized.length > 120 ? "..." : ""}")을 기준으로 보면, 아래 2가지를 먼저 검증하면 좋아요:`,
    `1) ${question1}`,
    `2) ${question2}`,
    `추가로, ${question3}`,
  ].join("\n\n");
}

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
    feed: protectedProcedure.query(async () => {
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
        const aiContent = buildMentorResponse(input.message, {
          title: idea.title,
          problem: idea.problem,
          targetUsers: idea.targetUsers,
          solution: idea.solution,
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
