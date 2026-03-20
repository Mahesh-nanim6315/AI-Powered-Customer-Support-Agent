import { prisma } from "../config/db";

/*
  Analytics Service
  Provides dashboard-level metrics
*/

export class AnalyticsService {
    /*
      1️⃣ Total Tickets
    */
    static async getTotalTickets(orgId: string): Promise<number> {
        const total = await prisma.ticket.count({
            where: { orgId },
        });
        return total;
    }

    /*
      2️⃣ Active Tickets (OPEN, AI_IN_PROGRESS, IN_PROGRESS)
    */
    static async getActiveTickets(orgId: string): Promise<number> {
        const active = await prisma.ticket.count({
            where: {
                orgId,
                status: {
                    in: ["OPEN", "AI_IN_PROGRESS", "IN_PROGRESS"] as any,
                },
            },
        });
        return active;
    }

    /*
      3️⃣ AI Resolution Rate
    */
    static async getAIResolutionRate(orgId: string): Promise<number> {
        const totalTickets = await prisma.ticket.count({
            where: { orgId },
        });

        if (totalTickets === 0) return 0;

        // Count tickets resolved by AI (tickets with AI messages and resolved status)
        const aiResolvedTickets = await prisma.ticket.count({
            where: {
                orgId,
                status: "RESOLVED",
                messages: {
                    some: {
                        role: "AI",
                    },
                },
            },
        });

        return aiResolvedTickets / totalTickets;
    }

    /*
      4️⃣ Agent Resolution Rate
    */
    static async getAgentResolutionRate(orgId: string): Promise<number> {
        const totalTickets = await prisma.ticket.count({
            where: { orgId },
        });

        if (totalTickets === 0) return 0;

        // Count tickets resolved by agents (tickets with agent messages and resolved status)
        const agentResolvedTickets = await prisma.ticket.count({
            where: {
                orgId,
                status: "RESOLVED",
                messages: {
                    some: {
                        role: "AGENT",
                    },
                },
            },
        });

        return agentResolvedTickets / totalTickets;
    }

