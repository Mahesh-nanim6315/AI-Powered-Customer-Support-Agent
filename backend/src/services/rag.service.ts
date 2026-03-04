import prisma from "../config/database";
import { generateEmbedding } from "../ai/embedding.service";
import { searchSimilar } from "../ai/vector.service";
import { generateGeminiResponse } from "../ai/gemini.service";

export async function runRAG(
  message: string,
  orgId: string,
  ticketId: string
) {
  const previousMessages = await prisma.ticketMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const conversationHistory = previousMessages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  const embedding = await generateEmbedding(message);
  const matches = await searchSimilar(embedding, orgId);

  const context = matches
    .map((m: any) => m.metadata?.text)
    .filter(Boolean)
    .join("\n");

  const prompt = `
You are a professional AI support assistant.

Conversation History:
${conversationHistory}

Knowledge Base Context:
${context}

Current User Message:
${message}

Instructions:
- Understand conversation flow
- Use knowledge if relevant
- Be professional
- Do not hallucinate
- If unsure, say you will escalate

Answer:
`;

  return generateGeminiResponse(prompt);
}
