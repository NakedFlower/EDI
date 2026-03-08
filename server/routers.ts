import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
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
        const existingMessages = await db.getConversationMessages(conversation.id);
        await db.addMessage({
          conversationId: conversation.id,
          role: "user",
          content: input.message,
        });
        const ideaContext = [
          `제목: ${idea.title}`,
          idea.description ? `설명: ${idea.description}` : null,
          idea.problem ? `문제점: ${idea.problem}` : null,
          idea.targetUsers ? `타겟 사용자: ${idea.targetUsers}` : null,
          idea.solution ? `솔루션: ${idea.solution}` : null,
          idea.notes ? `메모: ${idea.notes}` : null,
        ].filter(Boolean).join("\n");
        const systemPrompt = `당신은 경험 많은 스타트업 멘토입니다. 소크라테스식 멘토링 스타일을 따르며, 직접적인 답변 대신 사려 깊은 질문을 통해 사용자를 안내합니다.

당신의 역할:
- 사용자의 비즈니스 아이디어에 대해 통찰력 있고 도전적인 질문을 하세요
- 적절한 경우 가정에 도전하세요
- 고려할 만한 대안적 방향을 제안하세요
- 잠재적 약점을 건설적으로 지적하세요
- 아이디어가 강할 때 지지하고 격려하세요
- 사용자가 아이디어에 대해 더 깊이 생각할 수 있도록 도와주세요
- 아이디어를 다시 쓰거나 전체 사업 계획을 생성하지 마세요
- 응답은 간결하게 (최대 2-4단락)
- 경험 많은 창업자와의 실제 대화처럼 느껴져야 합니다
- 반드시 한국어로 대답하세요

사용자의 비즈니스 아이디어:
${ideaContext}

중요: 사용자를 위해 아이디어를 만드는 것이 아닙니다. 멘토처럼 사용자의 아이디어에 대해 함께 논의하는 것입니다. 한 번에 하나 또는 두 개의 집중된 질문을 하세요.`;
        const chatHistory = existingMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...chatHistory,
          { role: "user" as const, content: input.message },
        ];
        const response = await invokeLLM({ messages: llmMessages });
        const rawContent = response.choices[0]?.message?.content;
        const aiContent = typeof rawContent === "string" ? rawContent : "이 아이디어에 대해 더 이야기해 보고 싶습니다. 조금 더 자세히 설명해 주시겠어요?";
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
