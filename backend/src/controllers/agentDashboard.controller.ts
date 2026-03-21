import { Request, Response } from 'express';
import prisma from '../config/database';
import { validate } from '../middlewares/validation.middleware';
import { paginationSchema } from '../validators/common.validators';

/**
 * Agent Dashboard Controller - Agent productivity and analytics dashboard
 */
export class AgentDashboardController {
  
  /**
   * Get agent dashboard overview
   */
  static async getDashboardOverview(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get agent record
      const agent = await prisma.agent.findFirst({
        where: { userId, orgId }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      // Get comprehensive dashboard data
      const [
        totalTickets,
        activeTickets,
        resolvedTickets,
        avgResponseTime,
        ticketsByStatus,
        ticketsByPriority,
        recentActivity,
        performanceMetrics,
        queueStats
      ] = await Promise.all([
        // Total tickets assigned to agent
        prisma.ticket.count({
          where: {
            assignedAgentId: agent.id,
            orgId
          }
        }),
        
        // Active tickets
        prisma.ticket.count({
          where: {
            assignedAgentId: agent.id,
            orgId,
            status: {
              in: ['OPEN', 'IN_PROGRESS']
            }
          }
        }),
        
        // Resolved tickets
        prisma.ticket.count({
          where: {
            assignedAgentId: agent.id,
            orgId,
            status: 'RESOLVED'
          }
        }),
        
        // Average response time
        prisma.$queryRaw`
          SELECT 
            AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_hours
          FROM "Ticket" t
          WHERE t."assignedAgentId" = ${agent.id}
            AND t."orgId" = ${orgId}
            AND t."status" = 'RESOLVED'
            AND t."createdAt" >= NOW() - INTERVAL '30 days'
        `,
        
        // Tickets by status
        prisma.ticket.groupBy({
          by: ['status'],
          where: {
            assignedAgentId: agent.id,
            orgId
          },
          _count: { id: true }
        }),
        
        // Tickets by priority
        prisma.ticket.groupBy({
          by: ['priority'],
          where: {
            assignedAgentId: agent.id,
            orgId
          },
          _count: { id: true }
        }),
        
        // Recent activity
        prisma.ticket.findMany({
          where: {
            assignedAgentId: agent.id,
            orgId
          },
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            customer: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 10
        }),
        
        // Performance metrics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_resolved,
            AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_resolution_hours,
            COUNT(CASE WHEN t."priority" = 'HIGH' THEN 1 END) as high_priority_resolved,
            COUNT(CASE WHEN t."priority" = 'CRITICAL' THEN 1 END) as critical_priority_resolved
          FROM "Ticket" t
          WHERE t."assignedAgentId" = ${agent.id}
            AND t."orgId" = ${orgId}
            AND t."status" = 'RESOLVED'
            AND t."createdAt" >= NOW() - INTERVAL '30 days'
        `,
        
        // Queue statistics
        prisma.ticket.groupBy({
          by: ['status'],
          where: {
            orgId,
            assignedAgentId: null
          },
          _count: { id: true }
        })
      ]);

      // Format status distribution
      const statusDistribution: Record<string, number> = {};
      ticketsByStatus.forEach(stat => {
        statusDistribution[stat.status] = stat._count.id;
      });

      // Format priority distribution
      const priorityDistribution: Record<string, number> = {};
      ticketsByPriority.forEach(stat => {
        priorityDistribution[stat.priority] = stat._count.id;
      });

      // Format queue stats
      const queueDistribution: Record<string, number> = {};
      queueStats.forEach(stat => {
        queueDistribution[stat.status] = stat._count.id;
      });

      const avgHours = avgResponseTime[0]?.avg_hours 
        ? parseFloat(avgResponseTime[0].avg_hours).toFixed(2)
        : null;

      const performance = performanceMetrics[0] as any;

      res.json({
        success: true,
        dashboard: {
          overview: {
            totalTickets,
            activeTickets,
            resolvedTickets,
            avgResponseTime: avgHours ? `${avgHours} hours` : 'N/A'
          },
          distributions: {
            status: statusDistribution,
            priority: priorityDistribution
          },
          performance: {
            totalResolved: performance?.total_resolved || 0,
            avgResolutionTime: performance?.avg_resolution_hours 
              ? `${parseFloat(performance.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A',
            highPriorityResolved: performance?.high_priority_resolved || 0,
            criticalPriorityResolved: performance?.critical_priority_resolved || 0
          },
          recentActivity,
          queueStats: queueDistribution
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get agent dashboard:', error);
      return res.status(500).json({ error: 'Failed to get agent dashboard' });
    }
  }

  /**
   * Get agent performance trends
   */
  static async getPerformanceTrends(req: Request, res: Response) {
    try {
      const { period } = await validate({
        query: {
          period: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get agent record
      const agent = await prisma.agent.findFirst({
        where: { userId, orgId }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      // Set period
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;

      // Get performance trends
      const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
        // Daily stats
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*) as tickets_created,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as tickets_resolved
          FROM "Ticket"
          WHERE "assignedAgentId" = ${agent.id}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date DESC
        `,
        
        // Weekly stats
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('week', "createdAt") as week,
            COUNT(*) as tickets_created,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as tickets_resolved,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours
          FROM "Ticket"
          WHERE "assignedAgentId" = ${agent.id}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '12 weeks'
          GROUP BY DATE_TRUNC('week', "createdAt")
          ORDER BY week DESC
        `,
        
        // Monthly stats
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            COUNT(*) as tickets_created,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as tickets_resolved,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours
          FROM "Ticket"
          WHERE "assignedAgentId" = ${agent.id}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month DESC
        `
      ]);

      res.json({
        success: true,
        trends: {
          daily: (dailyStats as any[]).map(stat => ({
            date: stat.date,
            ticketsCreated: parseInt(stat.tickets_created),
            ticketsResolved: parseInt(stat.tickets_resolved)
          })),
          weekly: (weeklyStats as any[]).map(stat => ({
            week: stat.week,
            ticketsCreated: parseInt(stat.tickets_created),
            ticketsResolved: parseInt(stat.tickets_resolved),
            avgResolutionHours: stat.avg_resolution_hours 
              ? parseFloat(stat.avg_resolution_hours).toFixed(2)
              : null
          })),
          monthly: (monthlyStats as any[]).map(stat => ({
            month: stat.month,
            ticketsCreated: parseInt(stat.tickets_created),
            ticketsResolved: parseInt(stat.tickets_resolved),
            avgResolutionHours: stat.avg_resolution_hours
              ? parseFloat(stat.avg_resolution_hours).toFixed(2)
              : null
          }))
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get performance trends:', error);
      return res.status(500).json({ error: 'Failed to get performance trends' });
    }
  }

  /**
   * Get agent workload analysis
   */
  static async getWorkloadAnalysis(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get agent record
      const agent = await prisma.agent.findFirst({
        where: { userId, orgId }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      // Get workload analysis
      const [
        currentWorkload,
        workloadTrends,
        efficiencyMetrics,
        timeDistribution
      ] = await Promise.all([
        // Current workload
        prisma.ticket.findMany({
          where: {
            assignedAgentId: agent.id,
            orgId,
            status: {
              in: ['OPEN', 'IN_PROGRESS']
            }
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
            },
            _count: {
              select: { messages: true }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' }
          ]
        }),
        
        // Workload trends
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*) as tickets_assigned,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as tickets_resolved
          FROM "Ticket"
          WHERE "assignedAgentId" = ${agent.id}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date DESC
        `,
        
        // Efficiency metrics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours,
            COUNT(CASE WHEN "priority" = 'HIGH' AND "status" = 'RESOLVED' THEN 1 END) as high_priority_resolved,
            COUNT(CASE WHEN "priority" = 'CRITICAL' AND "status" = 'RESOLVED' THEN 1 END) as critical_priority_resolved
          FROM "Ticket"
          WHERE "assignedAgentId" = ${agent.id}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '30 days'
        `,
        
        // Time distribution by priority
        prisma.$queryRaw`
          SELECT 
            "priority",
            COUNT(*) as count,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_hours
          FROM "Ticket"
          WHERE "assignedAgentId" = ${agent.id}
            AND "orgId" = ${orgId}
            AND "status" = 'RESOLVED'
            AND "createdAt" >= NOW() - INTERVAL '90 days'
          GROUP BY "priority"
        `
      ]);

      const efficiency = efficiencyMetrics[0] as any;

      res.json({
        success: true,
        workload: {
          current: currentWorkload.map(ticket => ({
            id: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
            status: ticket.status,
            createdAt: ticket.createdAt,
            customer: ticket.customer,
            messageCount: ticket._count.messages
          })),
          trends: (workloadTrends as any[]).map(stat => ({
            date: stat.date,
            ticketsAssigned: parseInt(stat.tickets_assigned),
            ticketsResolved: parseInt(stat.tickets_resolved)
          })),
          efficiency: {
            totalTickets: efficiency?.total_tickets || 0,
            resolvedTickets: efficiency?.resolved_tickets || 0,
            resolutionRate: efficiency?.total_tickets 
              ? ((efficiency.resolved_tickets / efficiency.total_tickets) * 100).toFixed(1)
              : '0',
            avgResolutionTime: efficiency?.avg_resolution_hours
              ? `${parseFloat(efficiency.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A',
            highPriorityResolved: efficiency?.high_priority_resolved || 0,
            criticalPriorityResolved: efficiency?.critical_priority_resolved || 0
          },
          timeDistribution: (timeDistribution as any[]).map(stat => ({
            priority: stat.priority,
            count: parseInt(stat.count),
            avgHours: stat.avg_hours 
              ? parseFloat(stat.avg_hours).toFixed(2)
              : null
          }))
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get workload analysis:', error);
      return res.status(500).json({ error: 'Failed to get workload analysis' });
    }
  }

  /**
   * Get agent comparison metrics
   */
  static async getComparisonMetrics(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get agent record
      const agent = await prisma.agent.findFirst({
        where: { userId, orgId }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      // Get agent comparison data
      const [agentMetrics, teamMetrics, rankings] = await Promise.all([
        // Current agent metrics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours
          FROM "Ticket"
          WHERE "assignedAgentId" = ${agent.id}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '30 days'
        `,
        
        // Team metrics
        prisma.$queryRaw`
          SELECT 
            AVG(ticket_count) as avg_tickets,
            AVG(resolved_count) as avg_resolved,
            AVG(avg_hours) as avg_resolution_hours
          FROM (
            SELECT 
              a.id,
              COUNT(t.id) as ticket_count,
              COUNT(CASE WHEN t."status" = 'RESOLVED' THEN 1 END) as resolved_count,
              AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_hours
            FROM "Agent" a
            LEFT JOIN "Ticket" t ON a.id = t."assignedAgentId"
            WHERE a."orgId" = ${orgId}
              AND t."createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY a.id
          ) agent_stats
        `,
        
        // Rankings
        prisma.$queryRaw`
          SELECT 
            a.id,
            a."userId",
            u.email as agent_email,
            COUNT(t.id) as total_tickets,
            COUNT(CASE WHEN t."status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
            AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_resolution_hours,
            RANK() OVER (ORDER BY COUNT(CASE WHEN t."status" = 'RESOLVED' THEN 1 END) DESC) as resolution_rank,
            RANK() OVER (ORDER BY AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) ASC) as speed_rank
          FROM "Agent" a
          LEFT JOIN "User" u ON a."userId" = u.id
          LEFT JOIN "Ticket" t ON a.id = t."assignedAgentId"
          WHERE a."orgId" = ${orgId}
            AND t."createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY a.id, a."userId", u.email
          ORDER BY resolved_tickets DESC
        `
      ]);

      const agentData = agentMetrics[0] as any;
      const teamData = teamMetrics[0] as any;
      
      // Find current agent's ranking
      const currentRanking = (rankings as any[]).find(r => r.id === agent.id);

      res.json({
        success: true,
        comparison: {
          current: {
            totalTickets: agentData?.total_tickets || 0,
            resolvedTickets: agentData?.resolved_tickets || 0,
            avgResolutionTime: agentData?.avg_resolution_hours
              ? `${parseFloat(agentData.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A'
          },
          team: {
            avgTickets: teamData?.avg_tickets ? parseFloat(teamData.avg_tickets).toFixed(1) : '0',
            avgResolved: teamData?.avg_resolved ? parseFloat(teamData.avg_resolved).toFixed(1) : '0',
            avgResolutionTime: teamData?.avg_resolution_hours
              ? `${parseFloat(teamData.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A'
          },
          rankings: {
            resolutionRank: currentRanking?.resolution_rank || 0,
            speedRank: currentRanking?.speed_rank || 0,
            totalAgents: rankings.length
          },
          topPerformers: (rankings as any[]).slice(0, 5).map(rank => ({
            email: rank.agent_email,
            resolvedTickets: rank.resolved_tickets,
            avgResolutionTime: rank.avg_resolution_hours
              ? `${parseFloat(rank.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A',
            isCurrentAgent: rank.id === agent.id
          }))
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get comparison metrics:', error);
      return res.status(500).json({ error: 'Failed to get comparison metrics' });
    }
  }
}
