import prisma from '../config/database';
import { AuditService } from './audit.service';

export interface SearchFilters {
  query?: string;
  ticketId?: string;
  senderId?: string;
  role?: 'CUSTOMER' | 'AGENT' | 'AI';
  dateFrom?: Date;
  dateTo?: Date;
  orgId: string;
  userId: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  messages: MessageSearchResult[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number;
}

export interface MessageSearchResult {
  id: string;
  content: string;
  role: string;
  createdAt: Date;
  ticketId: string;
  ticketTitle?: string;
  ticketStatus?: string;
  senderId?: string;
  senderName?: string;
  relevanceScore?: number;
  highlights?: string[];
}

/**
 * Message Search Service - Advanced search functionality for messages
 */
export class MessageSearchService {
  
  /**
   * Search messages with advanced filters
   */
  static async searchMessages(filters: SearchFilters): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      const {
        query,
        ticketId,
        senderId,
        role,
        dateFrom,
        dateTo,
        orgId,
        userId,
        limit = 50,
        offset = 0
      } = filters;

      // Build where clause
      const where: any = {
        ticket: {
          orgId,
          // User can only search messages from tickets they have access to
          OR: [
            { createdByUserId: userId },
            { customer: { userId } },
            { assignedAgent: { userId } }
          ]
        }
      };

      // Add filters
      if (ticketId) {
        where.ticketId = ticketId;
      }

      if (senderId) {
        where.senderId = senderId;
      }

