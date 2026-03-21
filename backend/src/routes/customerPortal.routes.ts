import { Router } from 'express';
import { CustomerPortalController } from '../controllers/customerPortal.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Customer dashboard
router.get('/dashboard', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerPortalController.getDashboard
);

// Customer tickets
router.get('/tickets', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerPortalController.getTickets
);

// Get ticket details
router.get('/tickets/:ticketId', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerPortalController.getTicketDetails
);

// Create new ticket
router.post('/tickets', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerPortalController.createTicket
);

// Update customer profile
router.put('/profile', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerPortalController.updateProfile
);

// Get customer notifications
router.get('/notifications', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerPortalController.getNotifications
);

// Mark notification as read
router.put('/notifications/:notificationId/read', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerPortalController.markNotificationRead
);

export default router;
