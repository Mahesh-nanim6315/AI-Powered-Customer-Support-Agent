import { Router } from 'express';
import { AutomationController } from '../controllers/automation.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Get workflow rules
router.get('/rules', 
  allowRoles(['ADMIN', 'AGENT']),
  AutomationController.getWorkflowRules
);

// Create workflow rule
router.post('/rules', 
  allowRoles(['ADMIN']),
  AutomationController.createWorkflowRule
);

// Update workflow rule
router.put('/rules/:ruleId', 
  allowRoles(['ADMIN']),
  AutomationController.updateWorkflowRule
);

// Delete workflow rule
router.delete('/rules/:ruleId', 
  allowRoles(['ADMIN']),
  AutomationController.deleteWorkflowRule
);

// Get automation history
router.get('/history', 
  allowRoles(['ADMIN', 'AGENT']),
  AutomationController.getAutomationHistory
);

// Get automation analytics
router.get('/analytics', 
  allowRoles(['ADMIN', 'AGENT']),
  AutomationController.getAutomationAnalytics
);

// Test workflow rule
router.post('/test', 
  allowRoles(['ADMIN']),
  AutomationController.testWorkflowRule
);

// Get automation templates
router.get('/templates', 
  allowRoles(['ADMIN', 'AGENT']),
  AutomationController.getAutomationTemplates
);

export default router;
