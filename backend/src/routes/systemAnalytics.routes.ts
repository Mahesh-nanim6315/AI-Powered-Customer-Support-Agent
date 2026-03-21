import { Router } from 'express';
import { SystemAnalyticsController } from '../controllers/systemAnalytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Get comprehensive system analytics
router.get('/system', 
  allowRoles(['ADMIN']),
  SystemAnalyticsController.getSystemAnalytics
);

// Get detailed reports
router.get('/reports', 
  allowRoles(['ADMIN']),
  SystemAnalyticsController.getDetailedReports
);

// Get real-time analytics
router.get('/real-time', 
  allowRoles(['ADMIN']),
  SystemAnalyticsController.getRealTimeAnalytics
);

// Get custom analytics
router.post('/custom', 
  allowRoles(['ADMIN']),
  SystemAnalyticsController.getCustomAnalytics
);

// Get analytics dashboard summary
router.get('/summary', 
  allowRoles(['ADMIN']),
  SystemAnalyticsController.getAnalyticsSummary
);

export default router;
