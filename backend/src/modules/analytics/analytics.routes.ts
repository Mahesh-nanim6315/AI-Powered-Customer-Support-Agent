import { Router } from "express";
import { AnalyticsController } from "../../controllers/analytics.controller";
import { allowRoles } from "../../middlewares/role.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/dashboard", allowRoles("ADMIN", "AGENT"), AnalyticsController.getDashboard);

export default router;