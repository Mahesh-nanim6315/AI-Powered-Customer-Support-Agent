import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*
  Escalation Tool
  This is used by the Agent when:
  - User is angry
  - AI does not know answer
  - High priority issue
*/

interface EscalateInput {
    ticketId: string;
    reason: string;
}

export async function escalateToHumanTool({
    ticketId,
    reason,
}: EscalateInput) {
    try {
        // 1️⃣ Update ticket status
        await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: "ESCALATED",
            },
        });

        // 2️⃣ Add system message to conversation
        await prisma.ticketMessage.create({
            data: {
                ticketId,
                sender: "SYSTEM",
                content: `⚠️ This ticket has been escalated to a human agent. Reason: ${reason}`,
            },
        });

        return {
            success: true,
            message:
                "I have escalated your request to a human support agent. They will assist you shortly.",
        };
    } catch (error) {
        console.error("Escalation Error:", error);

        return {
            success: false,
            message:
                "There was an issue escalating your ticket. Please try again.",
        };
    }
}