import { buildAIContext } from "./context-builder";
import { runTool } from "./tool-runner";
import { getToolSelectionPrompt } from "./prompts/toolSelection.prompt";
import { getBaseSystemPrompt } from "./prompts/baseSystem.prompt";
import { generateGeminiResponse } from "../modules/ai/ai.service"; // adjust if needed
import prisma from "../config/database";

interface AgentInput {
    ticketId: string;
    orgId: string;
    userMessage: string;
}

interface AgentResult {
    finalAnswer: string;
    steps: number;
    scratchpad: string;
}

export class AutonomousAgent {
    private maxSteps = 3;

    async execute(input: AgentInput): Promise<AgentResult> {
        const { ticketId, orgId, userMessage } = input;

        let scratchpad = "";
        let finalAnswer = "";
        let steps = 0;

        // 1️⃣ Build full AI context
        const context = await buildAIContext({
            ticketId,
            orgId,
            userMessage,
        });

        for (let i = 0; i < this.maxSteps; i++) {
            steps++;

            const reasoningPrompt = getToolSelectionPrompt({
                systemPrompt: getBaseSystemPrompt(),
                context,
                scratchpad,
                userMessage,
            });

            const rawResponse = await generateGeminiResponse(reasoningPrompt);

            let parsed;

            try {
                parsed = JSON.parse(rawResponse);
            } catch (err) {
                // Fallback: treat response as final answer
                finalAnswer = rawResponse;
                break;
            }

            scratchpad += `\nThought: ${parsed.thought}\n`;

            if (parsed.action === "FINAL_ANSWER") {
                finalAnswer = parsed.input;
                break;
            }

            // 2️⃣ Run tool safely
            const observation = await runTool({
                toolName: parsed.action,
                input: parsed.input,
                ticketId,
                orgId,
            });

            scratchpad += `Observation: ${observation}\n`;
        }

        if (!finalAnswer) {
            finalAnswer =
                "Thank you for your message. Our support team will assist you shortly.";
        }

        // 3️⃣ Store agent log for observability
        await prisma.agentLog.create({
            data: {
                ticketId,
                content: scratchpad,
            },
        });

        return {
            finalAnswer,
            steps,
            scratchpad,
        };
    }
}