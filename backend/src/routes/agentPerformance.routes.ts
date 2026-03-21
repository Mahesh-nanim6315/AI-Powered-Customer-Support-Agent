import { Router } from 'express';
import { AgentPerformanceController } from '../controllers/agentPerformance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Get performance overview
router.get('/overview', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentPerformanceController.getPerformanceOverview
);

// Get performance trends
router.get('/trends', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentPerformanceController.getPerformanceTrends
);

// Get team comparison
router.get('/team-comparison', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentPerformanceController.getTeamComparison
);

// Get skills and specialization metrics
router.get('/skills', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentPerformanceController.getSkillsMetrics
);

// Get goals and achievements
router.get('/goals', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentPerformanceController.getGoalsAndAchievements
);

export default router;
