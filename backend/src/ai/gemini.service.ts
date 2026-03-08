import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateGeminiResponse(prompt: string) {
  if (!genAI) {
    return "AI is currently unavailable (missing GEMINI_API_KEY).";
  }

  const configuredModel = process.env.GEMINI_MODEL;
  const fallbackModels = Array.from(new Set([
    configuredModel,
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ].filter(Boolean) as string[]));

  for (const modelName of fallbackModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err: any) {
      console.error(`Gemini generateContent failed for model ${modelName}:`, err?.message || err);
    }
  }

  return "I’m having trouble accessing our AI assistant right now. A human agent will help you shortly.";
}
