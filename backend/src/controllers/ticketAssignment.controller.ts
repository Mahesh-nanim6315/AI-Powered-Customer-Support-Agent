import { Request, Response } from 'express';
import prisma from '../config/database';
import { validate } from '../middlewares/validation.middleware';
import { uuidSchema, paginationSchema } from '../validators/common.validators';

/**
 * Ticket Assignment Controller - Manage ticket assignment and queue
 */
export class TicketAssignmentController {
  
  /**
   * Get ticket queue overview
   */
  static async getQueueOverview(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get queue statistics
      const [
        unassignedTickets,
        queueByStatus,
        queueByPriority,
        agentWorkload,
        slaMetrics
      ] = await Promise.all([
        // Unassigned tickets
        prisma.ticket.findMany({
          where: {
            orgId,
            assignedAgentId: null
          },
          select: {
            id: true,
            subject: true,
            priority: true,
            status: true,
            createdAt: true,
            customer: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' }
          ],
          take: 50
        }),
        
        // Queue by status
        prisma.ticket.groupBy({
          by: ['status'],
          where: {
            orgId,
            assignedAgentId: null
          },
          _count: { id: true }
        }),
        
        // Queue by priority
        prisma.ticket.groupBy({
          by: ['priority'],
          where: {
            orgId,
            assignedAgentId: null
          },
          _count: { id: true }
        }),
        
        // Agent workload
        prisma.agent.findMany({
          where: { orgId },
          select: {
            id: true,
            user: {
              select: {
                email: true
              }
            },
            _count: {
              select: {
                tickets: {
                  where: {
                    status: {
                      in: ['OPEN', 'IN_PROGRESS']
                    }
                  }
                }
              }
            }
          }
        }),
        
        // SLA metrics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_unassigned,
            COUNT(CASE WHEN "priority" = 'CRITICAL' THEN 1 END) as critical_unassigned,
            COUNT(CASE WHEN "priority" = 'HIGH' THEN 1 END) as high_unassigned,
            AVG(EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 3600) as avg_wait_hours
          FROM "Ticket"
          WHERE "orgId" = ${orgId}
            AND "assignedAgentId" IS NULL
            AND "status" != 'CLOSED'
        `
      ]);

      // Format status distribution
      const statusDistribution: Record<string, number> = {};
      queueByStatus.forEach(stat => {
        statusDistribution[stat.status] = stat._count.id;
      });

      // Format priority distribution
      const priorityDistribution: Record<string, number> = {};
      queueByPriority.forEach(stat => {
        priorityDistribution[stat.priority] = stat._count.id;
      });

      const sla = slaMetrics[0] as any;

      res.json({
        success: true,
        queue: {
          unassignedTickets,
          distributions: {
            status: statusDistribution,
            priority: priorityDistribution
          },
          agentWorkload: agentWorkload.map(agent => ({
            id: agent.id,
            email: agent.user.email,
            currentLoad: agent._count.tickets
          })),
          slaMetrics: {
            totalUnassigned: sla?.total_unassigned || 0,
            criticalUnassigned: sla?.critical_unassigned || 0,
            highUnassigned: sla?.high_unassigned || 0,
            avgWaitTime: sla?.avg_wait_hours 
              ? `${parseFloat(sla.avg_wait_hours).toFixed(2)} hours`
              : 'N/A'
          }
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get queue overview:', error);
      return res.status(500).json({ error: 'Failed to get queue overview' });
    }
  }

  /**
   * Assign ticket to agent
   */
  static async assignTicket(req: Request, res: Response) {
    try {
      const { ticketId, agentId } = await validate({
        body: {
          ticketId: paginationSchema,
          agentId: paginationSchema
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if ticket exists and is unassigned
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          orgId
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      if (ticket.assignedAgentId) {
        return res.status(400).json({ error: 'Ticket is already assigned' });
      }

      // Check if agent exists and is available
      const agent = await prisma.agent.findFirst({
        where: {
          id: agentId,
          orgId
        }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Assign ticket
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedAgentId: agentId,
          status: 'IN_PROGRESS'
        },
        include: {
          customer: {
            select: {
              name: true,
              email: true
            }
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
        }
      });

      res.json({
        success: true,
        message: 'Ticket assigned successfully',
        ticket: updatedTicket
      });
    } catch (error: any) {
      console.error('Failed to assign ticket:', error);
      return res.status(500).json({ error: 'Failed to assign ticket' });
    }
  }

  /**
   * Auto-assign tickets based on rules
   */
  static async autoAssignTickets(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get unassigned tickets
      const unassignedTickets = await prisma.ticket.findMany({
        where: {
          orgId,
          assignedAgentId: null,
          status: 'OPEN'
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      // Get available agents sorted by current workload
      const availableAgents = await prisma.agent.findMany({
        where: { orgId },
        select: {
          id: true,
          user: {
            select: {
              email: true
            }
          },
          _count: {
            select: {
              tickets: {
                where: {
                  status: {
                    in: ['OPEN', 'IN_PROGRESS']
                  }
                }
              }
            }
          }
        },
        orderBy: {
          tickets: {
            _count: 'asc'
          }
        }
      });

      let assignedCount = 0;
      const assignments: any[] = [];

      // Simple round-robin assignment based on workload
      for (const ticket of unassignedTickets) {
        if (availableAgents.length === 0) break;

        // Find agent with minimum workload
        const targetAgent = availableAgents[0];

        try {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              assignedAgentId: targetAgent.id,
              status: 'IN_PROGRESS'
            }
          });

          assignments.push({
            ticketId: ticket.id,
            agentId: targetAgent.id,
            agentEmail: targetAgent.user.email
          });

          assignedCount++;

          // Update agent workload for next iteration
          targetAgent._count.tickets++;

          // Re-sort agents by workload
          availableAgents.sort((a, b) => a._count.tickets - b._count.tickets);

        } catch (error) {
          console.error(`Failed to assign ticket ${ticket.id}:`, error);
        }
      }

      res.json({
        success: true,
        message: `Auto-assignment completed`,
        assignedCount,
        totalUnassigned: unassignedTickets.length,
        assignments
      });
    } catch (error: any) {
      console.error('Failed to auto-assign tickets:', error);
      return res.status(500).json({ error: 'Failed to auto-assign tickets' });
    }
  }

  /**
   * Reassign ticket to different agent
   */
  static async reassignTicket(req: Request, res: Response) {
    try {
      const { ticketId, newAgentId, reason } = await validate({
        body: {
          ticketId: paginationSchema,
          newAgentId: paginationSchema,
          reason: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if ticket exists
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          orgId
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check if new agent exists
      const newAgent = await prisma.agent.findFirst({
        where: {
          id: newAgentId,
          orgId
        }
      });

      if (!newAgent) {
        return res.status(404).json({ error: 'New agent not found' });
      }

      // Reassign ticket
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedAgentId: newAgentId,
          status: 'IN_PROGRESS'
        },
        include: {
          customer: {
            select: {
              name: true,
              email: true
            }
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
        }
      });

      res.json({
        success: true,
        message: 'Ticket reassigned successfully',
        ticket: updatedTicket,
        reason
      });
    } catch (error: any) {
      console.error('Failed to reassign ticket:', error);
      return res.status(500).json({ error: 'Failed to reassign ticket' });
    }
  }

  /**
   * Unassign ticket (return to queue)
   */
  static async unassignTicket(req: Request, res: Response) {
    try {
      const { ticketId, reason } = await validate({
        body: {
          ticketId: paginationSchema,
          reason: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if ticket exists
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          orgId
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      if (!ticket.assignedAgentId) {
        return res.status(400).json({ error: 'Ticket is not assigned' });
      }

      // Unassign ticket
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedAgentId: null,
          status: 'OPEN'
        },
        include: {
          customer: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Ticket unassigned successfully',
        ticket: updatedTicket,
        reason
      });
    } catch (error: any) {
      console.error('Failed to unassign ticket:', error);
      return res.status(500).json({ error: 'Failed to unassign ticket' });
    }
  }

  /**
   * Get assignment rules
   */
  static async getAssignmentRules(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Placeholder for assignment rules
      // In a real implementation, this would query a workflow rules table
      const rules = [
        {
          id: '1',
          name: 'High Priority Auto-Assign',
          description: 'Automatically assign high priority tickets to least loaded agent',
          conditions: {
            priority: 'HIGH',
            unassigned: true
          },
          actions: {
            assignTo: 'least_loaded_agent'
          },
          enabled: true
        },
        {
          id: '2',
          name: 'Critical Priority Escalation',
          description: 'Escalate critical tickets to senior agents',
          conditions: {
            priority: 'CRITICAL',
            unassigned: true
          },
          actions: {
            assignTo: 'senior_agents_only'
          },
          enabled: true
        }
      ];

      res.json({
        success: true,
        rules,
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get assignment rules:', error);
      return res.status(500).json({ error: 'Failed to get assignment rules' });
    }
  }

  /**
   * Get queue analytics
   */
  static async getQueueAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get queue analytics
      const [
        volumeTrends,
        resolutionTrends,
        agentPerformance,
        slaCompliance
      ] = await Promise.all([
        // Volume trends
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*) as tickets_created,
            COUNT(CASE WHEN "assignedAgentId" IS NULL THEN 1 END) as tickets_unassigned
          FROM "Ticket"
          WHERE "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date DESC
        `,
        
        // Resolution trends
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "updatedAt") as date,
            COUNT(*) as tickets_resolved,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours
          FROM "Ticket"
          WHERE "orgId" = ${orgId}
            AND "status" = 'RESOLVED'
            AND "updatedAt" >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', "updatedAt")
          ORDER BY date DESC
        `,
        
        // Agent performance
        prisma.$queryRaw`
          SELECT 
            a.id,
            u.email as agent_email,
            COUNT(t.id) as total_assigned,
            COUNT(CASE WHEN t."status" = 'RESOLVED' THEN 1 END) as total_resolved,
            AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_resolution_hours
          FROM "Agent" a
          JOIN "User" u ON a."userId" = u.id
          LEFT JOIN "Ticket" t ON a.id = t."assignedAgentId"
          WHERE a."orgId" = ${orgId}
            AND t."createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY a.id, u.email
          ORDER BY total_resolved DESC
        `,
        
        // SLA compliance
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_resolved,
            COUNT(CASE WHEN EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600 <= 24 THEN 1 END) as resolved_within_24h,
            COUNT(CASE WHEN t."priority" = 'HIGH' AND EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600 <= 4 THEN 1 END) as high_priority_resolved_within_4h,
            COUNT(CASE WHEN t."priority" = 'CRITICAL' AND EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600 <= 1 THEN 1 END) as critical_resolved_within_1h
          FROM "Ticket" t
          WHERE t."orgId" = ${orgId}
            AND t."status" = 'RESOLVED'
            AND t."createdAt" >= NOW() - INTERVAL '30 days'
        `
      ]);

