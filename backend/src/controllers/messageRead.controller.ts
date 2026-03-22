import { Request, Response } from 'express';
import { z } from 'zod';
import { MessageReadService } from '../services/messageRead.service';
import { uuidSchema } from '../validators/common.validators';

const messageIdParamsSchema = z.object({
  messageId: uuidSchema,
});

const ticketIdParamsSchema = z.object({
  ticketId: uuidSchema,
});

const markMultipleSchema = z.object({
  messageIds: z.array(uuidSchema).min(1),
});

/**
 * Message Read Receipt Controller
 */
export class MessageReadController {
  
  /**
   * Mark a message as read
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const { messageId } = messageIdParamsSchema.parse(req.params);
      
      const { readDuration } = req.body as { readDuration?: number };
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await MessageReadService.markAsRead(messageId, userId, readDuration);

      res.json({
        success: true,
        message: 'Message marked as read'
      });
    } catch (error: any) {
      console.error('Failed to mark message as read:', error);
      if (error.message?.includes('not found')) {
        return res.status(404).json({ error: 'Message not found' });
      }
      if (error.message?.includes('access denied')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      return res.status(500).json({ error: 'Failed to mark message as read' });
    }
  }

  /**
   * Mark multiple messages as read
   */
  static async markMultipleAsRead(req: Request, res: Response) {
    try {
      const { messageIds } = markMultipleSchema.parse(req.body);
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await MessageReadService.markMultipleAsRead(messageIds, userId);

      res.json({
        success: true,
        message: `${messageIds.length} messages marked as read`
      });
    } catch (error: any) {
      console.error('Failed to mark multiple messages as read:', error);
      return res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  }

  /**
   * Get read status for a message
   */
  static async getReadStatus(req: Request, res: Response) {
    try {
      const { messageId } = messageIdParamsSchema.parse(req.params);
      
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const isRead = await MessageReadService.getReadStatus(messageId, userId);

      res.json({
        messageId,
        isRead,
        readAt: isRead ? new Date() : null
      });
    } catch (error: any) {
      console.error('Failed to get read status:', error);
      return res.status(500).json({ error: 'Failed to get read status' });
    }
  }

  /**
   * Get read receipts for a ticket
   */
  static async getTicketReadReceipts(req: Request, res: Response) {
    try {
      const { ticketId } = ticketIdParamsSchema.parse(req.params);
      
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const receipts = await MessageReadService.getTicketReadReceipts(ticketId, userId);

      res.json({
        ticketId,
        receipts,
        total: receipts.length
      });
    } catch (error: any) {
      console.error('Failed to get ticket read receipts:', error);
      return res.status(500).json({ error: 'Failed to get read receipts' });
    }
  }

  /**
   * Get user read statistics
   */
  static async getUserReadStats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const stats = await MessageReadService.getUserReadStats(userId, orgId);

      res.json({
        userId,
        orgId,
        stats,
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get user read stats:', error);
      return res.status(500).json({ error: 'Failed to get read statistics' });
    }
  }

  /**
   * Get unread count for a ticket
   */
  static async getTicketUnreadCount(req: Request, res: Response) {
    try {
      const { ticketId } = ticketIdParamsSchema.parse(req.params);
      
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const unreadCount = await MessageReadService.getTicketUnreadCount(ticketId, userId);

      res.json({
        ticketId,
        unreadCount,
        userId
      });
    } catch (error: any) {
      console.error('Failed to get unread count:', error);
      return res.status(500).json({ error: 'Failed to get unread count' });
    }
  }
}
