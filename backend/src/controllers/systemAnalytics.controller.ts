import { Request, Response } from 'express';
import prisma from '../config/database';
import { validate } from '../middlewares/validation.middleware';
import { paginationSchema } from '../validators/common.validators';

/**
 * System Analytics Controller - Comprehensive system analytics and reporting
 */
export class SystemAnalyticsController {
  
  /**
   * Get comprehensive system analytics
   */
  static async getSystemAnalytics(req: Request, res: Response) {
    try {
      const { period, groupBy } = await validate({
        query: {
          period: paginationSchema.optional(),
          groupBy: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Set period
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const grouping = groupBy || 'day';

      // Get comprehensive analytics data
      const [
        ticketAnalytics,
        userAnalytics,
        performanceAnalytics,
        satisfactionAnalytics,
        financialAnalytics
      ] = await Promise.all([
        // Ticket analytics
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('${grouping}', "createdAt") as period,
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN "status" = 'OPEN' THEN 1 END) as open_tickets,
            COUNT(CASE WHEN "status" = 'IN_PROGRESS' THEN 1 END) as in_progress_tickets,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
            COUNT(CASE WHEN "priority" = 'HIGH' THEN 1 END) as high_priority_tickets,
            COUNT(CASE WHEN "priority" = 'CRITICAL' THEN 1 END) as critical_priority_tickets,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours,
            COUNT(CASE WHEN EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600 <= 24 THEN 1 END) as resolved_within_24h
          FROM "Ticket"
          WHERE "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
          GROUP BY DATE_TRUNC('${grouping}', "createdAt")
          ORDER BY period DESC
        `,
        
        // User analytics
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('${grouping}', "createdAt") as period,
            COUNT(*) as new_users,
            COUNT(CASE WHEN "role" = 'CUSTOMER' THEN 1 END) as new_customers,
            COUNT(CASE WHEN "role" = 'AGENT' THEN 1 END) as new_agents,
            COUNT(CASE WHEN "role" = 'ADMIN' THEN 1 END) as new_admins,
            COUNT(DISTINCT "userId") as active_users
          FROM "User" u
          LEFT JOIN "UserActivity" ua ON u.id = ua."userId"
          WHERE u."orgId" = ${orgId}
            AND u."createdAt" >= NOW() - INTERVAL '${periodDays} days'
          GROUP BY DATE_TRUNC('${grouping}', "createdAt")
          ORDER BY period DESC
        `,
        
        // Performance analytics
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('${grouping}', t."createdAt") as period,
            COUNT(*) as total_tickets,
            AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_resolution_time,
            COUNT(CASE WHEN EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600 <= 24 THEN 1 END) as resolved_within_24h,
            COUNT(CASE WHEN t."priority" = 'HIGH' AND EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600 <= 4 THEN 1 END) as high_priority_sla_met,
            COUNT(CASE WHEN t."priority" = 'CRITICAL' AND EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600 <= 1 THEN 1 END) as critical_priority_sla_met
          FROM "Ticket" t
          WHERE t."orgId" = ${orgId}
            AND t."createdAt" >= NOW() - INTERVAL '${periodDays} days'
          GROUP BY DATE_TRUNC('${grouping}', t."createdAt")
          ORDER BY period DESC
        `,
        
        // Satisfaction analytics (placeholder)
        Promise.resolve([
          {
            period: new Date('2024-01-15'),
            avgRating: 4.3,
            totalRatings: 45,
            positiveFeedback: 38,
            negativeFeedback: 7,
            responseRate: 0.78
          },
          {
            period: new Date('2024-01-14'),
            avgRating: 4.5,
            totalRatings: 52,
            positiveFeedback: 46,
            negativeFeedback: 6,
            responseRate: 0.82
          }
        ]),
        
        // Financial analytics (placeholder)
        Promise.resolve({
          totalRevenue: 125000,
          revenueGrowth: 15.3,
          avgTicketValue: 89.50,
          costPerResolution: 23.75,
          profitMargin: 73.4,
          monthlyRecurringRevenue: 45000
        })
      ]);

      res.json({
        success: true,
        analytics: {
          tickets: (ticketAnalytics as any[]).map(stat => ({
            period: stat.period,
            totalTickets: parseInt(stat.total_tickets),
            openTickets: parseInt(stat.open_tickets),
            inProgressTickets: parseInt(stat.in_progress_tickets),
            resolvedTickets: parseInt(stat.resolved_tickets),
            highPriorityTickets: parseInt(stat.high_priority_tickets),
            criticalPriorityTickets: parseInt(stat.critical_priority_tickets),
            avgResolutionTime: stat.avg_resolution_hours
              ? parseFloat(stat.avg_resolution_hours).toFixed(2)
              : null,
            resolvedWithin24h: parseInt(stat.resolved_within_24h),
            sla24hCompliance: stat.total_tickets
              ? ((stat.resolved_within_24h / stat.total_tickets) * 100).toFixed(1)
              : '0'
          })),
          users: (userAnalytics as any[]).map(stat => ({
            period: stat.period,
            newUsers: parseInt(stat.new_users),
            newCustomers: parseInt(stat.new_customers),
            newAgents: parseInt(stat.new_agents),
            newAdmins: parseInt(stat.new_admins),
            activeUsers: parseInt(stat.active_users)
          })),
          performance: (performanceAnalytics as any[]).map(stat => ({
            period: stat.period,
            totalTickets: parseInt(stat.total_tickets),
            avgResolutionTime: stat.avg_resolution_time
              ? parseFloat(stat.avg_resolution_time).toFixed(2)
              : null,
            resolvedWithin24h: parseInt(stat.resolved_within_24h),
            highPrioritySlaMet: parseInt(stat.high_priority_sla_met),
            criticalPrioritySlaMet: parseInt(stat.critical_priority_sla_met),
            sla24hCompliance: stat.total_tickets
              ? ((stat.resolved_within_24h / stat.total_tickets) * 100).toFixed(1)
              : '0'
          })),
          satisfaction: satisfactionAnalytics as any[],
          financial: financialAnalytics as any
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get system analytics:', error);
      return res.status(500).json({ error: 'Failed to get system analytics' });
    }
  }

  /**
   * Get detailed reports
   */
  static async getDetailedReports(req: Request, res: Response) {
    try {
      const { reportType, period, format } = await validate({
        query: {
          reportType: paginationSchema,
          period: paginationSchema.optional(),
          format: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Set period
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;

      let reportData;

      switch (reportType) {
        case 'TICKET_PERFORMANCE':
          reportData = await prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('day', "createdAt") as date,
              COUNT(*) as total_tickets,
              COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
              AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours,
              COUNT(CASE WHEN "priority" = 'HIGH' THEN 1 END) as high_priority_tickets,
              COUNT(CASE WHEN EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600 <= 24 THEN 1 END) as resolved_within_24h
            FROM "Ticket"
            WHERE "orgId" = ${orgId}
              AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY date DESC
          `;
          break;

        case 'AGENT_PERFORMANCE':
          reportData = await prisma.$queryRaw`
            SELECT 
              a.id,
              u.email as agent_email,
              u.name as agent_name,
              COUNT(t.id) as total_tickets,
              COUNT(CASE WHEN t."status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
              AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_resolution_hours,
              COUNT(CASE WHEN t."priority" = 'HIGH' THEN 1 END) as high_priority_tickets
            FROM "Agent" a
            JOIN "User" u ON a."userId" = u.id
            LEFT JOIN "Ticket" t ON a.id = t."assignedAgentId"
            WHERE a."orgId" = ${orgId}
              AND t."createdAt" >= NOW() - INTERVAL '${periodDays} days'
            GROUP BY a.id, u.email, u.name
            ORDER BY resolved_tickets DESC
          `;
          break;

        case 'CUSTOMER_SATISFACTION':
          reportData = await prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('day', "createdAt") as date,
              COUNT(*) as total_tickets,
              AVG("satisfactionRating") as avg_rating,
              COUNT(CASE WHEN "satisfactionRating" >= 4 THEN 1 END) as positive_ratings,
              COUNT(CASE WHEN "satisfactionRating" <= 2 THEN 1 END) as negative_ratings
            FROM "Ticket"
            WHERE "orgId" = ${orgId}
              AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
              AND "satisfactionRating" IS NOT NULL
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY date DESC
          `;
          break;

        case 'SYSTEM_USAGE':
          reportData = await prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('day', "createdAt") as date,
              COUNT(DISTINCT "userId") as active_users,
              COUNT(*) as total_sessions,
              AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 60) as avg_session_minutes
            FROM "UserSession" -- Placeholder table
            WHERE "orgId" = ${orgId}
              AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY date DESC
          `;
          break;

        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }

      // Format data based on requested format
      const formattedData = format === 'csv' 
        ? this.convertToCSV(reportData as any[])
        : format === 'excel' 
        ? this.convertToExcel(reportData as any[])
        : reportData;

      res.json({
        success: true,
        reportType,
        period,
        format: format || 'json',
        data: formattedData,
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get detailed reports:', error);
      return res.status(500).json({ error: 'Failed to get detailed reports' });
    }
  }

  /**
   * Get real-time analytics
   */
  static async getRealTimeAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get real-time analytics
      const [
        currentStats,
        recentActivity,
        systemLoad,
        activeUsers
      ] = await Promise.all([
        // Current statistics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN "status" = 'OPEN' THEN 1 END) as open_tickets,
            COUNT(CASE WHEN "status" = 'IN_PROGRESS' THEN 1 END) as in_progress_tickets,
            COUNT(CASE WHEN "priority" = 'HIGH' THEN 1 END) as high_priority_tickets,
            COUNT(CASE WHEN "priority" = 'CRITICAL' THEN 1 END) as critical_priority_tickets
          FROM "Ticket"
          WHERE "orgId" = ${orgId}
        `,
        
        // Recent activity (last hour)
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as tickets_created,
            COUNT(*) FILTER (WHERE "status" = 'RESOLVED') as tickets_resolved,
            COUNT(DISTINCT "customerId") as active_customers,
            COUNT(DISTINCT "assignedAgentId") as active_agents
          FROM "Ticket"
          WHERE "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '1 hour'
        `,
        
        // System load (placeholder)
        Promise.resolve({
          cpuUsage: 23,
          memoryUsage: 67,
          diskUsage: 45,
          networkLatency: 12,
          activeConnections: 45
        }),
        
        // Active users (last 15 minutes)
        prisma.$queryRaw`
          SELECT 
            COUNT(DISTINCT "userId") as active_users,
            COUNT(DISTINCT "customerId") as active_customers,
            COUNT(DISTINCT "assignedAgentId") as active_agents
          FROM "Ticket"
          WHERE "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '15 minutes'
        `
      ]);

      const current = currentStats[0] as any;
      const recent = recentActivity[0] as any;
      const load = systemLoad as any;
      const users = activeUsers[0] as any;

      res.json({
        success: true,
        realTime: {
          current: {
            totalTickets: current?.total_tickets || 0,
            openTickets: current?.open_tickets || 0,
            inProgressTickets: current?.in_progress_tickets || 0,
            highPriorityTickets: current?.high_priority_tickets || 0,
            criticalPriorityTickets: current?.critical_priority_tickets || 0
          },
          recentActivity: {
            ticketsCreated: parseInt(recent?.tickets_created || 0),
            ticketsResolved: parseInt(recent?.tickets_resolved || 0),
            activeCustomers: parseInt(recent?.active_customers || 0),
            activeAgents: parseInt(recent?.active_agents || 0)
          },
          systemLoad: load,
          activeUsers: {
            total: parseInt(users?.active_users || 0),
            customers: parseInt(users?.active_customers || 0),
            agents: parseInt(users?.active_agents || 0)
          }
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get real-time analytics:', error);
      return res.status(500).json({ error: 'Failed to get real-time analytics' });
    }
  }

  /**
   * Get custom analytics
   */
  static async getCustomAnalytics(req: Request, res: Response) {
    try {
      const { metrics, dimensions, filters, period } = await validate({
        body: {
          metrics: paginationSchema,
          dimensions: paginationSchema,
          filters: paginationSchema.optional(),
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

      // Build custom query based on provided metrics and dimensions
      let selectClause = '';
      let groupByClause = '';
      
      // Add dimensions
      if (dimensions.includes('date')) {
        selectClause += 'DATE_TRUNC(\'day\', t."createdAt") as date, ';
        groupByClause += 'DATE_TRUNC(\'day\', t."createdAt"), ';
      }
      
      if (dimensions.includes('priority')) {
        selectClause += 't.priority, ';
        groupByClause += 't.priority, ';
      }
      
      if (dimensions.includes('status')) {
        selectClause += 't.status, ';
        groupByClause += 't.status, ';
      }
      
      // Add metrics
      metrics.forEach((metric: string) => {
        switch (metric) {
          case 'ticket_count':
            selectClause += 'COUNT(*) as ticket_count, ';
            break;
          case 'avg_resolution_time':
            selectClause += 'AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_resolution_time, ';
            break;
          case 'sla_compliance':
            selectClause += 'COUNT(CASE WHEN EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600 <= 24 THEN 1 END) as sla_compliant, ';
            break;
        }
      });

      // Remove trailing commas
      selectClause = selectClause.slice(0, -2);
      if (groupByClause) {
        groupByClause = groupByClause.slice(0, -2);
      }

      const query = `
        SELECT ${selectClause}
        FROM "Ticket" t
        WHERE t."orgId" = ${orgId}
          AND t."createdAt" >= NOW() - INTERVAL '${periodDays} days'
        ${groupByClause ? `GROUP BY ${groupByClause}` : ''}
        ORDER BY date DESC
      `;

      const customData = await prisma.$queryRawUnsafe(query);

      res.json({
        success: true,
        analytics: {
          metrics,
          dimensions,
          filters: filters || {},
          data: customData,
          period,
          generatedAt: new Date()
        }
      });
    } catch (error: any) {
      console.error('Failed to get custom analytics:', error);
      return res.status(500).json({ error: 'Failed to get custom analytics' });
    }
  }

  /**
   * Get analytics dashboard summary
   */
  static async getAnalyticsSummary(req: Request, res: Response) {
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

      // Get summary statistics
      const [
        summaryStats,
        trends,
        topPerformers,
        insights
      ] = await Promise.all([
        // Summary statistics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN "status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
            AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as avg_resolution_hours,
            COUNT(CASE WHEN "priority" = 'HIGH' THEN 1 END) as high_priority_tickets,
            COUNT(DISTINCT "customerId") as unique_customers,
            COUNT(DISTINCT "assignedAgentId") as active_agents
          FROM "Ticket"
          WHERE "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '${periodDays} days'
        `,
        
        // Trends
        prisma.$queryRaw`
          SELECT 
            'TICKET_VOLUME' as metric,
            (COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('week', "createdAt"))) / NULLIF(LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('week', "createdAt")), 0) * 100 as trend_percentage
          FROM "Ticket"
          WHERE "orgId" = ${orgId}
            AND "createdAt" >= NOW() - INTERVAL '14 days'
          GROUP BY DATE_TRUNC('week', "createdAt")
          ORDER BY DATE_TRUNC('week', "createdAt") DESC
          LIMIT 1
        `,
        
        // Top performers
        prisma.$queryRaw`
          SELECT 
            u.name as agent_name,
            u.email as agent_email,
            COUNT(t.id) as tickets_resolved,
            AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_resolution_time
          FROM "Agent" a
          JOIN "User" u ON a."userId" = u.id
          JOIN "Ticket" t ON a.id = t."assignedAgentId"
          WHERE a."orgId" = ${orgId}
            AND t."status" = 'RESOLVED'
            AND t."createdAt" >= NOW() - INTERVAL '${periodDays} days'
          GROUP BY a.id, u.name, u.email
          ORDER BY tickets_resolved DESC
          LIMIT 5
        `,
        
        // Insights (placeholder)
        Promise.resolve([
          {
            type: 'PERFORMANCE',
            title: 'Resolution Time Improvement',
            description: 'Average resolution time decreased by 15% compared to last period',
            impact: 'POSITIVE',
            recommendation: 'Continue current agent training programs'
          },
          {
            type: 'VOLUME',
            title: 'Increased Ticket Volume',
            description: 'Ticket volume increased by 23% this period',
            impact: 'NEUTRAL',
            recommendation: 'Consider scaling support team during peak hours'
          }
        ])
      ]);

      const summary = summaryStats[0] as any;
      const trendData = trends as any[];
      const performers = topPerformers as any[];
      const insightData = insights as any[];

      res.json({
        success: true,
        summary: {
          overview: {
            totalTickets: summary?.total_tickets || 0,
            resolvedTickets: summary?.resolved_tickets || 0,
            avgResolutionTime: summary?.avg_resolution_hours
              ? `${parseFloat(summary.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A',
            highPriorityTickets: summary?.high_priority_tickets || 0,
            uniqueCustomers: summary?.unique_customers || 0,
            activeAgents: summary?.active_agents || 0
          },
          trends: trendData.map(trend => ({
            metric: trend.metric,
            trendPercentage: trend.trend_percentage
              ? parseFloat(trend.trend_percentage).toFixed(1)
              : '0'
          })),
          topPerformers: performers.map(performer => ({
            agentName: performer.agent_name,
            agentEmail: performer.agent_email,
            ticketsResolved: parseInt(performer.tickets_resolved),
            avgResolutionTime: performer.avg_resolution_time
              ? parseFloat(performer.avg_resolution_time).toFixed(2)
              : 'N/A'
          })),
          insights: insightData
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get analytics summary:', error);
      return res.status(500).json({ error: 'Failed to get analytics summary' });
    }
  }

  // Helper methods for data conversion
  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  private static convertToExcel(data: any[]): any {
    // Placeholder for Excel conversion
    // In a real implementation, you would use a library like xlsx
    return {
      data,
      format: 'excel',
      filename: `report_${Date.now()}.xlsx`
    };
  }
}
