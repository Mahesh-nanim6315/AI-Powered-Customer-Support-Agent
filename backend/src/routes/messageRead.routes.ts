import { Router } from 'express';
import { MessageReadController } from '../controllers/messageRead.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Mark message as read
router.post('/messages/:messageId/read', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  MessageReadController.markAsRead
);

// Mark multiple messages as read
router.post('/messages/read-multiple', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  MessageReadController.markMultipleAsRead
);

// Get read status for a message
router.get('/messages/:messageId/read-status', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  MessageReadController.getReadStatus
);

// Get read receipts for a ticket
router.get('/tickets/:ticketId/read-receipts', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  MessageReadController.getTicketReadReceipts
);

// Get user read statistics
router.get('/read-stats', 
  allowRoles(['ADMIN', 'AGENT']),
  MessageReadController.getUserReadStats
);

// Get unread count for a ticket
router.get('/tickets/:ticketId/unread-count', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  MessageReadController.getTicketUnreadCount
);

export default router;
