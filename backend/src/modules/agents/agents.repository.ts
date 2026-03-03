import prisma from "../../config/database";

export class AgentRepository {

  static async create(userId: string, specialization?: string) {
    return prisma.agent.create({
      data: {
        userId,
        specialization
      }
    });
  }

  static async findAvailableAgents(orgId: string) {
    return prisma.agent.findMany({
      where: {
        user: {
          orgId
        },
        busyStatus: false
      },
      orderBy: [
        { activeTickets: "asc" },
        { lastAssignedAt: "asc" }
      ]
    });
  }

  static async incrementLoad(agentId: string) {
    return prisma.agent.update({
      where: { id: agentId },
      data: {
        activeTickets: { increment: 1 },
        lastAssignedAt: new Date()
      }
    });
  }
}