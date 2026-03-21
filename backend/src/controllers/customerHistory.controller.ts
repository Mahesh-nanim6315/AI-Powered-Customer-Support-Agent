import { Request, Response } from 'express';
import prisma from '../config/database';
import { validate } from '../middlewares/validation.middleware';
import { uuidSchema, paginationSchema } from '../validators/common.validators';

/**
 * Customer History Controller - Track customer ticket history and analytics
 */
export class CustomerHistoryController {
  
  /**
   * Get customer ticket history with analytics
   */
  static async getTicketHistory(req: Request, res: Response) {
    try {
      const { page, limit, status, dateFrom, dateTo } = await validate({
        query: {
          page: paginationSchema.optional(),
          limit: paginationSchema.optional(),
          status: paginationSchema.optional(),
          dateFrom: paginationSchema.optional(),
          dateTo: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get customer record
      const customer = await prisma.customer.findFirst({
        where: { userId, orgId }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 20;
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        customerId: customer.id,
        orgId
      };

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      // Get tickets and total count
      const [tickets, totalCount] = await Promise.all([
        prisma.ticket.findMany({
          where,
          include: {
            _count: {
              select: { messages: true }
            },
            assignedAgent: {
              select: {
                id: true,
                user: {
                  select: {
                    email: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.ticket.count({ where })
      ]);

      res.json({
        success: true,
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          messageCount: ticket._count.messages,
          assignedAgent: ticket.assignedAgent ? {
            id: ticket.assignedAgent.id,
            email: ticket.assignedAgent.user.email
          } : null
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1
        },
        filters: { status, dateFrom, dateTo }
      });
    } catch (error: any) {
      console.error('Failed to get ticket history:', error);
      return res.status(500).json({ error: 'Failed to get ticket history' });
    }
  }

  /**
   * Get customer analytics and statistics
   */
  static async getCustomerAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get customer record
      const customer = await prisma.customer.findFirst({
        where: { userId, orgId }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      // Get comprehensive analytics
      const [
        totalTickets,
        statusStats,
        priorityStats,
        monthlyStats,
        recentTickets,
        avgResolutionTime,
        topCategories
      ] = await Promise.all([
        // Total tickets
        prisma.ticket.count({
          where: { customerId: customer.id, orgId }
        }),
        
        // Status distribution
        prisma.ticket.groupBy({
          by: ['status'],
          where: { customerId: customer.id, orgId },
          _count: { id: true }
        }),
        
        // Priority distribution
        prisma.ticket.groupBy({
          by: ['priority'],
          where: { customerId: customer.id, orgId },
          _count: { id: true }
        }),
        
        // Monthly ticket trends (last 12 months)
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            COUNT(*) as count
          FROM "Ticket"
          WHERE "customerId" = ${customer.id}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month DESC
        `,
        
        // Recent tickets for activity
        prisma.ticket.findMany({
          where: { customerId: customer.id, orgId },
          select: {
            id: true,
            subject: true,
            status: true,
            createdAt: true,
            _count: { select: { messages: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        
        // Average resolution time (for resolved tickets)
        prisma.$queryRaw`
          SELECT 
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_hours
          FROM "Ticket"
          WHERE "customerId" = ${customer.id}
            AND "orgId" = ${orgId}
            AND "status" = 'RESOLVED'
            AND "createdAt" >= NOW() - INTERVAL '6 months'
        `,
        
        // Top categories (if category field exists)
        prisma.ticket.groupBy({
          by: ['priority'], // Using priority as placeholder for categories
          where: { customerId: customer.id, orgId },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5
        })
      ]);

      // Format status stats
      const statusDistribution: Record<string, number> = {};
      statusStats.forEach(stat => {
        statusDistribution[stat.status] = stat._count.id;
      });

      // Format priority stats
      const priorityDistribution: Record<string, number> = {};
      priorityStats.forEach(stat => {
        priorityDistribution[stat.priority] = stat._count.id;
      });

      // Format monthly stats
      const monthlyTrends = (monthlyStats as any[]).map(stat => ({
        month: stat.month,
        count: parseInt(stat.count)
      }));

      // Calculate resolution time
      const avgResolutionHours = avgResolutionTime[0]?.avg_hours 
        ? parseFloat(avgResolutionTime[0].avg_hours).toFixed(2)
        : null;

      res.json({
        success: true,
        analytics: {
          overview: {
            totalTickets,
            avgResolutionTime: avgResolutionHours ? `${avgResolutionHours} hours` : 'N/A',
            customerSince: customer.createdAt
          },
          distributions: {
            status: statusDistribution,
            priority: priorityDistribution
          },
          trends: {
            monthly: monthlyTrends
          },
          recentActivity: recentTickets.map(ticket => ({
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status,
            createdAt: ticket.createdAt,
            messageCount: ticket._count.messages
          })),
          topCategories: topCategories.map(cat => ({
            category: cat.priority, // Placeholder
            count: cat._count.id
          }))
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get customer analytics:', error);
      return res.status(500).json({ error: 'Failed to get customer analytics' });
    }
  }

  /**
   * Get customer communication timeline
   */
  static async getCommunicationTimeline(req: Request, res: Response) {
    try {
      const { ticketId, page, limit } = await validate({
        query: {
          ticketId: uuidSchema.optional(),
          page: paginationSchema.optional(),
          limit: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get customer record
      const customer = await prisma.customer.findFirst({
        where: { userId, orgId }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 50;
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        ticket: {
          customerId: customer.id,
          orgId
        }
      };

      if (ticketId) {
        where.ticketId = ticketId;
      }

      // Get messages with timeline data
      const [messages, totalCount] = await Promise.all([
        prisma.ticketMessage.findMany({
          where,
          include: {
            ticket: {
              select: {
                id: true,
                subject: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.ticketMessage.count({ where })
      ]);

      // Group messages by date for timeline view
      const timeline: Record<string, any[]> = {};
      messages.forEach(message => {
        const dateKey = message.createdAt.toISOString().split('T')[0];
        if (!timeline[dateKey]) {
          timeline[dateKey] = [];
        }
        timeline[dateKey].push({
          id: message.id,
          role: message.role,
          content: message.content.substring(0, 200) + (message.content.length > 200 ? '...' : ''),
          createdAt: message.createdAt,
          ticket: {
            id: message.ticket.id,
            subject: message.ticket.subject,
            status: message.ticket.status
          }
        });
      });

      res.json({
        success: true,
        timeline: Object.keys(timeline)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          .map(date => ({
            date,
            messages: timeline[date]
          })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1
        },
        filters: { ticketId }
      });
    } catch (error: any) {
      console.error('Failed to get communication timeline:', error);
      return res.status(500).json({ error: 'Failed to get communication timeline' });
    }
  }

  /**
   * Get customer satisfaction metrics
   */
  static async getSatisfactionMetrics(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get customer record
      const customer = await prisma.customer.findFirst({
        where: { userId, orgId }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      // Placeholder for satisfaction metrics
      // In a real implementation, this would query satisfaction survey results
      const satisfactionData = {
        overallSatisfaction: 4.5, // Placeholder
        responseTimeRating: 4.2,
        resolutionQualityRating: 4.7,
        totalSurveys: 12,
        lastSurveyDate: new Date('2024-01-15'),
        trend: 'improving'
      };

      res.json({
        success: true,
        metrics: satisfactionData,
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get satisfaction metrics:', error);
      return res.status(500).json({ error: 'Failed to get satisfaction metrics' });
    }
  }

  /**
   * Export customer history (CSV/JSON)
   */
  static async exportHistory(req: Request, res: Response) {
    try {
      const { format, dateFrom, dateTo } = await validate({
        query: {
          format: paginationSchema,
          dateFrom: paginationSchema.optional(),
          dateTo: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get customer record
      const customer = await prisma.customer.findFirst({
        where: { userId, orgId }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      // Build where clause
      const where: any = {
        customerId: customer.id,
        orgId
      };

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      // Get all tickets for export
      const tickets = await prisma.ticket.findMany({
        where,
        include: {
          _count: {
            select: { messages: true }
          },
          assignedAgent: {
            select: {
              user: {
                select: {
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Format data for export
      const exportData = tickets.map(ticket => ({
        'Ticket ID': ticket.id,
        'Subject': ticket.subject,
        'Status': ticket.status,
        'Priority': ticket.priority,
        'Created At': ticket.createdAt.toISOString(),
        'Updated At': ticket.updatedAt.toISOString(),
        'Message Count': ticket._count.messages,
        'Assigned Agent': ticket.assignedAgent?.user.email || 'Unassigned',
        'Description': ticket.description || ''
      }));

      // Set appropriate headers
      const filename = `customer-history-${customer.id}-${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'csv') {
        // Convert to CSV (simplified implementation)
        const csvHeader = Object.keys(exportData[0]).join(',');
        const csvRows = exportData.map(row => 
          Object.values(row).map(value => `"${value}"`).join(',')
        );
        const csvContent = [csvHeader, ...csvRows].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        return res.send(csvContent);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        return res.json({
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email
          },
          exportDate: new Date(),
          filters: { dateFrom, dateTo },
          tickets: exportData
        });
      }
    } catch (error: any) {
      console.error('Failed to export history:', error);
      return res.status(500).json({ error: 'Failed to export history' });
    }
  }
}
