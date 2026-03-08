import { generateGeminiResponse } from "../ai/gemini.service";
import {
  searchKnowledge,
} from "../ai/tools/tools.service";
import { analyzeSentiment } from "../ai/sentiment.service";
import { AiSuggestionsService } from "../modules/ai-suggestions/aiSuggestions.service";
import { detectIntent } from "../ai/intent.service";
import { appendMemory, getRecentMemory } from "../ai/memory.service";
import { buildContext } from "../ai/context-builder";
import { systemPrompt } from "../prompts/system.prompt";

export type AiMode = "llm" | "kb_fallback" | "safe_fallback";

export interface AgentRunResult {
  reply: string;
  mode: AiMode;
  shouldEscalate: boolean;
}

function isModelUnavailableResponse(text: string) {
  return /trouble accessing our ai assistant|currently unavailable/i.test(text);
}

function isExplicitHumanHandoffRequest(message: string) {
  const text = message.toLowerCase().trim();
  return (
    /\b(connect|transfer|escalate)\b.*\b(agent|human|support)\b/.test(text) ||
    /\b(agent|human)\b.*\bplease|now|needed\b/.test(text) ||
    /\bconnect me\b/.test(text) ||
    /\byes\b.*\b(do it|please|connect)\b/.test(text)
  );
}

function isDuplicateChargeRefund(message: string) {
  const text = message.toLowerCase();
  return (
    /\b(charged|charge)\b.*\b(twice|duplicate|double)\b/.test(text) ||
    (/\brefund\b/.test(text) && /\bcharge|charged|billing|subscription\b/.test(text))
  );
}

export async function runAgentDetailed(
  message: string,
  orgId: string,
  ticketId: string,
  io?: { to: (room: string) => { emit: (event: string, payload: any) => void } }
): Promise<AgentRunResult> {
  let mode: AiMode = "llm";
  let finalAnswer = "";
  let shouldEscalate = false;
  await appendMemory(orgId, ticketId, "USER", message);
  io?.to(`ticket-${ticketId}`).emit("typing_indicator", { ticketId, actor: "AI", isTyping: true });

  const memory = await getRecentMemory(orgId, ticketId, 12);
  const sentiment = await analyzeSentiment(message);
  const intent = await detectIntent(message);
  const retrievedContext = await searchKnowledge(message, orgId);
  const retrievedDocs = retrievedContext ? [retrievedContext] : [];

  // Human-in-the-loop: propose sensitive actions instead of executing directly.
  if (sentiment.priorityScore >= 8) {
    const suggestion = await AiSuggestionsService.propose({
      orgId,
      ticketId,
      actionType: "CHANGE_PRIORITY",
      params: { priority: "HIGH", reason: "High urgency detected" },
    });
    io?.to(`org-${orgId}`).emit("suggestion-created", suggestion);
  }

  if (sentiment.sentiment === "ANGRY" || sentiment.sentiment === "URGENT") {
    const suggestion = await AiSuggestionsService.propose({
      orgId,
      ticketId,
      actionType: "ESCALATE_TO_HUMAN",
      params: { reason: `Sentiment: ${sentiment.sentiment}` },
    });
    io?.to(`org-${orgId}`).emit("suggestion-created", suggestion);
  }

  if (intent === "REFUND_REQUEST") {
    const suggestion = await AiSuggestionsService.propose({
      orgId,
      ticketId,
      actionType: "SEND_REFUND_LINK",
      params: { amount: 0, reason: "Refund intent detected" },
    });
    io?.to(`org-${orgId}`).emit("suggestion-created", suggestion);
  }

  if (isExplicitHumanHandoffRequest(message)) {
    const suggestion = await AiSuggestionsService.propose({
      orgId,
      ticketId,
      actionType: "ESCALATE_TO_HUMAN",
      params: { reason: "Customer explicitly requested human agent" },
    });
    io?.to(`org-${orgId}`).emit("suggestion-created", suggestion);

    finalAnswer = "Understood. I have escalated this ticket to a human support agent, and they will assist you shortly.";
    mode = "safe_fallback";
    shouldEscalate = true;
    await appendMemory(orgId, ticketId, "AI", finalAnswer);
    io?.to(`ticket-${ticketId}`).emit("typing_indicator", { ticketId, actor: "AI", isTyping: false });
    return { reply: finalAnswer, mode, shouldEscalate };
  }

  const prompt = buildContext(
    systemPrompt,
    retrievedDocs,
    memory.map((m) => ({
      role: m.role === "AI" ? "AI" : "USER",
      content: m.content,
    })),
    `Intent: ${intent}\nSentiment: ${sentiment.sentiment}\nMessage: ${message}`
  );

  finalAnswer = await generateGeminiResponse(prompt);
  const modelUnavailable = isModelUnavailableResponse(finalAnswer);
  if (modelUnavailable && retrievedContext) {
    const concise = retrievedContext.split("\n").slice(0, 3).join(" ").trim();
    if (isDuplicateChargeRefund(message) || intent === "REFUND_REQUEST") {
      finalAnswer =
        "I understand this is about a duplicate charge/refund. " +
        "I have flagged this for human review and a support agent will verify the billing details and process next steps shortly.\n\n" +
        (concise || "Please keep your transaction details ready for faster resolution.");
      shouldEscalate = true;
    } else {
      finalAnswer = concise || "I found relevant guidance in our support knowledge base and shared it above.";
    }
    mode = "kb_fallback";
  } else if (modelUnavailable) {
    if (isDuplicateChargeRefund(message) || intent === "REFUND_REQUEST") {
      finalAnswer =
        "I understand this is a billing/refund issue. I have flagged your request for human support, and an agent will assist you shortly.";
      shouldEscalate = true;
    } else {
      finalAnswer = "I could not fully process that request right now. A human support agent will review your message shortly.";
      shouldEscalate = true;
    }
    mode = "safe_fallback";
  }

  if (!finalAnswer) {
    finalAnswer = "Thank you for your message. Our team will assist you shortly.";
    mode = "safe_fallback";
    shouldEscalate = true;
  }

  await appendMemory(orgId, ticketId, "AI", finalAnswer);
  io?.to(`ticket-${ticketId}`).emit("typing_indicator", { ticketId, actor: "AI", isTyping: false });

  return { reply: finalAnswer, mode, shouldEscalate };
}

export async function runAgent(
  message: string,
  orgId: string,
  ticketId: string,
  io?: { to: (room: string) => { emit: (event: string, payload: any) => void } }
) {
  const result = await runAgentDetailed(message, orgId, ticketId, io);
  return result.reply;
}
