import { Router } from 'express';
import { AgentCollaborationController } from '../controllers/agentCollaboration.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Get team overview
router.get('/team', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentCollaborationController.getTeamOverview
);

// Get internal communications
router.get('/communications', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentCollaborationController.getInternalCommunications
);

// Create internal announcement
router.post('/announcements', 
  allowRoles(['ADMIN']),
  AgentCollaborationController.createAnnouncement
);

// Get shared resources
router.get('/resources', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentCollaborationController.getSharedResources
);

// Get handover requests
router.get('/handovers', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentCollaborationController.getHandoverRequests
);

// Create handover request
router.post('/handovers', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentCollaborationController.createHandoverRequest
);

// Get collaboration metrics
router.get('/metrics', 
  allowRoles(['ADMIN', 'AGENT']),
  AgentCollaborationController.getCollaborationMetrics
);

export default router;
