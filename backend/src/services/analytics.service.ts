import { prisma } from "../config/db";

/*
  Analytics Service
  Provides dashboard-level metrics
*/

export class AnalyticsService {
    /*
      1️⃣ Ticket Overview Stats
    */
    static async getTicketStats(orgId: string) {
        const total = await prisma.ticket.count({
            where: { orgId },
        });

        const open = await prisma.ticket.count({
            where: { orgId, status: "OPEN" },
        });

        const resolved = await prisma.ticket.count({
            where: { orgId, status: "RESOLVED" },
        });

        const escalated = await prisma.ticket.count({
            where: { orgId, status: "WAITING_FOR_HUMAN" },
        });

        return {
            total,
            open,
            resolved,
            escalated,
        };
    }

    /*
      2️⃣ AI vs Human Message Count
    */
    static async getAgentPerformance(orgId: string) {
        const aiMessages = await prisma.ticketMessage.count({
            where: {
                ticket: { orgId },
                role: "AI",
            },
        });

        const humanMessages = await prisma.ticketMessage.count({
            where: {
                ticket: { orgId },
                role: "AGENT",
            },
        });

        return {
            aiMessages,
            humanMessages,
        };
    }

    /*
      3️⃣ Average Resolution Time (in hours)
    */
    static async getAverageResolutionTime(orgId: string) {
        const resolvedTickets = await prisma.ticket.findMany({
            where: {
                orgId,
                status: "RESOLVED",
            },
            select: {
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!resolvedTickets.length) return { averageHours: 0 };

        const totalHours = resolvedTickets.reduce((acc, ticket) => {
            const diff =
                new Date(ticket.updatedAt).getTime() -
                new Date(ticket.createdAt).getTime();

            return acc + diff / (1000 * 60 * 60);
        }, 0);

        return {
            averageHours: totalHours / resolvedTickets.length,
        };
    }

    /*
      4️⃣ Refund Stats
    */
    static async getRefundStats(orgId: string) {
        const refunds = await prisma.refund.count({
            where: {
                ticket: { orgId },
            },
        });

        const totalAmount = await prisma.refund.aggregate({
            where: {
                ticket: { orgId },
                status: "APPROVED",
            },
            _sum: {
                amount: true,
            },
        });

        return {
            totalRefundRequests: refunds,
            totalApprovedAmount: totalAmount._sum.amount || 0,
        };
    }
}