import { generateOllamaResponse } from "../ai/ollama.service";
import { searchKnowledge } from "../ai/tools/tools.service";
import { analyzeSentiment } from "../ai/sentiment.service";
import { AiSuggestionsService } from "../modules/ai-suggestions/aiSuggestions.service";
import { detectIntent } from "../ai/intent.service";
import { appendMemory, getRecentMemory } from "../ai/memory.service";
import { buildContext } from "../ai/context-builder";
import { systemPrompt } from "../prompts/system.prompt";
import { AiSettingsService } from "./aiSettings.service";

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

function buildConfiguredSystemPrompt(settings: {
  replyTone: string;
  confidenceThreshold: number;
  systemPrompt?: string | null;
}) {
  const configuredSections = [
    systemPrompt.trim(),
    `Configured reply tone: ${settings.replyTone}.`,
    `Configured confidence threshold: ${Math.round(settings.confidenceThreshold * 100)}%. If confidence is below this threshold, avoid overclaiming and prefer a fallback or human handoff.`,
  ];

  if (settings.systemPrompt?.trim()) {
    configuredSections.push(`Organization instructions:\n${settings.systemPrompt.trim()}`);
  }

  return configuredSections.join("\n\n");
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

  const aiSettings = await AiSettingsService.getByOrgId(orgId);

  if (!aiSettings.aiEnabled) {
    finalAnswer = "AI assistance is currently disabled for this workspace. A human support agent will review your message shortly.";
    await appendMemory(orgId, ticketId, "USER", message);
    await appendMemory(orgId, ticketId, "AI", finalAnswer);
    return { reply: finalAnswer, mode: "safe_fallback", shouldEscalate: true };
  }

  const proposeSuggestion = async (
    actionType: "ESCALATE_TO_HUMAN" | "CHANGE_PRIORITY" | "UPDATE_TICKET_STATUS" | "SEND_REFUND_LINK",
    params: Record<string, unknown>
  ) => {
    const suggestion = await AiSuggestionsService.propose({
      orgId,
      ticketId,
      actionType,
      params,
    });

    io?.to(`org-${orgId}`).emit("suggestion-created", suggestion);

    if (!aiSettings.autoExecuteSuggestions) {
      return suggestion;
    }

    const approved = await AiSuggestionsService.approve(orgId, suggestion.id);
    const finalSuggestion = approved
      ? await AiSuggestionsService.execute(orgId, suggestion.id)
      : suggestion;

    if (finalSuggestion) {
      io?.to(`org-${orgId}`).emit("suggestion-updated", finalSuggestion);
    }

    return finalSuggestion ?? suggestion;
  };

  await appendMemory(orgId, ticketId, "USER", message);
  io?.to(`ticket-${ticketId}`).emit("typing_indicator", { ticketId, actor: "AI", isTyping: true });

  const memory = await getRecentMemory(orgId, ticketId, 12);
  const sentiment = await analyzeSentiment(message);
  const intent = await detectIntent(message);
  const retrievedContext = await searchKnowledge(message, orgId);
  const retrievedDocs = retrievedContext ? [retrievedContext] : [];

  if (sentiment.priorityScore >= 8) {
    await proposeSuggestion("CHANGE_PRIORITY", { priority: "HIGH", reason: "High urgency detected" });
  }

  if (aiSettings.escalationEnabled && (sentiment.sentiment === "ANGRY" || sentiment.sentiment === "URGENT")) {
    await proposeSuggestion("ESCALATE_TO_HUMAN", { reason: `Sentiment: ${sentiment.sentiment}` });
  }

  if (intent === "REFUND_REQUEST") {
    await proposeSuggestion("SEND_REFUND_LINK", { amount: 0, reason: "Refund intent detected" });
  }

  if (isExplicitHumanHandoffRequest(message)) {
    await proposeSuggestion("ESCALATE_TO_HUMAN", { reason: "Customer explicitly requested human agent" });

    finalAnswer = "Understood. I have escalated this ticket to a human support agent, and they will assist you shortly.";
    mode = "safe_fallback";
    shouldEscalate = true;
    await appendMemory(orgId, ticketId, "AI", finalAnswer);
    io?.to(`ticket-${ticketId}`).emit("typing_indicator", { ticketId, actor: "AI", isTyping: false });
    return { reply: finalAnswer, mode, shouldEscalate };
  }

  const prompt = buildContext(
    buildConfiguredSystemPrompt(aiSettings),
    retrievedDocs,
    memory.map((m) => ({
      role: m.role === "AI" ? "AI" : "USER",
      content: m.content,
    })),
    `Intent: ${intent}\nSentiment: ${sentiment.sentiment}\nMessage: ${message}`
  );

  finalAnswer = await generateOllamaResponse(prompt, {
    model: aiSettings.model,
    temperature: aiSettings.temperature,
  });

  const modelUnavailable = isModelUnavailableResponse(finalAnswer);

  if (modelUnavailable && retrievedContext && aiSettings.kbFallbackEnabled) {
    const concise = retrievedContext.split("\n").slice(0, 3).join(" ").trim();
    if (isDuplicateChargeRefund(message) || intent === "REFUND_REQUEST") {
      finalAnswer =
        "I understand this is about a duplicate charge or refund request. " +
        "I have flagged this for human review and a support agent will verify the billing details shortly.\n\n" +
        (concise || "Please keep your transaction details ready for faster resolution.");
      shouldEscalate = true;
    } else {
      finalAnswer = concise || "I found relevant guidance in our support knowledge base and shared it above.";
    }
    mode = "kb_fallback";
  } else if (modelUnavailable && aiSettings.safeFallbackEnabled) {
    if (isDuplicateChargeRefund(message) || intent === "REFUND_REQUEST") {
      finalAnswer =
        "I understand this is a billing or refund issue. I have flagged your request for human support, and an agent will assist you shortly.";
      shouldEscalate = true;
    } else {
      finalAnswer = "I could not fully process that request right now. A human support agent will review your message shortly.";
      shouldEscalate = true;
    }
    mode = "safe_fallback";
  } else if (modelUnavailable) {
    finalAnswer = "I could not confidently generate a response right now. A support agent will review your message shortly.";
    shouldEscalate = true;
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
