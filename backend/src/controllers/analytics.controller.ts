import { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";

export class AnalyticsController {
    static async getDashboard(req: Request, res: Response) {
        try {
            const orgId = req.user?.orgId;

            if (!orgId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const [ticketStats, agentPerformance, avgResolutionTime, refundStats] = await Promise.all([
                AnalyticsService.getTicketStats(orgId),
                AnalyticsService.getAgentPerformance(orgId),
                AnalyticsService.getAverageResolutionTime(orgId),
                AnalyticsService.getRefundStats(orgId),
            ]);

            // Frontend dashboard expects a flat analytics payload.
            const totalTickets = ticketStats.total ?? 0;
            const openTickets = ticketStats.open ?? 0;
            const resolvedTickets = ticketStats.resolved ?? 0;
            const avgResponseTime = (avgResolutionTime.averageHours ?? 0) * 60; // minutes

            const totalMessages = (agentPerformance.aiMessages ?? 0) + (agentPerformance.humanMessages ?? 0);
            const aiResolutionRate = totalMessages > 0
                ? (agentPerformance.aiMessages ?? 0) / totalMessages
                : 0;

            // Proxy metric until CSAT survey data exists.
            const customerSatisfaction = totalTickets > 0 ? resolvedTickets / totalTickets : 0;

            res.json({
                totalTickets,
                openTickets,
                resolvedTickets,
                avgResponseTime,
                aiResolutionRate,
                customerSatisfaction,

                // keep legacy nested fields for compatibility
                ticketStats,
                agentPerformance,
                avgResolutionTime,
                refundStats,
            });
        } catch (error: any) {
            console.error("Analytics dashboard error:", error);
            res.status(500).json({ message: "Failed to fetch analytics data" });
        }
    }
}
