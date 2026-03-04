import { generateGeminiResponse } from "../ai/gemini.service";
import {
  searchKnowledge,
} from "../ai/tools/tools.service";
import { analyzeSentiment } from "../ai/sentiment.service";
import { AiSuggestionsService } from "../modules/ai-suggestions/aiSuggestions.service";

export async function runAgent(
  message: string,
  orgId: string,
  ticketId: string,
  io?: { to: (room: string) => { emit: (event: string, payload: any) => void } }
) {
  const maxSteps = 3;
  let scratchpad = "";
  let finalAnswer = "";

  const sentiment = await analyzeSentiment(message);

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

  for (let step = 0; step < maxSteps; step++) {
    const reasoningPrompt = `
You are an autonomous AI support agent.

Ticket ID: ${ticketId}

User Message:
${message}

Detected Sentiment:
- Type: ${sentiment.sentiment}
- Priority Score: ${sentiment.priorityScore}
- Confidence: ${sentiment.confidence}%

Previous reasoning:
${scratchpad}

Available tools:
1. SEARCH_KNOWLEDGE
2. ESCALATE
3. CHANGE_PRIORITY
4. FINAL_ANSWER

Respond ONLY in this JSON format:

{
  "thought": "your reasoning",
  "action": "TOOL_NAME",
  "input": "optional input"
}
`;

    const response = await generateGeminiResponse(reasoningPrompt);

    let parsed: { thought?: string; action?: string; input?: string };

    try {
      parsed = JSON.parse(response);
    } catch {
      finalAnswer = response;
      break;
    }

    scratchpad += `\nThought: ${parsed.thought ?? ""}\n`;

    if (parsed.action === "SEARCH_KNOWLEDGE") {
      const result = await searchKnowledge(message, orgId);
      scratchpad += `Observation: ${result}\n`;
    } else if (parsed.action === "ESCALATE") {
      const suggestion = await AiSuggestionsService.propose({
        orgId,
        ticketId,
        actionType: "ESCALATE_TO_HUMAN",
        params: { reason: parsed.input ?? "AI requested escalation" },
      });
      scratchpad += `Observation: Escalation proposed (${suggestion.id}).\n`;
      io?.to(`org-${orgId}`).emit("suggestion-created", suggestion);
    } else if (parsed.action === "CHANGE_PRIORITY") {
      const suggestion = await AiSuggestionsService.propose({
        orgId,
        ticketId,
        actionType: "CHANGE_PRIORITY",
        params: { priority: "HIGH", reason: parsed.input ?? "AI requested priority change" },
      });
      scratchpad += `Observation: Priority change proposed (${suggestion.id}).\n`;
      io?.to(`org-${orgId}`).emit("suggestion-created", suggestion);
    } else if (parsed.action === "FINAL_ANSWER") {
      finalAnswer = parsed.input ?? "";
      break;
    }
  }

  if (!finalAnswer) {
    finalAnswer = "Thank you for your message. Our team will assist you shortly.";
  }

  return finalAnswer;
}
