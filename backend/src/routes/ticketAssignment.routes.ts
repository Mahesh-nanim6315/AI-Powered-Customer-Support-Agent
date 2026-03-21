import { Router } from 'express';
import { TicketAssignmentController } from '../controllers/ticketAssignment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Get queue overview
router.get('/queue', 
  allowRoles(['ADMIN', 'AGENT']),
  TicketAssignmentController.getQueueOverview
);

// Assign ticket to agent
router.post('/assign', 
  allowRoles(['ADMIN', 'AGENT']),
  TicketAssignmentController.assignTicket
);

// Auto-assign tickets
router.post('/auto-assign', 
  allowRoles(['ADMIN']),
  TicketAssignmentController.autoAssignTickets
);

// Reassign ticket
router.post('/reassign', 
  allowRoles(['ADMIN', 'AGENT']),
  TicketAssignmentController.reassignTicket
);

// Unassign ticket
router.post('/unassign', 
  allowRoles(['ADMIN', 'AGENT']),
  TicketAssignmentController.unassignTicket
);

// Get assignment rules
router.get('/rules', 
  allowRoles(['ADMIN', 'AGENT']),
  TicketAssignmentController.getAssignmentRules
);

// Get queue analytics
router.get('/analytics', 
  allowRoles(['ADMIN', 'AGENT']),
  TicketAssignmentController.getQueueAnalytics
);

export default router;
