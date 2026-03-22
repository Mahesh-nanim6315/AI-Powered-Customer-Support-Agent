import prisma from "../config/database";

export class TicketAssignmentHistoryService {
  static async record(params: {
    ticketId: string;
    agentId?: string | null;
    assignedByUserId?: string | null;
    action: "ASSIGNED" | "REASSIGNED" | "UNASSIGNED" | "AUTO_ASSIGNED";
    reason?: string | null;
  }) {
    return prisma.ticketAssignment.create({
      data: {
        ticketId: params.ticketId,
        agentId: params.agentId ?? null,
        assignedByUserId: params.assignedByUserId ?? null,
        action: params.action,
        reason: params.reason ?? null,
      },
    });
  }

  static async getTicketHistory(ticketId: string, orgId: string) {
    try {
      return await prisma.ticketAssignment.findMany({
        where: {
          ticketId,
          ticket: { orgId },
        },
        include: {
          agent: {
            include: {
              user: {
                select: { email: true },
              },
            },
          },
          assignedByUser: {
            select: {
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("Failed to load ticket assignment history:", error);
      return [];
    }
  }
}