      const sla = slaCompliance[0] as any;

      res.json({
        success: true,
        analytics: {
          volumeTrends: (volumeTrends as any[]).map(stat => ({
            date: stat.date,
            ticketsCreated: parseInt(stat.tickets_created),
            ticketsUnassigned: parseInt(stat.tickets_unassigned)
          })),
          resolutionTrends: (resolutionTrends as any[]).map(stat => ({
            date: stat.date,
            ticketsResolved: parseInt(stat.tickets_resolved),
            avgResolutionHours: stat.avg_resolution_hours
              ? parseFloat(stat.avg_resolution_hours).toFixed(2)
              : null
          })),
          agentPerformance: (agentPerformance as any[]).map(stat => ({
            agentId: stat.id,
            agentEmail: stat.agent_email,
            totalAssigned: parseInt(stat.total_assigned),
            totalResolved: parseInt(stat.total_resolved),
            avgResolutionHours: stat.avg_resolution_hours
              ? parseFloat(stat.avg_resolution_hours).toFixed(2)
              : null
          })),
          slaCompliance: {
            totalResolved: sla?.total_resolved || 0,
            resolvedWithin24h: sla?.resolved_within_24h || 0,
            highPriorityResolvedWithin4h: sla?.high_priority_resolved_within_4h || 0,
            criticalResolvedWithin1h: sla?.critical_resolved_within_1h || 0,
            compliance24h: sla?.total_resolved 
              ? ((sla.resolved_within_24h / sla.total_resolved) * 100).toFixed(1)
              : '0',
            complianceHighPriority: sla?.high_priority_resolved_within_4h && sla?.total_resolved
              ? ((sla.high_priority_resolved_within_4h / sla.total_resolved) * 100).toFixed(1)
              : '0',
            complianceCritical: sla?.critical_resolved_within_1h && sla?.total_resolved
              ? ((sla.critical_resolved_within_1h / sla.total_resolved) * 100).toFixed(1)
              : '0'
          }
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get queue analytics:', error);
      return res.status(500).json({ error: 'Failed to get queue analytics' });
    }
  }
}
