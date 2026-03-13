import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

export const openai = new OpenAI({
  apiKey,
});

export async function generateMentorResponse(params: {
  userMessage: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  idea: {
    title: string;
    description: string | null;
    problem: string | null;
    targetUsers: string | null;
    solution: string | null;
    notes: string | null;
  };
}): Promise<string> {
  const { userMessage, conversationHistory, idea } = params;

  const systemPrompt = `당신은 창업 아이디어를 발전시키는 전문 AI 멘토입니다.

**당신의 역할:**
- 사용자의 아이디어를 비판적으로 분석하고 날카로운 질문을 던집니다
- 가정을 검증하고, 약점을 지적하며, 새로운 관점을 제시합니다
- 구체적이고 실행 가능한 조언을 제공합니다
- 단순히 칭찬하거나 동의하지 않고, 진짜 문제를 파고듭니다

**대화 스타일:**
- 친근하지만 전문적인 톤
- 한국어로 자연스럽게 대화
- 질문 중심으로 사용자가 스스로 생각하도록 유도
- 구체적인 예시와 시나리오 제시

**현재 아이디어 정보:**
제목: ${idea.title}
${idea.description ? `설명: ${idea.description}` : ""}
${idea.problem ? `문제: ${idea.problem}` : ""}
${idea.targetUsers ? `타겟 사용자: ${idea.targetUsers}` : ""}
${idea.solution ? `솔루션: ${idea.solution}` : ""}
${idea.notes ? `메모: ${idea.notes}` : ""}

**중요:**
- 위 아이디어 정보를 바탕으로 맥락에 맞는 조언을 제공하세요
- 사용자가 아직 정의하지 않은 부분(문제, 타겟, 솔루션 등)이 있다면 그것을 먼저 정의하도록 유도하세요
- 응답은 2-4개의 짧은 문단으로 구성하세요
- 매번 1-3개의 구체적인 질문을 던지세요`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.8,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content ?? "죄송합니다. 응답을 생성할 수 없습니다.";
}
