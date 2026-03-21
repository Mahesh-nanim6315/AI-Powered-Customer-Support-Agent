import { Router } from 'express';
import { MessageSearchController } from '../controllers/messageSearch.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Advanced message search
router.get('/search', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  MessageSearchController.searchMessages
);

// Get search suggestions
router.get('/search/suggestions', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  MessageSearchController.getSearchSuggestions
);

// Get popular search terms
router.get('/search/popular', 
  allowRoles(['ADMIN', 'AGENT']),
  MessageSearchController.getPopularSearchTerms
);

// Search within specific ticket
router.get('/tickets/:ticketId/search', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  MessageSearchController.searchTicketMessages
);

// Quick search for autocomplete
router.get('/search/quick', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  MessageSearchController.quickSearch
);

export default router;
