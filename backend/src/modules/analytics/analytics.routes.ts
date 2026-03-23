import { Router } from "express";
import { AnalyticsController } from "../../controllers/analytics.controller";
import { allowRoles } from "../../middlewares/role.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Legacy dashboard endpoint (for backward compatibility)
router.get("/dashboard", allowRoles("ADMIN", "AGENT"), AnalyticsController.getDashboard);

// Admin-only analytics endpoints
router.get("/admin/overview", allowRoles("ADMIN"), AnalyticsController.getOverview);
router.get("/admin/ticket-trends", allowRoles("ADMIN"), AnalyticsController.getTicketTrends);
router.get("/admin/agent-performance", allowRoles("ADMIN"), AnalyticsController.getAgentPerformance);
router.get("/admin/operational-insights", allowRoles("ADMIN"), AnalyticsController.getOperationalInsights);

export default router;
