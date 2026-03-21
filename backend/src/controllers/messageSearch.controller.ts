import { Request, Response } from 'express';
import { MessageSearchService } from '../services/messageSearch.service';
import { validate } from '../middlewares/validation.middleware';
import { uuidSchema, searchSchema, paginationSchema } from '../validators/common.validators';

/**
 * Message Search Controller
 */
export class MessageSearchController {
  
  /**
   * Search messages with advanced filters
   */
  static async searchMessages(req: Request, res: Response) {
    try {
      const { query, ticketId, senderId, role, dateFrom, dateTo, limit, offset } = await validate({
        query: {
          query: searchSchema.optional(),
          ticketId: uuidSchema.optional(),
          senderId: uuidSchema.optional(),
          role: searchSchema.optional(),
          dateFrom: searchSchema.optional(),
          dateTo: searchSchema.optional(),
          limit: paginationSchema.optional(),
          offset: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Parse dates if provided
      const parsedDateFrom = dateFrom ? new Date(dateFrom) : undefined;
      const parsedDateTo = dateTo ? new Date(dateTo) : undefined;

      const searchFilters = {
        query,
        ticketId,
        senderId,
        role,
        dateFrom: parsedDateFrom,
        dateTo: parsedDateTo,
        orgId,
        userId,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      const results = await MessageSearchService.searchMessages(searchFilters);

      res.json({
        success: true,
        ...results,
        filters: searchFilters,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Failed to search messages:', error);
      if (error.message?.includes('Access denied')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      return res.status(500).json({ error: 'Failed to search messages' });
    }
  }

  /**
   * Get search suggestions
   */
  static async getSearchSuggestions(req: Request, res: Response) {
    try {
      const { query, limit } = await validate({
        query: {
          query: searchSchema,
          limit: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const suggestions = await MessageSearchService.getSearchSuggestions(
        query, 
        orgId, 
        userId, 
        limit ? parseInt(limit) : 10
      );

      res.json({
        success: true,
        query,
        suggestions,
        count: suggestions.length
      });
    } catch (error: any) {
      console.error('Failed to get search suggestions:', error);
      return res.status(500).json({ error: 'Failed to get search suggestions' });
    }
  }

  /**
   * Get popular search terms
   */
  static async getPopularSearchTerms(req: Request, res: Response) {
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

      const popularTerms = await MessageSearchService.getPopularSearchTerms(
        orgId, 
        userId, 
        limit ? parseInt(limit) : 20
      );

      res.json({
        success: true,
        popularTerms,
        count: popularTerms.length
      });
    } catch (error: any) {
      console.error('Failed to get popular search terms:', error);
      return res.status(500).json({ error: 'Failed to get popular search terms' });
    }
  }

  /**
   * Search within a specific ticket
   */
  static async searchTicketMessages(req: Request, res: Response) {
    try {
      const { ticketId } = await validate({
        params: {
          ticketId: uuidSchema
        },
        query: {
          query: searchSchema,
          limit: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const results = await MessageSearchService.searchTicketMessages(
        ticketId, 
        query, 
        userId,
        limit ? parseInt(limit) : 50
      );

      res.json({
        success: true,
        ticketId,
        query,
        results,
        count: results.length
      });
    } catch (error: any) {
      console.error('Failed to search ticket messages:', error);
      if (error.message?.includes('Access denied')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      return res.status(500).json({ error: 'Failed to search ticket messages' });
    }
  }

  /**
   * Quick search endpoint for UI autocomplete
   */
  static async quickSearch(req: Request, res: Response) {
    try {
      const { query, limit } = await validate({
        query: {
          query: searchSchema,
          limit: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Quick search with limited results for autocomplete
      const results = await MessageSearchService.searchMessages({
        query,
        orgId,
        userId,
        limit: limit ? parseInt(limit) : 5,
        offset: 0
      });

      res.json({
        success: true,
        query,
        messages: results.messages,
        count: results.messages.length
      });
    } catch (error: any) {
      console.error('Failed to perform quick search:', error);
      return res.status(500).json({ error: 'Failed to perform quick search' });
    }
  }
}