    /*
      5️⃣ Average Response Time (difference between first reply and ticket creation)
    */
    static async getAvgResponseTime(orgId: string): Promise<number> {
        const tickets = await prisma.ticket.findMany({
            where: {
                orgId,
                messages: {
                    some: {
                        role: {
                            in: ["AI", "AGENT"],
                        },
                    },
                },
            },
            include: {
                messages: {
                    where: {
                        role: {
                            in: ["AI", "AGENT"],
                        },
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                    take: 1,
                },
            },
        });

        if (!tickets.length) return 0;

        const totalResponseTime = tickets.reduce((acc, ticket) => {
            const firstReply = ticket.messages[0];
            if (firstReply) {
                const responseTime = new Date(firstReply.createdAt).getTime() - new Date(ticket.createdAt).getTime();
                return acc + responseTime;
            }
            return acc;
        }, 0);

        const avgResponseTimeMs = totalResponseTime / tickets.length;
        return avgResponseTimeMs / (1000 * 60); // Convert to minutes
    }

    /*
      6️⃣ CSAT (Customer Satisfaction - average rating from feedback)
    */
    static async getCSAT(orgId: string): Promise<number> {
        // For now, we'll use resolved tickets as a proxy
        // In a real implementation, you would have a feedback table with ratings
        const totalTickets = await prisma.ticket.count({
            where: { orgId },
        });

        const resolvedTickets = await prisma.ticket.count({
            where: {
                orgId,
                status: "RESOLVED",
            },
        });

        if (totalTickets === 0) return 0;
        return resolvedTickets / totalTickets;
    }

    /*
      7️⃣ Escalation Rate
    */
    static async getEscalationRate(orgId: string): Promise<number> {
        const totalTickets = await prisma.ticket.count({
            where: { orgId },
        });

        if (totalTickets === 0) return 0;

        const escalatedTickets = await prisma.ticket.count({
            where: {
                orgId,
                status: {
                    in: ["ESCALATED", "WAITING_FOR_HUMAN"] as any,
                },
            },
        });

        return escalatedTickets / totalTickets;
    }

    /*
      8️⃣ Active Agents
    */
    static async getActiveAgents(orgId: string): Promise<number> {
        const activeAgents = await prisma.agent.count({
            where: {
                user: {
                    orgId,
                },
                busyStatus: false,
            },
        });
        return activeAgents;
    }

    /*
      📊 Overview - Get all metrics at once
    */
    static async getOverview(orgId: string) {
        const [
            totalTickets,
            activeTickets,
            aiResolutionRate,
            agentResolutionRate,
            avgResponseTime,
            csat,
            escalationRate,
            activeAgents,
        ] = await Promise.all([
            this.getTotalTickets(orgId),
            this.getActiveTickets(orgId),
            this.getAIResolutionRate(orgId),
            this.getAgentResolutionRate(orgId),
            this.getAvgResponseTime(orgId),
            this.getCSAT(orgId),
            this.getEscalationRate(orgId),
            this.getActiveAgents(orgId),
        ]);

        return {
            totalTickets,
            activeTickets,
            aiResolutionRate,
            agentResolutionRate,
            avgResponseTime,
            csat,
            escalationRate,
            activeAgents,
        };
    }

    /*
      📈 Ticket Trends (for advanced analytics)
    */
    static async getTicketTrends(orgId: string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const tickets = await prisma.ticket.findMany({
            where: {
                orgId,
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                createdAt: true,
                status: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Group by date
        const trends: Record<string, { created: number; resolved: number }> = {};
        
        tickets.forEach(ticket => {
            const date = ticket.createdAt.toISOString().split('T')[0];
            if (!trends[date]) {
                trends[date] = { created: 0, resolved: 0 };
            }
            trends[date].created++;
            if (ticket.status === 'RESOLVED') {
                trends[date].resolved++;
            }
        });

        return trends;
    }

    /*
      👥 Agent Performance (for advanced analytics)
    */
    static async getAgentPerformance(orgId: string) {
        const agents = await prisma.agent.findMany({
            where: {
                user: {
                    orgId,
                },
            },
            include: {
                user: {
                    select: {
                        email: true,
                    },
                },
                assignedTickets: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });

        const performance = agents.map(agent => {
            const totalTickets = agent.assignedTickets.length;
            const resolvedTickets = agent.assignedTickets.filter(t => t.status === 'RESOLVED').length;
            const avgResolutionTime = this.calculateAgentAvgResolutionTime(agent.assignedTickets);

            return {
                agentId: agent.id,
                email: agent.user.email,
                totalTickets,
                resolvedTickets,
                resolutionRate: totalTickets > 0 ? resolvedTickets / totalTickets : 0,
                avgResolutionTime,
                busyStatus: agent.busyStatus,
                activeTickets: agent.activeTickets,
            };
        });

        return performance;
    }

    private static calculateAgentAvgResolutionTime(tickets: any[]): number {
        const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED');
        if (resolvedTickets.length === 0) return 0;

        const totalTime = resolvedTickets.reduce((acc, ticket) => {
            return acc + (new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime());
        }, 0);

        return totalTime / resolvedTickets.length / (1000 * 60); // Convert to minutes
    }

    /*
      Legacy methods for backward compatibility
    */
    static async getTicketStats(orgId: string) {
        const total = await prisma.ticket.count({
            where: { orgId },
        });

        const open = await prisma.ticket.count({
            where: {
                orgId,
                status: {
                    in: ["OPEN", "AI_IN_PROGRESS", "IN_PROGRESS"] as any,
                },
            },
        });

        const resolved = await prisma.ticket.count({
            where: { orgId, status: "RESOLVED" },
        });

        const escalated = await prisma.ticket.count({
            where: {
                orgId,
                status: {
                    in: ["WAITING_FOR_HUMAN", "ESCALATED"] as any,
                },
            },
        });

        return {
            total,
            open,
            resolved,
            escalated,
        };
    }

    static async getAgentPerformanceLegacy(orgId: string) {
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
