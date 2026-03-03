// src/services/rag.service.ts

import { generateEmbedding } from "../ai/embedding.service";
import { searchSimilar } from "../ai/vector.service";
import { generateGeminiResponse } from "../ai/gemini.service";

export async function runRAG(message: string) {
  const embedding = await generateEmbedding(message);

  const matches = await searchSimilar(embedding);

  const context = matches
    .map((m: any) => m.metadata?.text)
    .join("\n");

  const prompt = `
You are a professional AI support assistant.

Context:
${context}

User Question:
${message}

Answer clearly and professionally.
`;

  const aiReply = await generateGeminiResponse(prompt);

  return aiReply;
}