import { Request, Response } from 'express';
import prisma from '../config/database';
import { validate } from '../middlewares/validation.middleware';
import { uuidSchema, paginationSchema } from '../validators/common.validators';
import { AuditService } from '../services/audit.service';

/**
 * Customer Portal Controller - Enhanced customer experience
 */
export class CustomerPortalController {
  
  /**
   * Get customer dashboard data
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get customer record
      const customer = await prisma.customer.findFirst({
        where: { userId, orgId },
        include: {
          tickets: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              _count: {
                select: { messages: true }
              }
            }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      // Get ticket statistics
      const ticketStats = await prisma.ticket.groupBy({
        by: ['status'],
        where: {
          customerId: customer.id,
          orgId
        },
        _count: {
          id: true
        }
      });

      // Get recent activity
      const recentActivity = await prisma.ticketMessage.findMany({
        where: {
          ticket: {
            customerId: customer.id,
            orgId
          }
        },
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
        take: 10
      });

      // Format statistics
      const stats = {
        total: ticketStats.reduce((sum, stat) => sum + stat._count.id, 0),
        open: ticketStats.find(s => s.status === 'OPEN')?._count.id || 0,
        inProgress: ticketStats.find(s => s.status === 'IN_PROGRESS')?._count.id || 0,
        resolved: ticketStats.find(s => s.status === 'RESOLVED')?._count.id || 0,
        escalated: ticketStats.find(s => s.status === 'ESCALATED')?._count.id || 0
      };

      res.json({
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          createdAt: customer.createdAt
        },
        stats,
        recentTickets: customer.tickets.map(ticket => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          messageCount: ticket._count.messages
        })),
        recentActivity: recentActivity.map(activity => ({
          id: activity.id,
          role: activity.role,
          content: activity.content.substring(0, 100) + (activity.content.length > 100 ? '...' : ''),
          createdAt: activity.createdAt,
          ticket: {
            id: activity.ticket.id,
            subject: activity.ticket.subject,
            status: activity.ticket.status
          }
        }))
      });
    } catch (error: any) {
      console.error('Failed to get customer dashboard:', error);
      return res.status(500).json({ error: 'Failed to get dashboard data' });
    }
  }

  /**
   * Get customer tickets with pagination and filters
   */
  static async getTickets(req: Request, res: Response) {
    try {
      const { status, priority, page, limit } = await validate({
        query: {
          status: paginationSchema.optional(),
          priority: paginationSchema.optional(),
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
      const limitNum = limit ? parseInt(limit) : 10;
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        customerId: customer.id,
        orgId
      };

      if (status) {
        where.status = status;
      }

      if (priority) {
        where.priority = priority;
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
        }
      });
    } catch (error: any) {
      console.error('Failed to get customer tickets:', error);
      return res.status(500).json({ error: 'Failed to get tickets' });
    }
  }

  /**
   * Get ticket details for customer
   */
  static async getTicketDetails(req: Request, res: Response) {
    try {
      const { ticketId } = await validate({
        params: {
          ticketId: uuidSchema
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get ticket with customer access check
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          customerId: {
            customer: {
              userId,
              orgId
            }
          }
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
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
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              _count: {
                select: { attachments: true }
              }
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.json({
        success: true,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          customer: ticket.customer,
          assignedAgent: ticket.assignedAgent ? {
            id: ticket.assignedAgent.id,
            email: ticket.assignedAgent.user.email
          } : null,
          messages: ticket.messages.map(message => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
            attachmentCount: message._count.attachments
          }))
        }
      });
    } catch (error: any) {
      console.error('Failed to get ticket details:', error);
      return res.status(500).json({ error: 'Failed to get ticket details' });
    }
  }

  /**
   * Create new ticket from customer portal
   */
  static async createTicket(req: Request, res: Response) {
    try {
      const { subject, description, priority } = await validate({
        body: {
          subject: paginationSchema,
          description: paginationSchema,
          priority: paginationSchema.optional()
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

      // Create ticket
      const ticket = await prisma.ticket.create({
        data: {
          subject,
          description,
          priority: priority || 'MEDIUM',
          status: 'OPEN',
          customerId: customer.id,
          orgId,
          createdByUserId: userId
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Log ticket creation
      await AuditService.logUserActivity({
        userId,
        orgId,
        action: 'TICKET_CREATED',
        resourceType: 'TICKET',
        resourceId: ticket.id,
        details: {
          subject,
          priority: ticket.priority,
          source: 'CUSTOMER_PORTAL'
        }
      });

      res.status(201).json({
        success: true,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          customer: ticket.customer
        },
        message: 'Ticket created successfully'
      });
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      return res.status(500).json({ error: 'Failed to create ticket' });
    }
  }

  /**
   * Update customer profile
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      const { name, phone } = await validate({
        body: {
          name: paginationSchema.optional(),
          phone: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Update customer profile
      const customer = await prisma.customer.updateMany({
        where: { userId, orgId },
        data: {
          ...(name && { name }),
          ...(phone && { phone })
        }
      });

      if (customer.count === 0) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      // Get updated profile
      const updatedCustomer = await prisma.customer.findFirst({
        where: { userId, orgId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true
        }
      });

      // Log profile update
      await AuditService.logUserActivity({
        userId,
        orgId,
        action: 'SETTINGS_UPDATED',
        resourceType: 'CUSTOMER',
        resourceId: updatedCustomer?.id,
        details: {
          fields: Object.keys({ name, phone }).filter(key => (name || phone)[key])
        }
      });

      res.json({
        success: true,
        customer: updatedCustomer,
        message: 'Profile updated successfully'
      });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  /**
   * Get customer notifications
   */
  static async getNotifications(req: Request, res: Response) {
    try {
      const { page, limit, unreadOnly } = await validate({
        query: {
          page: paginationSchema.optional(),
          limit: paginationSchema.optional(),
          unreadOnly: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 20;
      const skip = (pageNum - 1) * limitNum;

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

      if (unreadOnly === 'true') {
        where.read = false;
      }

      // Get notifications and total count
      const [notifications, totalCount] = await Promise.all([
        prisma.customerNotification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.customerNotification.count({ where })
      ]);

      res.json({
        success: true,
        notifications: notifications.map(notification => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          read: notification.read,
          createdAt: notification.createdAt,
          ticketId: notification.ticketId
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1
        }
      });
    } catch (error: any) {
      console.error('Failed to get notifications:', error);
      return res.status(500).json({ error: 'Failed to get notifications' });
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(req: Request, res: Response) {
    try {
      const { notificationId } = await validate({
        params: {
          notificationId: uuidSchema
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

      // Update notification
      const notification = await prisma.customerNotification.updateMany({
        where: {
          id: notificationId,
          customerId: customer.id,
          orgId
        },
        data: { read: true }
      });

      if (notification.count === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
      return res.status(500).json({ error: 'Failed to update notification' });
    }
  }
}
