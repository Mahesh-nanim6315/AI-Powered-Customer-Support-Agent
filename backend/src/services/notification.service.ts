import prisma from '../config/database';
import { AuditService } from './audit.service';

export interface NotificationData {
  customerId: string;
  orgId: string;
  type: 'TICKET_CREATED' | 'TICKET_UPDATED' | 'TICKET_ASSIGNED' | 'TICKET_RESOLVED' | 'TICKET_ESCALATED' | 'MESSAGE_RECEIVED';
  title: string;
  message: string;
  ticketId?: string;
  data?: any;
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  data?: any;
}

/**
 * Notification Service - Handle customer notifications
 */
export class NotificationService {
  
  /**
   * Create notification for customer
   */
  static async createNotification(data: NotificationData): Promise<void> {
    try {
      const { customerId, orgId, type, title, message, ticketId, data: notificationData } = data;

      // Create notification record
      await prisma.customerNotification.create({
        data: {
          customerId,
          orgId,
          type,
          title,
          message,
          ticketId,
          data: notificationData ? JSON.stringify(notificationData) : null,
          read: false
        }
      });

      // Log notification creation
      await AuditService.logUserActivity({
        userId: 'SYSTEM',
        orgId,
        action: 'TICKET_UPDATED', // Using existing action type
        resourceType: 'NOTIFICATION',
        resourceId: customerId,
        details: {
          type,
          title,
          ticketId
        }
      });

    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  /**
   * Send ticket status change notification
   */
  static async sendTicketStatusNotification(
    ticketId: string,
    oldStatus: string,
    newStatus: string,
    orgId: string
  ): Promise<void> {
    try {
      // Get ticket with customer
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      if (!ticket || !ticket.customer) {
        return;
      }

      const statusMessages = {
        'OPEN': 'Your ticket has been opened and is waiting for agent assignment',
        'IN_PROGRESS': 'An agent is now working on your ticket',
        'RESOLVED': 'Your ticket has been resolved',
        'ESCALATED': 'Your ticket has been escalated to a senior agent',
        'AI_IN_PROGRESS': 'AI is analyzing your ticket',
        'CLOSED': 'Your ticket has been closed'
      };

      const message = statusMessages[newStatus as keyof typeof statusMessages] || 
                     `Your ticket status has been updated to ${newStatus}`;

      // Create notification
      await this.createNotification({
        customerId: ticket.customer.id,
        orgId,
        type: 'TICKET_UPDATED',
        title: `Ticket Status Updated: ${newStatus}`,
        message,
        ticketId,
        data: {
          oldStatus,
          newStatus,
          ticketSubject: ticket.subject
        }
      });

      // Send email notification (if configured)
      await this.sendEmailNotification({
        to: ticket.customer.email,
        subject: `Ticket Status Update - ${ticket.subject}`,
        html: this.generateStatusUpdateEmail(ticket, oldStatus, newStatus),
        data: { ticketId, customerId: ticket.customer.id }
      });

    } catch (error) {
      console.error('Failed to send ticket status notification:', error);
    }
  }

  /**
   * Send new message notification
   */
  static async sendMessageNotification(
    ticketId: string,
    messageRole: string,
    orgId: string
  ): Promise<void> {
    try {
      // Get ticket with customer
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      if (!ticket || !ticket.customer) {
        return;
      }

      // Only notify customer for agent/AI messages
      if (messageRole === 'AGENT' || messageRole === 'AI') {
        const senderName = messageRole === 'AI' ? 'AI Assistant' : 'Support Agent';
        
        await this.createNotification({
          customerId: ticket.customer.id,
          orgId,
          type: 'MESSAGE_RECEIVED',
          title: `New Message from ${senderName}`,
          message: `You have received a new message regarding your ticket: ${ticket.subject}`,
          ticketId,
          data: {
            messageRole,
            ticketSubject: ticket.subject
          }
        });

        // Send email notification
        await this.sendEmailNotification({
          to: ticket.customer.email,
          subject: `New Message - ${ticket.subject}`,
          html: this.generateMessageEmail(ticket, messageRole),
          data: { ticketId, customerId: ticket.customer.id }
        });
      }

    } catch (error) {
      console.error('Failed to send message notification:', error);
    }
  }

  /**
   * Send ticket assignment notification
   */
  static async sendAssignmentNotification(
    ticketId: string,
    agentId: string,
    orgId: string
  ): Promise<void> {
    try {
      // Get ticket and agent details
      const [ticket, agent] = await Promise.all([
        prisma.ticket.findUnique({
          where: { id: ticketId },
          include: {
            customer: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        }),
        prisma.agent.findUnique({
          where: { id: agentId },
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        })
      ]);

      if (!ticket || !ticket.customer || !agent) {
        return;
      }

      await this.createNotification({
        customerId: ticket.customer.id,
        orgId,
        type: 'TICKET_ASSIGNED',
        title: 'Agent Assigned to Your Ticket',
        message: `${agent.user.email} has been assigned to your ticket: ${ticket.subject}`,
        ticketId,
        data: {
          agentEmail: agent.user.email,
          ticketSubject: ticket.subject
        }
      });

      // Send email notification
      await this.sendEmailNotification({
        to: ticket.customer.email,
        subject: `Agent Assigned - ${ticket.subject}`,
        html: this.generateAssignmentEmail(ticket, agent.user.email),
        data: { ticketId, customerId: ticket.customer.id }
      });

    } catch (error) {
      console.error('Failed to send assignment notification:', error);
    }
  }

  /**
   * Mark notifications as read
   */
  static async markNotificationsRead(customerId: string, orgId: string): Promise<number> {
    try {
      const result = await prisma.customerNotification.updateMany({
        where: {
          customerId,
          orgId,
          read: false
        },
        data: { read: true }
      });

      return result.count;
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      return 0;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(customerId: string, orgId: string): Promise<number> {
    try {
      const count = await prisma.customerNotification.count({
        where: {
          customerId,
          orgId,
          read: false
        }
      });

      return count;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Cleanup old notifications (older than 90 days)
   */
  static async cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.customerNotification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
      return 0;
    }
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private static async sendEmailNotification(data: EmailNotificationData): Promise<void> {
    try {
      // This is a placeholder for email sending functionality
      // In a real implementation, you would integrate with an email service
      // like SendGrid, Nodemailer, AWS SES, etc.
      
      console.log('Email notification would be sent:', {
        to: data.to,
        subject: data.subject,
        hasHtml: !!data.html,
        hasText: !!data.text
      });

      // Example implementation with Nodemailer (would require npm install):
      /*
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text
      });
      */

    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Generate status update email HTML
   */
  private static generateStatusUpdateEmail(ticket: any, oldStatus: string, newStatus: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Ticket Status Update</h2>
        <p>Hello ${ticket.customer.name},</p>
        <p>Your ticket <strong>${ticket.subject}</strong> status has been updated.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Previous Status:</strong> ${oldStatus}</p>
          <p><strong>New Status:</strong> ${newStatus}</p>
        </div>
        <p>You can view your ticket and reply to messages in your customer portal.</p>
        <p>Thank you for your patience!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;
  }

  /**
   * Generate new message email HTML
   */
  private static generateMessageEmail(ticket: any, messageRole: string): string {
    const senderName = messageRole === 'AI' ? 'AI Assistant' : 'Support Agent';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Message Received</h2>
        <p>Hello ${ticket.customer.name},</p>
        <p>You have received a new message from ${senderName} regarding your ticket <strong>${ticket.subject}</strong>.</p>
        <p>Please log in to your customer portal to view and respond to the message.</p>
        <p>Thank you!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;
  }

  /**
   * Generate assignment email HTML
   */
  private static generateAssignmentEmail(ticket: any, agentEmail: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Agent Assigned</h2>
        <p>Hello ${ticket.customer.name},</p>
        <p>${agentEmail} has been assigned to your ticket <strong>${ticket.subject}</strong>.</p>
        <p>The agent will review your ticket and respond shortly.</p>
        <p>You can track the progress and communicate with the agent in your customer portal.</p>
        <p>Thank you!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;
  }
}
