// src/ai/gemini.service.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateGeminiResponse(prompt: string) {
  if (!genAI) {
    return "AI is currently unavailable (missing GEMINI_API_KEY).";
  }

  const modelName =
    process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err: any) {
    // Don't crash the API flow if the external model is unavailable.
    // Log for operators, return a safe message for customers.
    // eslint-disable-next-line no-console
    console.error("Gemini generateContent failed:", err?.message || err);
    return "I’m having trouble accessing our AI assistant right now. A human agent will help you shortly.";
  }
}