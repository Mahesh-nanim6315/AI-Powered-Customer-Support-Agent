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
}