      if (role) {
        where.role = role;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      // Text search with PostgreSQL full-text search
      let textSearchQuery = '';
      let searchHighlights: string[] = [];
      
      if (query && query.trim()) {
        // Use PostgreSQL's full-text search
        textSearchQuery = query.trim();
        
        // Get search results with relevance scoring
        const searchResults = await prisma.$queryRaw`
          SELECT 
            tm.*,
            t.title as "ticketTitle",
            t.status as "ticketStatus",
            u.email as "senderEmail",
            CASE 
              WHEN to_tsvector('english', tm.content) @@ to_tsquery('english', ${textSearchQuery})
              THEN ts_rank(to_tsvector('english', tm.content), to_tsquery('english', ${textSearchQuery}))
              ELSE 0
            END as "relevanceScore",
            ts_headline('english', tm.content, to_tsquery('english', ${textSearchQuery}), 'HighlightAll=true') as "highlightedContent"
          FROM "TicketMessage" tm
          JOIN "Ticket" t ON tm."ticketId" = t.id
          LEFT JOIN "User" u ON tm."senderId" = u.id
          WHERE 
            t."orgId" = ${orgId}
            AND (
              t."createdByUserId" = ${userId}
              OR t."customerId" IN (SELECT id FROM "Customer" WHERE "userId" = ${userId})
              OR t."assignedAgentId" IN (SELECT id FROM "Agent" WHERE "userId" = ${userId})
            )
            AND to_tsvector('english', tm.content) @@ to_tsquery('english', ${textSearchQuery})
            ${ticketId ? prisma.$queryRaw`AND tm."ticketId" = ${ticketId}` : ''}
            ${senderId ? prisma.$queryRaw`AND tm."senderId" = ${senderId}` : ''}
            ${role ? prisma.$queryRaw`AND tm.role = ${role}` : ''}
            ${dateFrom ? prisma.$queryRaw`AND tm."createdAt" >= ${dateFrom}` : ''}
            ${dateTo ? prisma.$queryRaw`AND tm."createdAt" <= ${dateTo}` : ''}
          ORDER BY "relevanceScore" DESC, tm."createdAt" DESC
          LIMIT ${limit + 1}
          OFFSET ${offset}
        ` as any[];

        // Get total count for pagination
        const totalCountResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM "TicketMessage" tm
          JOIN "Ticket" t ON tm."ticketId" = t.id
          WHERE 
            t."orgId" = ${orgId}
            AND (
              t."createdByUserId" = ${userId}
              OR t."customerId" IN (SELECT id FROM "Customer" WHERE "userId" = ${userId})
              OR t."assignedAgentId" IN (SELECT id FROM "Agent" WHERE "userId" = ${userId})
            )
            AND to_tsvector('english', tm.content) @@ to_tsquery('english', ${textSearchQuery})
            ${ticketId ? prisma.$queryRaw`AND tm."ticketId" = ${ticketId}` : ''}
            ${senderId ? prisma.$queryRaw`AND tm."senderId" = ${senderId}` : ''}
            ${role ? prisma.$queryRaw`AND tm.role = ${role}` : ''}
            ${dateFrom ? prisma.$queryRaw`AND tm."createdAt" >= ${dateFrom}` : ''}
            ${dateTo ? prisma.$queryRaw`AND tm."createdAt" <= ${dateTo}` : ''}
        ` as { count: number }[];

        const totalCount = (totalCountResult as any[])[0]?.count || 0;
        const hasMore = searchResults.length > limit;
        
        // Remove extra item if we have more results
        const messages = hasMore ? searchResults.slice(0, -1) : searchResults;

        // Format results
        const formattedMessages: MessageSearchResult[] = messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          createdAt: msg.createdAt,
          ticketId: msg.ticketId,
          ticketTitle: msg.ticketTitle,
          ticketStatus: msg.ticketStatus,
          senderId: msg.senderId,
          senderName: msg.senderEmail || 'Unknown',
          relevanceScore: parseFloat(msg.relevanceScore) || 0,
          highlights: [msg.highlightedContent || msg.content]
        }));

        const searchTime = Date.now() - startTime;

        // Log search activity
        await AuditService.logUserActivity({
          userId,
          orgId,
          action: 'MESSAGE_SEARCH',
          resourceType: 'TICKET_MESSAGE',
          details: {
            query: textSearchQuery,
            resultsCount: formattedMessages.length,
            totalCount,
            searchTime,
            filters: {
              ticketId,
              senderId,
              role,
              dateFrom,
              dateTo
            }
          }
        });

        return {
          messages: formattedMessages,
          totalCount,
          hasMore,
          searchTime
        };
      }

      // Simple filtering without text search
      const [messages, totalCount] = await Promise.all([
        prisma.ticketMessage.findMany({
          where,
          include: {
            ticket: {
              select: {
                title: true,
                status: true
              }
            },
            sender: {
              select: {
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: limit + 1,
          skip: offset
        }),
        prisma.ticketMessage.count({ where })
      ]);

      const hasMore = messages.length > limit;
      const finalMessages = hasMore ? messages.slice(0, -1) : messages;

      const formattedMessages: MessageSearchResult[] = finalMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        createdAt: msg.createdAt,
        ticketId: msg.ticketId,
        ticketTitle: msg.ticket?.title,
        ticketStatus: msg.ticket?.status,
        senderId: msg.senderId,
        senderName: msg.sender?.email || 'Unknown'
      }));

      const searchTime = Date.now() - startTime;

      return {
        messages: formattedMessages,
        totalCount,
        hasMore,
        searchTime
      };

    } catch (error) {
      console.error('Failed to search messages:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  static async getSearchSuggestions(query: string, orgId: string, userId: string, limit: number = 10): Promise<string[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const suggestions = await prisma.$queryRaw`
        SELECT DISTINCT 
          word,
          COUNT(*) as frequency
        FROM (
          SELECT 
            regexp_split_to_table(lower(content), '[^a-zA-Z0-9]+') as word
          FROM "TicketMessage" tm
          JOIN "Ticket" t ON tm."ticketId" = t.id
          WHERE 
            t."orgId" = ${orgId}
            AND (
              t."createdByUserId" = ${userId}
              OR t."customerId" IN (SELECT id FROM "Customer" WHERE "userId" = ${userId})
              OR t."assignedAgentId" IN (SELECT id FROM "Agent" WHERE "userId" = ${userId})
            )
        ) words
        WHERE length(word) >= 3
          AND word LIKE ${query.toLowerCase() + '%'}
          AND word NOT IN ('the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use')
        GROUP BY word
        ORDER BY frequency DESC, word
        LIMIT ${limit}
      ` as { word: string; frequency: number }[];

      return suggestions.map((s: any) => s.word);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Get popular search terms for an organization
   */
  static async getPopularSearchTerms(orgId: string, userId: string, limit: number = 20): Promise<{ term: string; count: number }[]> {
    try {
      // This would typically be stored in a separate search analytics table
      // For now, we'll return empty as we don't have search analytics
      return [];
    } catch (error) {
      console.error('Failed to get popular search terms:', error);
      return [];
    }
  }

  /**
   * Search within a specific ticket
   */
  static async searchTicketMessages(
    ticketId: string, 
    query: string, 
    userId: string,
    limit: number = 50
  ): Promise<MessageSearchResult[]> {
    try {
      // Verify user has access to this ticket
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          OR: [
            { createdByUserId: userId },
            { customer: { userId } },
            { assignedAgent: { userId } }
          ]
        }
      });

      if (!ticket) {
        throw new Error('Access denied');
      }

      if (!query || query.trim().length < 2) {
        return [];
      }

      const searchResults = await prisma.$queryRaw`
        SELECT 
          tm.*,
          u.email as "senderEmail",
          ts_headline('english', tm.content, to_tsquery('english', ${query}), 'HighlightAll=true') as "highlightedContent"
        FROM "TicketMessage" tm
        LEFT JOIN "User" u ON tm."senderId" = u.id
        WHERE 
          tm."ticketId" = ${ticketId}
          AND to_tsvector('english', tm.content) @@ to_tsquery('english', ${query})
        ORDER BY tm."createdAt" ASC
        LIMIT ${limit}
      ` as any[];

      return searchResults.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        createdAt: msg.createdAt,
        ticketId: msg.ticketId,
        ticketTitle: ticket.title,
        ticketStatus: ticket.status,
        senderId: msg.senderId,
        senderName: msg.senderEmail || 'Unknown',
        highlights: [msg.highlightedContent || msg.content]
      }));

    } catch (error) {
      console.error('Failed to search ticket messages:', error);
      throw error;
    }
  }
}
