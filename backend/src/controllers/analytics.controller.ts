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

            res.json({
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