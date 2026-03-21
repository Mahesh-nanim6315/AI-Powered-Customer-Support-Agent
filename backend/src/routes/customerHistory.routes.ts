import { Router } from 'express';
import { CustomerHistoryController } from '../controllers/customerHistory.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Get customer ticket history
router.get('/tickets', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerHistoryController.getTicketHistory
);

// Get customer analytics
router.get('/analytics', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerHistoryController.getCustomerAnalytics
);

// Get communication timeline
router.get('/timeline', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerHistoryController.getCommunicationTimeline
);

// Get satisfaction metrics
router.get('/satisfaction', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerHistoryController.getSatisfactionMetrics
);

// Export customer history
router.get('/export', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerHistoryController.exportHistory
);

export default router;
