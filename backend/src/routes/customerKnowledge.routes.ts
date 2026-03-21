import { Router } from 'express';
import { CustomerKnowledgeController } from '../controllers/customerKnowledge.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { orgMiddleware } from '../middlewares/org.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Apply authentication and organization middleware
router.use(authMiddleware, orgMiddleware);

// Search knowledge base articles
router.get('/search', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerKnowledgeController.searchArticles
);

// Get article by ID
router.get('/articles/:articleId', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerKnowledgeController.getArticle
);

// Get knowledge base categories
router.get('/categories', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerKnowledgeController.getCategories
);

// Get popular articles
router.get('/popular', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerKnowledgeController.getPopularArticles
);

// Get recently added articles
router.get('/recent', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerKnowledgeController.getRecentArticles
);

// Get related articles
router.get('/articles/:articleId/related', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerKnowledgeController.getRelatedArticles
);

// Get knowledge base statistics
router.get('/stats', 
  allowRoles(['ADMIN', 'AGENT', 'CUSTOMER']),
  CustomerKnowledgeController.getKnowledgeStats
);

export default router;
