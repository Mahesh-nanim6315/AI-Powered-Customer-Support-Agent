import { Request, Response } from 'express';
import prisma from '../config/database';
import { validate } from '../middlewares/validation.middleware';
import { uuidSchema, paginationSchema } from '../validators/common.validators';

/**
 * Agent Performance Controller - Comprehensive agent performance tracking and metrics
 */
export class AgentPerformanceController {
  
  /**
   * Get agent performance overview
   */
  static async getPerformanceOverview(req: Request, res: Response) {
    try {
      const { agentId, period } = await validate({
        query: {
          agentId: uuidSchema.optional(),
          period: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Set period
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;

      // Get agent record if specified
      let targetAgentId = agentId;
      if (agentId) {
        const agent = await prisma.agent.findFirst({
          where: { id: agentId, orgId }
        });
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
      } else {
        // Get current user's agent record
        const agent = await prisma.agent.findFirst({
          where: { userId, orgId }
        });
        if (!agent) {
          return res.status(404).json({ error: 'Agent profile not found' });
        }
        targetAgentId = agent.id;
      }

      // Get comprehensive performance data
      const [
        performanceMetrics,
        qualityMetrics,
        productivityMetrics,
        timeMetrics,
        customerSatisfaction
      ] = await Promise.all([
        // Basic performance metrics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
            COUNT(CASE WHEN "status" = 'IN_PROGRESS' THEN 1 END) as in_progress_tickets,
            COUNT(CASE WHEN "status" = 'OPEN' THEN 1 END) as open_tickets,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours,
            COUNT(CASE WHEN "priority" = 'HIGH' THEN 1 END) as high_priority_tickets,
            COUNT(CASE WHEN "priority" = 'CRITICAL' THEN 1 END) as critical_priority_tickets
          FROM "Ticket"
          WHERE "assignedAgentId" = ${targetAgentId}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
        `,
        
        // Quality metrics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_resolved,
            COUNT(CASE WHEN EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600 <= 24 THEN 1 END) as resolved_within_24h,
            COUNT(CASE WHEN EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600 <= 4 THEN 1 END) as resolved_within_4h,
            COUNT(CASE WHEN EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600 <= 1 THEN 1 END) as resolved_within_1h,
            COUNT(CASE WHEN "priority" = 'HIGH' AND EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600 <= 4 THEN 1 END) as high_priority_within_sla,
            COUNT(CASE WHEN "priority" = 'CRITICAL' AND EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600 <= 1 THEN 1 END) as critical_priority_within_sla
          FROM "Ticket"
          WHERE "assignedAgentId" = ${targetAgentId}
            AND "orgId" = ${orgId}
            AND "status" = 'RESOLVED'
            AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
        `,
        
        // Productivity metrics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_messages,
            COUNT(CASE WHEN "role" = 'AGENT' THEN 1 END) as agent_messages,
            COUNT(CASE WHEN "role" = 'AI' THEN 1 END) as ai_messages,
            AVG(LENGTH("content")) as avg_message_length,
            COUNT(DISTINCT DATE("createdAt")) as active_days
          FROM "TicketMessage" tm
          JOIN "Ticket" t ON tm."ticketId" = t.id
          WHERE t."assignedAgentId" = ${targetAgentId}
            AND t."orgId" = ${orgId}
            AND t."createdAt" >= NOW() - INTERVAL '${periodDays} days'
        `,
        
        // Time-based metrics
        prisma.$queryRaw`
          SELECT 
            EXTRACT(HOUR FROM "createdAt") as hour_of_day,
            COUNT(*) as tickets_created,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as tickets_resolved
          FROM "Ticket"
          WHERE "assignedAgentId" = ${targetAgentId}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY EXTRACT(HOUR FROM "createdAt")
          ORDER BY hour_of_day
        `,
        
        // Customer satisfaction (placeholder)
        Promise.resolve({
          avgRating: 4.5,
          totalRatings: 23,
          positiveFeedback: 18,
          negativeFeedback: 5
        })
      ]);

      const performance = performanceMetrics[0] as any;
      const quality = qualityMetrics[0] as any;
      const productivity = productivityMetrics[0] as any;
      const satisfaction = customerSatisfaction as any;

      res.json({
        success: true,
        performance: {
          overview: {
            totalTickets: performance?.total_tickets || 0,
            resolvedTickets: performance?.resolved_tickets || 0,
            inProgressTickets: performance?.in_progress_tickets || 0,
            openTickets: performance?.open_tickets || 0,
            avgResolutionTime: performance?.avg_resolution_hours
              ? `${parseFloat(performance.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A',
            highPriorityTickets: performance?.high_priority_tickets || 0,
            criticalPriorityTickets: performance?.critical_priority_tickets || 0
          },
          quality: {
            totalResolved: quality?.total_resolved || 0,
            resolvedWithin24h: quality?.resolved_within_24h || 0,
            resolvedWithin4h: quality?.resolved_within_4h || 0,
            resolvedWithin1h: quality?.resolved_within_1h || 0,
            highPriorityWithinSla: quality?.high_priority_within_sla || 0,
            criticalPriorityWithinSla: quality?.critical_priority_within_sla || 0,
            sla24hCompliance: quality?.total_resolved
              ? ((quality.resolved_within_24h / quality.total_resolved) * 100).toFixed(1)
              : '0',
            sla4hCompliance: quality?.total_resolved
              ? ((quality.resolved_within_4h / quality.total_resolved) * 100).toFixed(1)
              : '0',
            sla1hCompliance: quality?.total_resolved
              ? ((quality.resolved_within_1h / quality.total_resolved) * 100).toFixed(1)
              : '0'
          },
          productivity: {
            totalMessages: productivity?.total_messages || 0,
            agentMessages: productivity?.agent_messages || 0,
            aiMessages: productivity?.ai_messages || 0,
            avgMessageLength: productivity?.avg_message_length
              ? parseFloat(productivity.avg_message_length).toFixed(0)
              : '0',
            activeDays: productivity?.active_days || 0,
            messagesPerDay: productivity?.active_days
              ? (productivity.total_messages / productivity.active_days).toFixed(1)
              : '0'
          },
          timeDistribution: (timeMetrics as any[]).map(stat => ({
            hourOfDay: parseInt(stat.hour_of_day),
            ticketsCreated: parseInt(stat.tickets_created),
            ticketsResolved: parseInt(stat.tickets_resolved)
          })),
          customerSatisfaction: satisfaction
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get performance overview:', error);
      return res.status(500).json({ error: 'Failed to get performance overview' });
    }
  }

  /**
   * Get agent performance trends
   */
  static async getPerformanceTrends(req: Request, res: Response) {
    try {
      const { agentId, period } = await validate({
        query: {
          agentId: uuidSchema.optional(),
          period: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get target agent ID
      let targetAgentId = agentId;
      if (!agentId) {
        const agent = await prisma.agent.findFirst({
          where: { userId, orgId }
        });
        if (!agent) {
          return res.status(404).json({ error: 'Agent profile not found' });
        }
        targetAgentId = agent.id;
      }

      // Set period
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;

      // Get performance trends
      const [dailyTrends, weeklyTrends, monthlyTrends] = await Promise.all([
        // Daily trends
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*) as tickets_created,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as tickets_resolved,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours
          FROM "Ticket"
          WHERE "assignedAgentId" = ${targetAgentId}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date DESC
        `,
        
        // Weekly trends
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('week', "createdAt") as week,
            COUNT(*) as tickets_created,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as tickets_resolved,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours,
            COUNT(CASE WHEN "priority" = 'HIGH' THEN 1 END) as high_priority_tickets,
            COUNT(CASE WHEN "priority" = 'CRITICAL' THEN 1 END) as critical_priority_tickets
          FROM "Ticket"
          WHERE "assignedAgentId" = ${targetAgentId}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '12 weeks'
          GROUP BY DATE_TRUNC('week', "createdAt")
          ORDER BY week DESC
        `,
        
        // Monthly trends
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            COUNT(*) as tickets_created,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as tickets_resolved,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours,
            COUNT(CASE WHEN "priority" = 'HIGH' THEN 1 END) as high_priority_tickets,
            COUNT(CASE WHEN "priority" = 'CRITICAL' THEN 1 END) as critical_priority_tickets
          FROM "Ticket"
          WHERE "assignedAgentId" = ${targetAgentId}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month DESC
        `
      ]);

      res.json({
        success: true,
        trends: {
          daily: (dailyTrends as any[]).map(stat => ({
            date: stat.date,
            ticketsCreated: parseInt(stat.tickets_created),
            ticketsResolved: parseInt(stat.tickets_resolved),
            avgResolutionHours: stat.avg_resolution_hours
              ? parseFloat(stat.avg_resolution_hours).toFixed(2)
              : null
          })),
          weekly: (weeklyTrends as any[]).map(stat => ({
            week: stat.week,
            ticketsCreated: parseInt(stat.tickets_created),
            ticketsResolved: parseInt(stat.tickets_resolved),
            avgResolutionHours: stat.avg_resolution_hours
              ? parseFloat(stat.avg_resolution_hours).toFixed(2)
              : null,
            highPriorityTickets: parseInt(stat.high_priority_tickets),
            criticalPriorityTickets: parseInt(stat.critical_priority_tickets)
          })),
          monthly: (monthlyTrends as any[]).map(stat => ({
            month: stat.month,
            ticketsCreated: parseInt(stat.tickets_created),
            ticketsResolved: parseInt(stat.tickets_resolved),
            avgResolutionHours: stat.avg_resolution_hours
              ? parseFloat(stat.avg_resolution_hours).toFixed(2)
              : null,
            highPriorityTickets: parseInt(stat.high_priority_tickets),
            criticalPriorityTickets: parseInt(stat.critical_priority_tickets)
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
   * Get team performance comparison
   */
  static async getTeamComparison(req: Request, res: Response) {
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

      // Set period
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;

      // Get team performance comparison
      const teamMetrics = await prisma.$queryRaw`
        SELECT 
          a.id,
          u.email as agent_email,
          u.name as agent_name,
          COUNT(t.id) as total_tickets,
          COUNT(CASE WHEN t."status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
          COUNT(CASE WHEN t."status" = 'IN_PROGRESS' THEN 1 END) as in_progress_tickets,
          AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_resolution_hours,
          COUNT(CASE WHEN t."priority" = 'HIGH' THEN 1 END) as high_priority_tickets,
          COUNT(CASE WHEN t."priority" = 'CRITICAL' THEN 1 END) as critical_priority_tickets,
          COUNT(CASE WHEN EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600 <= 24 THEN 1 END) as resolved_within_24h,
          RANK() OVER (ORDER BY COUNT(CASE WHEN t."status" = 'RESOLVED' THEN 1 END) DESC) as resolution_rank,
          RANK() OVER (ORDER BY AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) ASC) as speed_rank,
          RANK() OVER (ORDER BY (COUNT(CASE WHEN EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600 <= 24 THEN 1 END) / NULLIF(COUNT(CASE WHEN t."status" = 'RESOLVED' THEN 1 END), 0)) DESC) as sla_rank
        FROM "Agent" a
        JOIN "User" u ON a."userId" = u.id
        LEFT JOIN "Ticket" t ON a.id = t."assignedAgentId"
        WHERE a."orgId" = ${orgId}
          AND t."createdAt" >= NOW() - INTERVAL '${periodDays} days'
        GROUP BY a.id, u.email, u.name
        ORDER BY resolved_tickets DESC
      `;

      // Get current user's agent info for highlighting
      const currentAgent = await prisma.agent.findFirst({
        where: { userId, orgId },
        select: { id: true }
      });

      res.json({
        success: true,
        comparison: {
          team: (teamMetrics as any[]).map(metric => ({
            agentId: metric.id,
            agentEmail: metric.agent_email,
            agentName: metric.agent_name,
            totalTickets: parseInt(metric.total_tickets),
            resolvedTickets: parseInt(metric.resolved_tickets),
            inProgressTickets: parseInt(metric.in_progress_tickets),
            avgResolutionTime: metric.avg_resolution_hours
              ? `${parseFloat(metric.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A',
            highPriorityTickets: parseInt(metric.high_priority_tickets),
            criticalPriorityTickets: parseInt(metric.critical_priority_tickets),
            resolvedWithin24h: parseInt(metric.resolved_within_24h),
            resolutionRank: parseInt(metric.resolution_rank),
            speedRank: parseInt(metric.speed_rank),
            slaRank: parseInt(metric.sla_rank),
            isCurrentUser: currentAgent?.id === metric.id
          })),
          rankings: {
            topResolver: (teamMetrics as any[]).find(m => parseInt(m.resolution_rank) === 1),
            fastestResolver: (teamMetrics as any[]).find(m => parseInt(m.speed_rank) === 1),
            bestSla: (teamMetrics as any[]).find(m => parseInt(m.sla_rank) === 1)
          }
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get team comparison:', error);
      return res.status(500).json({ error: 'Failed to get team comparison' });
    }
  }

  /**
   * Get agent skills and specialization metrics
   */
  static async getSkillsMetrics(req: Request, res: Response) {
    try {
      const { agentId } = await validate({
        query: {
          agentId: uuidSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get target agent ID
      let targetAgentId = agentId;
      if (!agentId) {
        const agent = await prisma.agent.findFirst({
          where: { userId, orgId }
        });
        if (!agent) {
          return res.status(404).json({ error: 'Agent profile not found' });
        }
        targetAgentId = agent.id;
      }

      // Get agent skills and performance by category
      const [agentInfo, categoryPerformance, skillsGap] = await Promise.all([
        // Agent information
        prisma.agent.findFirst({
          where: { id: targetAgentId, orgId },
          select: {
            id: true,
            specialization: true,
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        }),
        
        // Performance by ticket category (placeholder)
        prisma.$queryRaw`
          SELECT 
            'General' as category,
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours
          FROM "Ticket"
          WHERE "assignedAgentId" = ${targetAgentId}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '90 days'
          GROUP BY 'General'
        `,
        
        // Skills gap analysis (placeholder)
        Promise.resolve({
          recommendedSkills: ['Communication', 'Technical Support', 'Customer Service', 'Problem Solving'],
          currentSkills: ['Communication', 'Customer Service'],
          skillGaps: ['Technical Support', 'Problem Solving'],
          trainingRecommendations: [
            { skill: 'Technical Support', priority: 'High', course: 'Advanced Troubleshooting' },
            { skill: 'Problem Solving', priority: 'Medium', course: 'Critical Thinking Workshop' }
          ]
        })
      ]);

      const agent = agentInfo;
      const categories = categoryPerformance as any[];
      const skills = skillsGap as any;

      res.json({
        success: true,
        skills: {
          agent: {
            id: agent?.id,
            email: agent?.user.email,
            name: agent?.user.name,
            specialization: agent?.specialization || 'General'
          },
          categoryPerformance: categories.map(cat => ({
            category: cat.category,
            totalTickets: parseInt(cat.total_tickets),
            resolvedTickets: parseInt(cat.resolved_tickets),
            avgResolutionTime: cat.avg_resolution_hours
              ? `${parseFloat(cat.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A',
            resolutionRate: cat.total_tickets
              ? ((cat.resolved_tickets / cat.total_tickets) * 100).toFixed(1)
              : '0'
          })),
          skillsAnalysis: {
            currentSkills: skills.currentSkills,
            recommendedSkills: skills.recommendedSkills,
            skillGaps: skills.skillGaps,
            trainingRecommendations: skills.trainingRecommendations
          }
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get skills metrics:', error);
      return res.status(500).json({ error: 'Failed to get skills metrics' });
    }
  }

  /**
   * Get performance goals and achievements
   */
  static async getGoalsAndAchievements(req: Request, res: Response) {
    try {
      const { agentId, period } = await validate({
        query: {
          agentId: uuidSchema.optional(),
          period: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get target agent ID
      let targetAgentId = agentId;
      if (!agentId) {
        const agent = await prisma.agent.findFirst({
          where: { userId, orgId }
        });
        if (!agent) {
          return res.status(404).json({ error: 'Agent profile not found' });
        }
        targetAgentId = agent.id;
      }

      // Set period
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;

      // Get current performance and goals (placeholder data)
      const [currentPerformance, goals, achievements] = await Promise.all([
        // Current performance
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours,
            COUNT(CASE WHEN EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600 <= 24 THEN 1 END) as resolved_within_24h
          FROM "Ticket"
          WHERE "assignedAgentId" = ${targetAgentId}
            AND "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
        `,
        
        // Performance goals (placeholder)
        Promise.resolve({
          resolutionTime: { target: 4, unit: 'hours', current: 3.2 },
          ticketsPerDay: { target: 8, unit: 'tickets', current: 6.5 },
          slaCompliance: { target: 95, unit: 'percent', current: 92.3 },
          customerSatisfaction: { target: 4.5, unit: 'rating', current: 4.3 }
        }),
        
        // Achievements and badges (placeholder)
        Promise.resolve({
          badges: [
            { id: 'speed_demon', name: 'Speed Demon', description: 'Resolved 50+ tickets in a month', earned: true, earnedAt: '2024-01-15' },
            { id: 'quality_expert', name: 'Quality Expert', description: '95%+ SLA compliance', earned: true, earnedAt: '2024-01-20' },
            { id: 'customer_hero', name: 'Customer Hero', description: '4.5+ average rating', earned: false, progress: 85 }
          ],
          milestones: [
            { type: 'tickets_resolved', target: 100, current: 87, description: 'Tickets Resolved' },
            { type: 'streak_days', target: 30, current: 12, description: 'Consecutive Days with SLA Met' },
            { type: 'customer_ratings', target: 50, current: 43, description: 'Positive Customer Ratings' }
          ]
        })
      ]);

      const performance = currentPerformance[0] as any;
      const goalData = goals as any;
      const achievementData = achievements as any;

      res.json({
        success: true,
        goals: {
          current: {
            totalTickets: performance?.total_tickets || 0,
            resolvedTickets: performance?.resolved_tickets || 0,
            avgResolutionTime: performance?.avg_resolution_hours
              ? parseFloat(performance.avg_resolution_hours).toFixed(2)
              : 0,
            slaCompliance: performance?.resolved_tickets
              ? ((performance.resolved_within_24h / performance.resolved_tickets) * 100).toFixed(1)
              : '0'
          },
          targets: goalData,
          progress: {
            resolutionTime: {
              current: parseFloat(goalData.resolutionTime.current),
              target: goalData.resolutionTime.target,
              percentage: Math.min((goalData.resolutionTime.current / goalData.resolutionTime.target) * 100, 100),
              status: parseFloat(goalData.resolutionTime.current) <= goalData.resolutionTime.target ? 'achieved' : 'in_progress'
            },
            ticketsPerDay: {
              current: parseFloat(goalData.ticketsPerDay.current),
              target: goalData.ticketsPerDay.target,
              percentage: Math.min((goalData.ticketsPerDay.current / goalData.ticketsPerDay.target) * 100, 100),
              status: parseFloat(goalData.ticketsPerDay.current) >= goalData.ticketsPerDay.target ? 'achieved' : 'in_progress'
            },
            slaCompliance: {
              current: parseFloat(goalData.slaCompliance.current),
              target: goalData.slaCompliance.target,
              percentage: Math.min((goalData.slaCompliance.current / goalData.slaCompliance.target) * 100, 100),
              status: parseFloat(goalData.slaCompliance.current) >= goalData.slaCompliance.target ? 'achieved' : 'in_progress'
            },
            customerSatisfaction: {
              current: parseFloat(goalData.customerSatisfaction.current),
              target: goalData.customerSatisfaction.target,
              percentage: Math.min((goalData.customerSatisfaction.current / goalData.customerSatisfaction.target) * 100, 100),
              status: parseFloat(goalData.customerSatisfaction.current) >= goalData.customerSatisfaction.target ? 'achieved' : 'in_progress'
            }
          }
        },
        achievements: achievementData,
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get goals and achievements:', error);
      return res.status(500).json({ error: 'Failed to get goals and achievements' });
    }
  }
}
