import prisma from "../../config/database";
import { normalizeApiStatus, toDbStatus } from "../../modules/tickets/ticketStatus.lifecycle";

/*
  Tool: Update Ticket Status

  Used when:
  - AI is working -> AI_IN_PROGRESS
  - Issue resolved -> RESOLVED
  - Needs human -> ESCALATED
  - Reopen issue -> OPEN
  - Close out -> CLOSED
*/

interface UpdateTicketStatusInput {
  ticketId: string;
  status:
    | "OPEN"
    | "AI_IN_PROGRESS"
    | "AI_HANDLING"
    | "ESCALATED"
    | "IN_PROGRESS"
    | "WAITING_FOR_HUMAN"
    | "RESOLVED"
    | "CLOSED";
  note?: string;
}

export async function updateTicketStatusTool({
  ticketId,
  status,
  note,
}: UpdateTicketStatusInput) {
  try {
    const normalized = normalizeApiStatus(status);

    // Update ticket status
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: toDbStatus(normalized) },
    });

    // Log system message
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        role: "AI",
        content: `Ticket status updated to "${normalized}"${note ? `.\nNote: ${note}` : "."}`,
      },
    });

    return {
      success: true,
      message: `Ticket status successfully updated to ${normalized}.`,
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
