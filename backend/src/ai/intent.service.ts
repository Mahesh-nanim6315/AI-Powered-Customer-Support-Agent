import { generateOllamaResponse } from "./ollama.service";

export type SupportIntent =
  | "ORDER_TRACKING"
  | "PASSWORD_RESET"
  | "REFUND_REQUEST"
  | "PAYMENT_ISSUE"
  | "ACCOUNT_ACCESS"
  | "GENERAL_SUPPORT";

export async function detectIntent(message: string): Promise<SupportIntent> {
  const prompt = `
Classify the support intent from the customer message.

Return ONLY JSON:
{
  "intent": "ORDER_TRACKING | PASSWORD_RESET | REFUND_REQUEST | PAYMENT_ISSUE | ACCOUNT_ACCESS | GENERAL_SUPPORT"
}

Message:
"${message}"
`;

  const response = await generateOllamaResponse(prompt);
  try {
    const parsed = JSON.parse(response) as { intent?: SupportIntent };
    if (parsed.intent) return parsed.intent;
  } catch {
    // fallback handled below
  }

  const text = message.toLowerCase();
  if (/\border\b|\bshipment\b|\bdelivery\b|\bdelivered\b/.test(text)) return "ORDER_TRACKING";
  if (/\bpassword\b|\breset\b|\blogin\b|\bsign in\b/.test(text)) return "PASSWORD_RESET";
  if (/\brefund\b|\brefunds\b|\bchargeback\b|\bmoney back\b/.test(text)) return "REFUND_REQUEST";
  if (/\bpayment\b|\bcard\b|\bcharged\b|\bbilling\b|\bsubscription\b/.test(text)) return "PAYMENT_ISSUE";
  if (/\bhacked\b|\blocked\b|\bunauthorized\b|\baccount\b/.test(text)) return "ACCOUNT_ACCESS";
  return "GENERAL_SUPPORT";
}

