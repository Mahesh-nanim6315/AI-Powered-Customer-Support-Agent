import prisma from "../config/database";

type TicketActivityItem = {
  id: string;
  type: "TICKET_CREATED" | "MESSAGE" | "STATUS_CHANGE" | "ASSIGNMENT";
  createdAt: Date;
  actor: string;
  description: string;
};

export class TicketActivityService {
  static async getTicketActivity(ticketId: string, orgId: string): Promise<TicketActivityItem[]> {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        orgId,
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const [messages, notifications, assignments] = await Promise.all([
      prisma.ticketMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.customerNotification.findMany({
        where: {
          ticketId,
          orgId,
          type: {
            in: ["TICKET_UPDATED", "TICKET_RESOLVED", "TICKET_ESCALATED", "TICKET_ASSIGNED"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }).catch((error) => {
        console.error("Failed to load ticket notifications for activity:", error);
        return [];
      }),
      prisma.ticketAssignment.findMany({
        where: {
          ticketId,
          ticket: {
            orgId,
          },
        },
        include: {
          agent: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          assignedByUser: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }).catch((error) => {
        console.error("Failed to load ticket assignments for activity:", error);
        return [];
      }),
    ]);

    const createdActor =
      ticket.createdByUser?.email ??
      ticket.customer?.email ??
      ticket.customer?.name ??
      "Customer";

    const createdEntry: TicketActivityItem = {
      id: `created-${ticket.id}`,
      type: "TICKET_CREATED",
      createdAt: ticket.createdAt,
      actor: createdActor,
      description: `Ticket created: ${ticket.subject}`,
    };

    const messageEntries: TicketActivityItem[] = messages.map((message) => ({
      id: `message-${message.id}`,
      type: "MESSAGE",
      createdAt: message.createdAt,
      actor: message.role === "AI" ? "AI Assistant" : message.role,
      description:
        message.content.length > 120
          ? `${message.content.slice(0, 120)}...`
          : message.content,
    }));

    const statusEntries: TicketActivityItem[] = notifications.map((notification) => ({
      id: `notification-${notification.id}`,
      type: "STATUS_CHANGE",
      createdAt: notification.createdAt,
      actor: "System",
      description: notification.message,
    }));

    const assignmentEntries: TicketActivityItem[] = assignments.map((assignment) => {
      const agentEmail = assignment.agent?.user?.email ?? "Unassigned";
      const assignedBy = assignment.assignedByUser?.email;

      return {
        id: `assignment-${assignment.id}`,
        type: "ASSIGNMENT",
        createdAt: assignment.createdAt,
        actor: assignedBy ?? "System",
        description: `${assignment.action} ${agentEmail}`,
      };
    });

    return [createdEntry, ...messageEntries, ...statusEntries, ...assignmentEntries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);
  }
}
