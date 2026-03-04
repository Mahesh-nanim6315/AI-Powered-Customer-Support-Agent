import { generateGeminiResponse } from "../ai/gemini.service";
import {
  searchKnowledge,
  escalateTicket,
  changePriority,
} from "../ai/tools/tools.service";
import { analyzeSentiment } from "../ai/sentiment.service";

export async function runAgent(
  message: string,
  orgId: string,
  ticketId: string
) {
  const maxSteps = 3;
  let scratchpad = "";
  let finalAnswer = "";

  const sentiment = await analyzeSentiment(message);

  // Apply deterministic safeguards before tool-loop reasoning.
  if (sentiment.priorityScore >= 8) {
    await changePriority(ticketId, "HIGH");
  }

  if (sentiment.sentiment === "ANGRY" || sentiment.sentiment === "URGENT") {
    await escalateTicket(ticketId);
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
      await escalateTicket(ticketId);
      scratchpad += "Observation: Ticket escalated.\n";
    } else if (parsed.action === "CHANGE_PRIORITY") {
      await changePriority(ticketId, "HIGH");
      scratchpad += "Observation: Priority changed to HIGH.\n";
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
