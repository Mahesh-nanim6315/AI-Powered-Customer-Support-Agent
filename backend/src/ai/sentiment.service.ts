import { generateGeminiResponse } from "./gemini.service";

export async function analyzeSentiment(message: string) {
    const prompt = `
Analyze the sentiment of the following support message.

Respond ONLY in JSON format:

{
  "sentiment": "POSITIVE | NEUTRAL | NEGATIVE | ANGRY | URGENT",
  "confidence": 0-100,
  "priorityScore": 1-10
}

Message:
"${message}"
`;

    const response = await generateGeminiResponse(prompt);

    try {
        return JSON.parse(response);
    } catch {
        return {
            sentiment: "NEUTRAL",
            confidence: 50,
            priorityScore: 5,
        };
    }
}