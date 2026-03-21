import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { NotificationService } from '../services/notification.service';
import { uuidSchema } from '../validators/common.validators';

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  unreadOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional(),
});

const notificationCreateSchema = z.object({
  customerId: uuidSchema,
  type: z.enum([
    'TICKET_CREATED',
    'TICKET_UPDATED',
    'TICKET_ASSIGNED',
    'TICKET_RESOLVED',
    'TICKET_ESCALATED',
    'MESSAGE_RECEIVED',
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  ticketId: uuidSchema.optional(),
});

/**
 * Notification Controller - Manage customer notifications
 */
export class NotificationController {
  
  /**
   * Get customer notifications
   */
  static async getNotifications(req: Request, res: Response) {
    try {
      const { page, limit, unreadOnly } = notificationQuerySchema.parse(req.query);
      
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

      const pageNum = page ?? 1;
      const limitNum = limit ?? 20;
      const skip = (pageNum - 1) * limitNum;

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
          ticketId: notification.ticketId,
          data: notification.data ? JSON.parse(notification.data) : null
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
  static async markAsRead(req: Request, res: Response) {
    try {
      const { notificationId } = z.object({ notificationId: uuidSchema }).parse(req.params);
      
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

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: Request, res: Response) {
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

      // Update all unread notifications
      const result = await NotificationService.markNotificationsRead(customer.id, orgId);

      res.json({
        success: true,
        message: `${result} notifications marked as read`,
        count: result
      });
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error);
      return res.status(500).json({ error: 'Failed to update notifications' });
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(req: Request, res: Response) {
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

      const count = await NotificationService.getUnreadCount(customer.id, orgId);

      res.json({
        success: true,
        unreadCount: count
      });
    } catch (error: any) {
      console.error('Failed to get unread count:', error);
      return res.status(500).json({ error: 'Failed to get unread count' });
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(req: Request, res: Response) {
    try {
      const { notificationId } = z.object({ notificationId: uuidSchema }).parse(req.params);
      
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

      // Delete notification
      const notification = await prisma.customerNotification.deleteMany({
        where: {
          id: notificationId,
          customerId: customer.id,
          orgId
        }
      });

      if (notification.count === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error: any) {
      console.error('Failed to delete notification:', error);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  /**
   * Create custom notification (admin only)
   */
  static async createNotification(req: Request, res: Response) {
    try {
      const { customerId, type, title, message, ticketId } = notificationCreateSchema.parse(req.body);
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Create notification
      await NotificationService.createNotification({
        customerId,
        orgId,
        type,
        title,
        message,
        ticketId,
        data: {
          createdBy: userId,
          customNotification: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Notification created successfully'
      });
    } catch (error: any) {
      console.error('Failed to create notification:', error);
      return res.status(500).json({ error: 'Failed to create notification' });
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(req: Request, res: Response) {
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

      // Get notification statistics
      const [totalStats, typeStats] = await Promise.all([
        prisma.customerNotification.groupBy({
          by: ['read'],
          where: {
            customerId: customer.id,
            orgId
          },
          _count: {
            id: true
          }
        }),
        prisma.customerNotification.groupBy({
          by: ['type'],
          where: {
            customerId: customer.id,
            orgId
          },
          _count: {
            id: true
          }
        })
      ]);

      const total = totalStats.reduce((sum, stat) => sum + stat._count.id, 0);
      const unread = totalStats.find(s => s.read === false)?._count.id || 0;
      const read = totalStats.find(s => s.read === true)?._count.id || 0;

      const statsByType: Record<string, number> = {};
      typeStats.forEach(stat => {
        statsByType[stat.type] = stat._count.id;
      });

      res.json({
        success: true,
        stats: {
          total,
          read,
          unread,
          statsByType
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get notification stats:', error);
      return res.status(500).json({ error: 'Failed to get notification statistics' });
    }
  }
}
