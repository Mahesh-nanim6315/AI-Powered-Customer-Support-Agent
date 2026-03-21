import { Request, Response } from 'express';
import prisma from '../config/database';
import { validate } from '../middlewares/validation.middleware';
import { uuidSchema, searchSchema, paginationSchema } from '../validators/common.validators';

/**
 * Customer Knowledge Base Controller - Customer-facing knowledge base access
 */
export class CustomerKnowledgeController {
  
  /**
   * Search knowledge base articles
   */
  static async searchArticles(req: Request, res: Response) {
    try {
      const { query, category, page, limit } = await validate({
        query: {
          query: searchSchema.optional(),
          category: searchSchema.optional(),
          page: paginationSchema.optional(),
          limit: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 10;
      const skip = (pageNum - 1) * limitNum;

      // Build where clause for public knowledge base articles
      const where: any = {
        orgId,
        isPublic: true,
        status: 'PUBLISHED'
      };

      if (query && query.trim()) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } }
        ];
      }

      if (category) {
        where.category = category;
      }

      // Get articles and total count
      const [articles, totalCount] = await Promise.all([
        prisma.knowledgeBase.findMany({
          where,
          select: {
            id: true,
            title: true,
            summary: true,
            category: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
            viewCount: true
          },
          orderBy: [
            { viewCount: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: limitNum
        }),
        prisma.knowledgeBase.count({ where })
      ]);

      // Increment view counts for viewed articles
      const articleIds = articles.map(article => article.id);
      if (articleIds.length > 0) {
        await prisma.knowledgeBase.updateMany({
          where: { id: { in: articleIds } },
          data: { viewCount: { increment: 1 } }
        });
      }

      res.json({
        success: true,
        articles: articles.map(article => ({
          id: article.id,
          title: article.title,
          summary: article.summary,
          category: article.category,
          tags: article.tags,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          viewCount: article.viewCount + 1 // Incremented for display
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1
        },
        filters: { query, category }
      });
    } catch (error: any) {
      console.error('Failed to search knowledge base:', error);
      return res.status(500).json({ error: 'Failed to search knowledge base' });
    }
  }

  /**
   * Get knowledge base article by ID
   */
  static async getArticle(req: Request, res: Response) {
    try {
      const { articleId } = await validate({
        params: {
          articleId: uuidSchema
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get article with customer access check
      const article = await prisma.knowledgeBase.findFirst({
        where: {
          id: articleId,
          orgId,
          isPublic: true,
          status: 'PUBLISHED'
        },
        select: {
          id: true,
          title: true,
          content: true,
          summary: true,
          category: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          viewCount: true
        }
      });

      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }

      // Increment view count
      await prisma.knowledgeBase.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } }
      });

      res.json({
        success: true,
        article: {
          ...article,
          viewCount: article.viewCount + 1
        }
      });
    } catch (error: any) {
      console.error('Failed to get article:', error);
      return res.status(500).json({ error: 'Failed to get article' });
    }
  }

  /**
   * Get knowledge base categories
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get unique categories with article counts
      const categories = await prisma.knowledgeBase.groupBy({
        by: ['category'],
        where: {
          orgId,
          isPublic: true,
          status: 'PUBLISHED'
        },
        _count: {
          id: true
        }
      });

      res.json({
        success: true,
        categories: categories.map(cat => ({
          name: cat.category,
          count: cat._count.id
        }))
      });
    } catch (error: any) {
      console.error('Failed to get categories:', error);
      return res.status(500).json({ error: 'Failed to get categories' });
    }
  }

  /**
   * Get popular articles
   */
  static async getPopularArticles(req: Request, res: Response) {
    try {
      const { limit } = await validate({
        query: {
          limit: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const limitNum = limit ? parseInt(limit) : 5;

      // Get most viewed articles
      const articles = await prisma.knowledgeBase.findMany({
        where: {
          orgId,
          isPublic: true,
          status: 'PUBLISHED'
        },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          viewCount: true,
          createdAt: true
        },
        orderBy: { viewCount: 'desc' },
        take: limitNum
      });

      res.json({
        success: true,
        articles
      });
    } catch (error: any) {
      console.error('Failed to get popular articles:', error);
      return res.status(500).json({ error: 'Failed to get popular articles' });
    }
  }

  /**
   * Get recently added articles
   */
  static async getRecentArticles(req: Request, res: Response) {
    try {
      const { limit } = await validate({
        query: {
          limit: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const limitNum = limit ? parseInt(limit) : 5;

      // Get recently added articles
      const articles = await prisma.knowledgeBase.findMany({
        where: {
          orgId,
          isPublic: true,
          status: 'PUBLISHED'
        },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum
      });

      res.json({
        success: true,
        articles
      });
    } catch (error: any) {
      console.error('Failed to get recent articles:', error);
      return res.status(500).json({ error: 'Failed to get recent articles' });
    }
  }

  /**
   * Get related articles
   */
  static async getRelatedArticles(req: Request, res: Response) {
    try {
      const { articleId } = await validate({
        params: {
          articleId: uuidSchema
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get the source article
      const sourceArticle = await prisma.knowledgeBase.findFirst({
        where: {
          id: articleId,
          orgId,
          isPublic: true,
          status: 'PUBLISHED'
        },
        select: {
          id: true,
          category: true,
          tags: true
        }
      });

      if (!sourceArticle) {
        return res.status(404).json({ error: 'Article not found' });
      }

      // Find related articles by category or tags
      const where: any = {
        orgId,
        isPublic: true,
        status: 'PUBLISHED',
        id: { not: articleId },
        OR: [
          { category: sourceArticle.category },
          { tags: { hasSome: sourceArticle.tags } }
        ]
      };

      const relatedArticles = await prisma.knowledgeBase.findMany({
        where,
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          tags: true,
          viewCount: true,
          createdAt: true
        },
        orderBy: [
          { viewCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 5
      });

      res.json({
        success: true,
        articles: relatedArticles
      });
    } catch (error: any) {
      console.error('Failed to get related articles:', error);
      return res.status(500).json({ error: 'Failed to get related articles' });
    }
  }

  /**
   * Get knowledge base statistics
   */
  static async getKnowledgeStats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get statistics
      const [totalArticles, categoryStats, topCategories] = await Promise.all([
        prisma.knowledgeBase.count({
          where: {
            orgId,
            isPublic: true,
            status: 'PUBLISHED'
          }
        }),
        prisma.knowledgeBase.groupBy({
          by: ['category'],
          where: {
            orgId,
            isPublic: true,
            status: 'PUBLISHED'
          },
          _count: {
            id: true
          }
        }),
        prisma.knowledgeBase.groupBy({
          by: ['category'],
          where: {
            orgId,
            isPublic: true,
            status: 'PUBLISHED'
          },
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: 5
        })
      ]);

      const categoryMap: Record<string, number> = {};
      categoryStats.forEach(cat => {
        categoryMap[cat.category] = cat._count.id;
      });

      res.json({
        success: true,
        stats: {
          totalArticles,
          categories: categoryMap,
          topCategories: topCategories.map(cat => ({
            name: cat.category,
            count: cat._count.id
          }))
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get knowledge stats:', error);
      return res.status(500).json({ error: 'Failed to get knowledge base statistics' });
    }
  }
}
