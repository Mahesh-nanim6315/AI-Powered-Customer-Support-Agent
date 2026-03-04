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
        const text = message.toLowerCase();
        const hasUrgent =
          /\burgent\b|\basap\b|\bimmediately\b|\bnow\b|\bcritical\b/.test(text);
        const hasAngry =
          /\bangry\b|\bfurious\b|\bmad\b|\bunacceptable\b|\bterrible\b/.test(text) ||
          /!{2,}/.test(message);
        const hasRefund = /\brefund\b|\bchargeback\b|\bcancel\b/.test(text);
        const hasBroken = /\bnot working\b|\bbroken\b|\bdoesn't work\b|\bcannot\b|\bcan't\b/.test(text);

        let sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "ANGRY" | "URGENT" =
          "NEUTRAL";
        let priorityScore = 5;

        if (hasUrgent) {
          sentiment = "URGENT";
          priorityScore = 9;
        } else if (hasAngry) {
          sentiment = "ANGRY";
          priorityScore = 8;
        } else if (hasBroken || hasRefund) {
          sentiment = "NEGATIVE";
          priorityScore = 7;
        }

        if (hasRefund) priorityScore = Math.max(priorityScore, 8);

        return {
          sentiment,
          confidence: 55,
          priorityScore,
        };
    }
}