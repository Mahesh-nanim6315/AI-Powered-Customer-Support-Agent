import prisma from "../../config/database";

export class TicketRepository {

  static async create(data: any) {
    return prisma.ticket.create({ data });
  }

  static async findAll(orgId: string) {
    return prisma.ticket.findMany({
      where: { orgId },
      include: {
        customer: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async findById(id: string, orgId: string) {
    return prisma.ticket.findFirst({
      where: {
        id,
        orgId
      },
      include: {
        messages: true,
        customer: true
      }
    });
  }

  static async updateStatus(id: string, orgId: string, status: any) {
    const updated = await prisma.ticket.updateMany({
      where: { id, orgId },
      data: { status },
    });

    if (updated.count === 0) return null;

    return prisma.ticket.findFirst({
      where: { id, orgId },
      include: { messages: true, customer: true },
    });
  }

  static async updateDetails(
    id: string,
    orgId: string,
    data: {
      subject?: string;
      description?: string;
      priority?: "LOW" | "MEDIUM" | "HIGH";
    }
  ) {
    const updated = await prisma.ticket.updateMany({
      where: { id, orgId },
      data,
    });

    if (updated.count === 0) return null;

    return prisma.ticket.findFirst({
      where: { id, orgId },
      include: { messages: true, customer: true },
    });
  }

  static async deleteById(id: string, orgId: string) {
    return prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id, orgId },
        select: { id: true },
      });
      if (!ticket) return null;

      await tx.ticketMessage.deleteMany({ where: { ticketId: id } });
      await tx.refund.deleteMany({ where: { ticketId: id } });
      await tx.ticketAnalytics.deleteMany({ where: { ticketId: id } });
      await tx.aiSuggestion.deleteMany({ where: { ticketId: id } });
      await tx.ticket.delete({ where: { id } });

      return { id };
    });
  }
}
