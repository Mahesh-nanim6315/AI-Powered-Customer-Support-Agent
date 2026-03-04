import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*
  Tool: Update Ticket Status

  Used when:
  - Issue resolved → CLOSE
  - Needs review → PENDING
  - Waiting on customer → ON_HOLD
  - Reopen issue → OPEN
*/

interface UpdateTicketStatusInput {
    ticketId: string;
    status: "OPEN" | "RESOLVED" | "CLOSED" | "ON_HOLD" | "ESCALATED";
    note?: string;
}

export async function updateTicketStatusTool({
    ticketId,
    status,
    note,
}: UpdateTicketStatusInput) {
    try {
        // 1️⃣ Update ticket status
        const updatedTicket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { status },
        });

        // 2️⃣ Log system message
        await prisma.ticketMessage.create({
            data: {
                ticketId,
                sender: "SYSTEM",
                content: `📌 Ticket status updated to "${status}"${note ? `.\nNote: ${note}` : "."
                    }`,
            },
        });

        return {
            success: true,
            message: `Ticket status successfully updated to ${status}.`,
            data: updatedTicket,
        };
    } catch (error) {
        console.error("Update Ticket Status Tool Error:", error);

        return {
            success: false,
            message: "Failed to update ticket status.",
        };
    }
}