// src/ai/embedding.service.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateEmbedding(text: string) {
  if (!genAI) return [];

  const modelName = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch {
    return [];
  }
}