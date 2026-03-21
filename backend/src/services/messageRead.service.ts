import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuditService } from './audit.service';

export interface MessageReadReceipt {
  messageId: string;
  userId: string;
  readAt: Date;
  readDuration?: number; // Time between message sent and read
}

export interface MessageReadStats {
  totalMessages: number;
  readMessages: number;
  unreadMessages: number;
  averageReadTime: number; // Average time to read messages
}

/**
 * Message Read Receipt Service - Track when messages are read
 */
export class MessageReadService {
  
  /**
   * Mark message as read
   */
  static async markAsRead(messageId: string, userId: string, readDuration?: number): Promise<void> {
    try {
      // Check if message exists and user has access
      const message = await prisma.ticketMessage.findFirst({
        where: {
          id: messageId,
          // User can only read messages from tickets they have access to
          ticket: {
            OR: [
              { createdByUserId: userId },
              { customer: { userId } },
              { assignedAgent: { userId } }
            ]
          }
        }
      });

      if (!message) {
        throw new Error('Message not found or access denied');
      }

      // Check if already read
      const existingReceipt = await prisma.messageReadReceipt.findFirst({
        where: {
          messageId,
          userId
        }
      });

      if (existingReceipt) {
        return; // Already marked as read
      }

      // Create read receipt
      await prisma.messageReadReceipt.create({
        data: {
          messageId,
          userId,
          readAt: new Date(),
          readDuration
        }
      });

      // Log read activity
      await AuditService.logUserActivity({
        userId,
        orgId: message.ticket?.orgId || '',
        action: 'MESSAGE_READ',
        resourceType: 'TICKET_MESSAGE',
        resourceId: messageId,
        details: {
          messageRole: message.role,
          readDuration,
          originalMessageCreatedAt: message.createdAt
        }
      });

    } catch (error) {
      console.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  /**
   * Mark multiple messages as read
   */
  static async markMultipleAsRead(messageIds: string[], userId: string): Promise<void> {
    try {
      // Filter out already read messages
      const existingReceipts = await prisma.messageReadReceipt.findMany({
        where: {
          messageId: { in: messageIds },
          userId
        }
      });

      const alreadyReadIds = new Set(existingReceipts.map(r => r.messageId));
      const unreadIds = messageIds.filter(id => !alreadyReadIds.has(id));

      if (unreadIds.length === 0) {
        return; // All messages already read
      }

      // Create read receipts for unread messages
      const receipts = unreadIds.map(messageId => ({
        messageId,
        userId,
        readAt: new Date()
      }));

      await prisma.messageReadReceipt.createMany({
        data: receipts
      });

      // Log bulk read activity
      await AuditService.logUserActivity({
        userId,
        orgId: '', // Will be filled by caller
        action: 'MESSAGES_READ',
        resourceType: 'TICKET_MESSAGE',
        details: {
          messagesCount: unreadIds.length,
          messageIds: unreadIds
        }
      });

    } catch (error) {
      console.error('Failed to mark multiple messages as read:', error);
      throw error;
    }
  }

  /**
   * Get read status for a message
   */
  static async getReadStatus(messageId: string, userId: string): Promise<boolean> {
    try {
      const receipt = await prisma.messageReadReceipt.findFirst({
        where: {
          messageId,
          userId
        }
      });

      return !!receipt;
    } catch (error) {
      console.error('Failed to get read status:', error);
      return false;
    }
  }

  /**
   * Get read receipts for a ticket
   */
  static async getTicketReadReceipts(ticketId: string, userId: string): Promise<MessageReadReceipt[]> {
    try {
      const receipts = await prisma.messageReadReceipt.findMany({
        where: {
          message: {
            ticketId
          },
          userId
        },
        include: {
          message: {
            select: {
              id: true,
              role: true,
              content: true,
              createdAt: true,
              senderId: true
            }
          }
        },
        orderBy: {
          readAt: 'desc'
        }
      });

      return receipts.map(receipt => ({
        messageId: receipt.messageId,
        userId: receipt.userId,
        readAt: receipt.readAt,
        readDuration: receipt.readDuration || undefined
      }));
    } catch (error) {
      console.error('Failed to get ticket read receipts:', error);
      return [];
    }
  }

  /**
   * Get read statistics for a user
   */
  static async getUserReadStats(userId: string, orgId: string): Promise<MessageReadStats> {
    try {
      // Get total messages user has access to
      const totalMessagesResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "TicketMessage" tm
        JOIN "Ticket" t ON tm."ticketId" = t.id
        WHERE t."orgId" = ${orgId}
        AND (
          t."createdByUserId" = ${userId}
          OR t."customerId" IN (SELECT id FROM "Customer" WHERE "userId" = ${userId})
          OR t."assignedAgentId" IN (SELECT id FROM "Agent" WHERE "userId" = ${userId})
        )
      ` as { count: number };

      const totalMessages = (totalMessagesResult as any[])[0]?.count || 0;

      // Get read messages count
      const readMessagesResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "MessageReadReceipt" mrr
        JOIN "TicketMessage" tm ON mrr."messageId" = tm.id
        JOIN "Ticket" t ON tm."ticketId" = t.id
        WHERE mrr."userId" = ${userId}
        AND t."orgId" = ${orgId}
        AND (
          t."createdByUserId" = ${userId}
          OR t."customerId" IN (SELECT id FROM "Customer" WHERE "userId" = ${userId})
          OR t."assignedAgentId" IN (SELECT id FROM "Agent" WHERE "userId" = ${userId})
        )
      ` as { count: number };

      const readMessages = (readMessagesResult as any[])[0]?.count || 0;

      // Get average read time
      const avgReadTimeResult = await prisma.$queryRaw`
        SELECT AVG("readDuration") as avg_time
        FROM "MessageReadReceipt" mrr
        JOIN "TicketMessage" tm ON mrr."messageId" = tm.id
        JOIN "Ticket" t ON tm."ticketId" = t.id
        WHERE mrr."userId" = ${userId}
        AND t."orgId" = ${orgId}
        AND mrr."readDuration" IS NOT NULL
      ` as { avg_time: number };

      const averageReadTime = (avgReadTimeResult as any[])[0]?.avg_time || 0;

      return {
        totalMessages,
        readMessages,
        unreadMessages: totalMessages - readMessages,
        averageReadTime
      };
    } catch (error) {
      console.error('Failed to get user read stats:', error);
      return {
        totalMessages: 0,
        readMessages: 0,
        unreadMessages: 0,
        averageReadTime: 0
      };
    }
  }

  /**
   * Get unread count for a ticket
   */
  static async getTicketUnreadCount(ticketId: string, userId: string): Promise<number> {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "TicketMessage" tm
        LEFT JOIN "MessageReadReceipt" mrr ON tm.id = mrr."messageId" AND mrr."userId" = ${userId}
        WHERE tm."ticketId" = ${ticketId}
        AND mrr."messageId" IS NULL
      ` as { count: number };

      return (result as any[])[0]?.count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Clean up old read receipts (older than 90 days)
   */
  static async cleanupOldReceipts(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.messageReadReceipt.deleteMany({
        where: {
          readAt: {
            lt: cutoffDate
          }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old read receipts:', error);
      return 0;
    }
  }
}
