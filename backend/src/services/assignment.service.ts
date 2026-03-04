import { prisma } from "../config/db";

export class AssignmentService {
  /**
   * Assign ticket to least-loaded agent in the same org.
   * This is a simple baseline (round-robin / load-based can be evolved).
   */
  static async assignTicket(ticketId: string, orgId: string) {
    const agents = await prisma.agent.findMany({
      where: { user: { orgId }, busyStatus: false },
      orderBy: [{ activeTickets: "asc" }, { lastAssignedAt: "asc" }],
    });

    if (!agents.length) {
      return { success: false, assignedTo: null, ticket: null };
    }

    const selectedAgent = agents[0];

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedAgentId: selectedAgent.id,
        status: "OPEN",
      },
    });

    await prisma.agent.update({
      where: { id: selectedAgent.id },
      data: {
        activeTickets: { increment: 1 },
        lastAssignedAt: new Date(),
      },
    });

    return {
      success: true,
      assignedTo: selectedAgent.id,
      ticket: updatedTicket,
    };
  }
}