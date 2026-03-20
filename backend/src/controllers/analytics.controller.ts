import { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";

export class AnalyticsController {
    /*
      📊 Admin Analytics Overview
      GET /api/admin/analytics/overview
    */
    static async getOverview(req: Request, res: Response) {
        try {
            const orgId = req.user?.orgId;

            if (!orgId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const overview = await AnalyticsService.getOverview(orgId);

            res.json(overview);
        } catch (error: any) {
            console.error("Analytics overview error:", error);
            res.status(500).json({ message: "Failed to fetch analytics overview" });
        }
    }

    /*
      📈 Ticket Trends
      GET /api/admin/analytics/ticket-trends?days=30
    */
    static async getTicketTrends(req: Request, res: Response) {
        try {
            const orgId = req.user?.orgId;
            const days = parseInt(req.query.days as string) || 30;

            if (!orgId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const trends = await AnalyticsService.getTicketTrends(orgId, days);

            res.json(trends);
        } catch (error: any) {
            console.error("Ticket trends error:", error);
            res.status(500).json({ message: "Failed to fetch ticket trends" });
        }
    }

    /*
      👥 Agent Performance
      GET /api/admin/analytics/agent-performance
    */
    static async getAgentPerformance(req: Request, res: Response) {
        try {
            const orgId = req.user?.orgId;

            if (!orgId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const performance = await AnalyticsService.getAgentPerformance(orgId);

            res.json(performance);
        } catch (error: any) {
            console.error("Agent performance error:", error);
            res.status(500).json({ message: "Failed to fetch agent performance" });
        }
    }

    /*
      📊 Legacy Dashboard Endpoint (for backward compatibility)
      GET /analytics/dashboard
    */
    static async getDashboard(req: Request, res: Response) {
        try {
            const orgId = req.user?.orgId;

            if (!orgId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const [ticketStats, agentPerformance, avgResolutionTime, refundStats] = await Promise.all([
                AnalyticsService.getTicketStats(orgId),
                AnalyticsService.getAgentPerformanceLegacy(orgId),
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
