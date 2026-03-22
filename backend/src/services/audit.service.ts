import { Request } from 'express';
import { db } from '../config/database-performance';

const auditDb = db as any;

function hasAuditModel(modelName: 'ticketAuditLog' | 'userActivityLog' | 'systemEventLog') {
  return Boolean(auditDb?.[modelName] && typeof auditDb[modelName].create === 'function');
}

export interface AuditLogData {
  userId?: string;
  orgId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemEventData {
  eventType: 'ERROR' | 'WARNING' | 'INFO' | 'SECURITY_ALERT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details?: Record<string, any>;
  source?: string;
  orgId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Service - Centralized logging for compliance and debugging
 */
export class AuditService {
  
  /**
   * Log ticket-related actions
   */
  static async logTicketAction(data: AuditLogData & { ticketId: string }) {
    try {
      if (!hasAuditModel('ticketAuditLog')) {
        return;
      }

      await auditDb.ticketAuditLog.create({
        data: {
          ticketId: data.ticketId,
          userId: data.userId,
          orgId: data.orgId,
          action: data.action,
          oldValue: data.oldValue,
          newValue: data.newValue,
          metadata: data.metadata || {},
        }
      });
    } catch (error) {
      console.error('Failed to log ticket action:', error);
    }
  }

  /**
   * Log user activity
   */
  static async logUserActivity(data: AuditLogData & { 
    action: 'LOGIN' | 'LOGOUT' | 'TICKET_VIEWED' | 'MESSAGE_SENT' | 'TICKET_CREATED' | 'TICKET_UPDATED' | 'CUSTOMER_CREATED' | 'KNOWLEDGE_CREATED' | 'SETTINGS_UPDATED';
  }) {
    try {
      if (!hasAuditModel('userActivityLog')) {
        return;
      }

      await auditDb.userActivityLog.create({
        data: {
          userId: data.userId,
          orgId: data.orgId,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          details: data.details || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        }
      });
    } catch (error) {
      console.error('Failed to log user activity:', error);
    }
  }

  /**
   * Log system events
   */
  static async logSystemEvent(data: SystemEventData) {
    try {
      if (!hasAuditModel('systemEventLog')) {
        return;
      }

      await auditDb.systemEventLog.create({
        data: {
          eventType: data.eventType,
          severity: data.severity,
          message: data.message,
          details: data.details || {},
          source: data.source || 'SYSTEM',
          orgId: data.orgId,
          userId: data.userId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        }
      });
    } catch (error) {
      console.error('Failed to log system event:', error);
    }
  }

  /**
   * Log security events
   */
  static async logSecurityEvent(
    req: Request,
    event: 'SQL_INJECTION_ATTEMPT' | 'XSS_ATTEMPT' | 'RATE_LIMIT_EXCEEDED' | 'UNAUTHORIZED_ACCESS' | 'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY',
    details: Record<string, any> = {}
  ) {
    const securityData: SystemEventData = {
      eventType: 'SECURITY_ALERT',
      severity: 'HIGH',
      message: `Security event: ${event}`,
      details: {
        ...details,
        event,
        method: req.method,
        url: req.url,
        headers: req.headers,
      },
      source: 'AUTH_MIDDLEWARE',
      orgId: (req as any).user?.orgId,
      userId: (req as any).user?.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    await this.logSystemEvent(securityData);
  }

  /**
   * Get audit trail for a specific ticket
   */
  static async getTicketAuditTrail(ticketId: string, orgId: string) {
    try {
      if (!hasAuditModel('ticketAuditLog')) {
        return [];
      }

      return await auditDb.ticketAuditLog.findMany({
        where: {
          ticketId,
          orgId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100, // Limit to last 100 entries
      });
    } catch (error) {
      console.error('Failed to get ticket audit trail:', error);
      throw error;
    }
  }

  /**
   * Get user activity log
   */
  static async getUserActivity(userId: string, orgId: string, limit: number = 50) {
    try {
      if (!hasAuditModel('userActivityLog')) {
        return [];
      }

      return await auditDb.userActivityLog.findMany({
        where: {
          userId,
          orgId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      console.error('Failed to get user activity:', error);
      throw error;
    }
  }

  /**
   * Get system events
   */
  static async getSystemEvents(
    filters: {
      orgId?: string;
      eventType?: string;
      severity?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    limit: number = 100
  ) {
    try {
      if (!hasAuditModel('systemEventLog')) {
        return [];
      }

      const where: any = {};
      
      if (filters.orgId) where.orgId = filters.orgId;
      if (filters.eventType) where.eventType = filters.eventType;
      if (filters.severity) where.severity = filters.severity;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      return await auditDb.systemEventLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      console.error('Failed to get system events:', error);
      throw error;
    }
  }

  /**
   * Cleanup old audit logs
   */
  static async cleanupOldLogs(daysToKeep: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      if (!hasAuditModel('ticketAuditLog') || !hasAuditModel('userActivityLog') || !hasAuditModel('systemEventLog')) {
        return {
          ticketAuditDeleted: 0,
          userActivityDeleted: 0,
          systemEventsDeleted: 0,
          cutoffDate,
        };
      }

      const [ticketAuditDeleted, userActivityDeleted, systemEventsDeleted] = await Promise.all([
        auditDb.ticketAuditLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
        auditDb.userActivityLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
        auditDb.systemEventLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
      ]);

      return {
        ticketAuditDeleted: ticketAuditDeleted.count,
        userActivityDeleted: userActivityDeleted.count,
        systemEventsDeleted: systemEventsDeleted.count,
        cutoffDate,
      };
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
      throw error;
    }
  }
}

/**
 * Middleware to automatically log user activity
 */
export const auditMiddleware = (action: string, resourceType?: string) => {
  return (req: Request, res: any, next: any) => {
    // Log after response is sent
    res.on('finish', async () => {
      if ((req as any).user && res.statusCode < 400) {
        await AuditService.logUserActivity({
          userId: (req as any).user.userId,
          orgId: (req as any).user.orgId,
          action: action as any,
          resourceType,
          resourceId: req.params.id || req.body.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
          }
        });
      }
    });
    
    next();
  };
};
