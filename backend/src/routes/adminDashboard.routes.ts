import { Router } from 'express';
import { AdminDashboardController } from '../controllers/adminDashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Get admin dashboard overview
router.get('/overview', 
  allowRoles(['ADMIN']),
  AdminDashboardController.getDashboardOverview
);

// Get system health status
router.get('/health', 
  allowRoles(['ADMIN']),
  AdminDashboardController.getSystemHealth
);

// Get system alerts and notifications
router.get('/alerts', 
  allowRoles(['ADMIN']),
  AdminDashboardController.getSystemAlerts
);

// Get quick actions dashboard
router.get('/quick-actions', 
  allowRoles(['ADMIN']),
  AdminDashboardController.getQuickActions
);

// Get system metrics overview
router.get('/metrics', 
  allowRoles(['ADMIN']),
  AdminDashboardController.getSystemMetrics
);

export default router;
