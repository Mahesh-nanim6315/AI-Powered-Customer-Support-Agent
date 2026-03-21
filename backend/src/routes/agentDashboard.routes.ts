import { Router } from 'express';
import { AgentDashboardController } from '../controllers/agentDashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Get agent dashboard overview
router.get('/overview', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentDashboardController.getDashboardOverview
);

// Get agent performance trends
router.get('/trends', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentDashboardController.getPerformanceTrends
);

// Get agent workload analysis
router.get('/workload', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentDashboardController.getWorkloadAnalysis
);

// Get agent comparison metrics
router.get('/comparison', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentDashboardController.getComparisonMetrics
);

export default router;
