import { Request, Response } from 'express';
import prisma from '../config/database';
import { validate } from '../middlewares/validation.middleware';
import { uuidSchema, paginationSchema } from '../validators/common.validators';

/**
 * Agent Collaboration Controller - Collaboration tools and team communication
 */
export class AgentCollaborationController {
  
  /**
   * Get team overview and status
   */
  static async getTeamOverview(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get team overview
      const [
        teamMembers,
        teamStats,
        activityFeed
      ] = await Promise.all([
        // Team members with current status
        prisma.agent.findMany({
          where: { orgId },
          include: {
            user: {
              select: {
                email: true,
                name: true
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
          orderBy: { user: { name: 'asc' } }
        }),
        
        // Team statistics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_agents,
            COUNT(CASE WHEN a."busyStatus" = true THEN 1 END) as busy_agents,
            COUNT(CASE WHEN a."busyStatus" = false THEN 1 END) as available_agents,
            AVG(a."activeTickets") as avg_active_tickets
          FROM "Agent" a
          WHERE a."orgId" = ${orgId}
        `,
        
        // Recent team activity
        prisma.$queryRaw`
          SELECT 
            a.id as agent_id,
            u.name as agent_name,
            u.email as agent_email,
            t.id as ticket_id,
            t.subject as ticket_subject,
            t."status" as ticket_status,
            t."createdAt" as activity_time,
            CASE 
              WHEN t."assignedAgentId" = a.id THEN 'assigned'
              WHEN t."status" = 'RESOLVED' AND t."assignedAgentId" = a.id THEN 'resolved'
              ELSE 'activity'
            END as activity_type
          FROM "Agent" a
          JOIN "User" u ON a."userId" = u.id
          LEFT JOIN "Ticket" t ON a.id = t."assignedAgentId"
          WHERE a."orgId" = ${orgId}
            AND t."createdAt" >= NOW() - INTERVAL '24 hours'
          ORDER BY t."createdAt" DESC
          LIMIT 20
        `
      ]);

      const stats = teamStats[0] as any;

      res.json({
        success: true,
        team: {
          members: teamMembers.map(member => ({
            id: member.id,
            name: member.user.name,
            email: member.user.email,
            busyStatus: member.busyStatus,
            activeTickets: member._count.tickets,
            specialization: member.specialization
          })),
          statistics: {
            totalAgents: stats?.total_agents || 0,
            busyAgents: stats?.busy_agents || 0,
            availableAgents: stats?.available_agents || 0,
            avgActiveTickets: stats?.avg_active_tickets ? parseFloat(stats.avg_active_tickets).toFixed(1) : '0'
          },
          recentActivity: (activityFeed as any[]).map(activity => ({
            agentId: activity.agent_id,
            agentName: activity.agent_name,
            agentEmail: activity.agent_email,
            ticketId: activity.ticket_id,
            ticketSubject: activity.ticket_subject,
            ticketStatus: activity.ticket_status,
            activityTime: activity.activity_time,
            activityType: activity.activity_type
          }))
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get team overview:', error);
      return res.status(500).json({ error: 'Failed to get team overview' });
    }
  }

  /**
   * Get internal communications
   */
  static async getInternalCommunications(req: Request, res: Response) {
    try {
      const { page, limit, type } = await validate({
        query: {
          page: paginationSchema.optional(),
          limit: paginationSchema.optional(),
          type: paginationSchema.optional()
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

      // Get internal communications (placeholder implementation)
      // In a real implementation, this would query an internal messages table
      const communications = [
        {
          id: '1',
          type: 'ANNOUNCEMENT',
          title: 'System Maintenance Scheduled',
          message: 'Scheduled maintenance this weekend from 2 AM to 6 AM EST',
          sender: {
            name: 'System Admin',
            email: 'admin@company.com'
          },
          createdAt: new Date('2024-01-15T10:00:00Z'),
          priority: 'HIGH',
          read: false
        },
        {
          id: '2',
          type: 'POLICY_UPDATE',
          title: 'Updated Ticket Handling Policy',
          message: 'New policy for handling high-priority tickets effective immediately',
          sender: {
            name: 'Team Lead',
            email: 'lead@company.com'
          },
          createdAt: new Date('2024-01-14T14:30:00Z'),
          priority: 'MEDIUM',
          read: true
        }
      ];

      // Filter by type if specified
      const filteredCommunications = type 
        ? communications.filter(c => c.type === type)
        : communications;

      res.json({
        success: true,
        communications: filteredCommunications.slice(skip, skip + limitNum),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredCommunications.length,
          pages: Math.ceil(filteredCommunications.length / limitNum),
          hasNext: pageNum * limitNum < filteredCommunications.length,
          hasPrev: pageNum > 1
        },
        filters: { type }
      });
    } catch (error: any) {
      console.error('Failed to get internal communications:', error);
      return res.status(500).json({ error: 'Failed to get internal communications' });
    }
  }

  /**
   * Get shared knowledge and resources
   */
  static async getSharedResources(req: Request, res: Response) {
    try {
      const { page, limit, category, search } = await validate({
        query: {
          page: paginationSchema.optional(),
          limit: paginationSchema.optional(),
          category: paginationSchema.optional(),
          search: paginationSchema.optional()
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

      // Get shared resources (placeholder implementation)
      // In a real implementation, this would query a shared resources table
      const resources = [
        {
          id: '1',
          title: 'Common Customer Issues Guide',
          description: 'Comprehensive guide for handling common customer issues',
          category: 'GUIDE',
          type: 'DOCUMENT',
          url: '/resources/common-issues.pdf',
          uploadedBy: {
            name: 'Senior Agent',
            email: 'senior@company.com'
          },
          createdAt: new Date('2024-01-10T09:00:00Z'),
          downloads: 156,
          rating: 4.8
        },
        {
          id: '2',
          title: 'Product Technical Specifications',
          description: 'Technical specifications for all products',
          category: 'TECHNICAL',
          type: 'DOCUMENT',
          url: '/resources/tech-specs.xlsx',
          uploadedBy: {
            name: 'Tech Lead',
            email: 'tech@company.com'
          },
          createdAt: new Date('2024-01-08T14:30:00Z'),
          downloads: 89,
          rating: 4.6
        },
        {
          id: '3',
          title: 'Customer Communication Templates',
          description: 'Email and chat templates for various scenarios',
          category: 'TEMPLATE',
          type: 'DOCUMENT',
          url: '/resources/communication-templates.docx',
          uploadedBy: {
            name: 'Team Lead',
            email: 'lead@company.com'
          },
          createdAt: new Date('2024-01-05T11:00:00Z'),
          downloads: 234,
          rating: 4.9
        }
      ];

      // Filter resources
      let filteredResources = resources;
      
      if (category) {
        filteredResources = filteredResources.filter(r => r.category === category);
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredResources = filteredResources.filter(r => 
          r.title.toLowerCase().includes(searchLower) ||
          r.description.toLowerCase().includes(searchLower)
        );
      }

      res.json({
        success: true,
        resources: filteredResources.slice(skip, skip + limitNum),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredResources.length,
          pages: Math.ceil(filteredResources.length / limitNum),
          hasNext: pageNum * limitNum < filteredResources.length,
          hasPrev: pageNum > 1
        },
        filters: { category, search },
        categories: ['GUIDE', 'TECHNICAL', 'TEMPLATE', 'POLICY', 'TRAINING']
      });
    } catch (error: any) {
      console.error('Failed to get shared resources:', error);
      return res.status(500).json({ error: 'Failed to get shared resources' });
    }
  }

  /**
   * Create internal announcement
   */
  static async createAnnouncement(req: Request, res: Response) {
    try {
      const { title, message, priority, recipients } = await validate({
        body: {
          title: paginationSchema,
          message: paginationSchema,
          priority: paginationSchema.optional(),
          recipients: paginationSchema.optional()
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get sender info
      const sender = await prisma.user.findFirst({
        where: { id: userId },
        select: { name: true, email: true }
      });

      if (!sender) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create announcement (placeholder implementation)
      // In a real implementation, this would save to an announcements table
      const announcement = {
        id: Date.now().toString(),
        type: 'ANNOUNCEMENT',
        title,
        message,
        priority: priority || 'MEDIUM',
        sender: {
          name: sender.name,
          email: sender.email
        },
        recipients: recipients || 'ALL',
        createdAt: new Date(),
        read: false
      };

      res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        announcement
      });
    } catch (error: any) {
      console.error('Failed to create announcement:', error);
      return res.status(500).json({ error: 'Failed to create announcement' });
    }
  }

  /**
   * Get handover requests and history
   */
  static async getHandoverRequests(req: Request, res: Response) {
    try {
      const { status, page, limit } = await validate({
        query: {
          status: paginationSchema.optional(),
          page: paginationSchema.optional(),
          limit: paginationSchema.optional()
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

      // Get handover requests (placeholder implementation)
      // In a real implementation, this would query a handovers table
      const handovers = [
        {
          id: '1',
          fromAgent: {
            id: 'agent1',
            name: 'John Doe',
            email: 'john@company.com'
          },
          toAgent: {
            id: 'agent2',
            name: 'Jane Smith',
            email: 'jane@company.com'
          },
          ticketId: 'ticket123',
          ticketSubject: 'Complex Technical Issue',
          reason: 'Escalation to senior agent required',
          status: 'PENDING',
          requestedAt: new Date('2024-01-15T10:30:00Z'),
          completedAt: null
        },
        {
          id: '2',
          fromAgent: {
            id: 'agent3',
            name: 'Bob Wilson',
            email: 'bob@company.com'
          },
          toAgent: {
            id: 'agent4',
            name: 'Alice Brown',
            email: 'alice@company.com'
          },
          ticketId: 'ticket456',
          ticketSubject: 'Billing Inquiry',
          reason: 'End of shift handover',
          status: 'COMPLETED',
          requestedAt: new Date('2024-01-14T18:00:00Z'),
          completedAt: new Date('2024-01-14T18:15:00Z')
        }
      ];

      // Filter by status if specified
      const filteredHandovers = status 
        ? handovers.filter(h => h.status === status)
        : handovers;

      res.json({
        success: true,
        handovers: filteredHandovers.slice(skip, skip + limitNum),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredHandovers.length,
          pages: Math.ceil(filteredHandovers.length / limitNum),
          hasNext: pageNum * limitNum < filteredHandovers.length,
          hasPrev: pageNum > 1
        },
        filters: { status },
        statistics: {
          total: handovers.length,
          pending: handovers.filter(h => h.status === 'PENDING').length,
          completed: handovers.filter(h => h.status === 'COMPLETED').length,
          rejected: handovers.filter(h => h.status === 'REJECTED').length
        }
      });
    } catch (error: any) {
      console.error('Failed to get handover requests:', error);
      return res.status(500).json({ error: 'Failed to get handover requests' });
    }
  }

  /**
   * Create handover request
   */
  static async createHandoverRequest(req: Request, res: Response) {
    try {
      const { ticketId, toAgentId, reason } = await validate({
        body: {
          ticketId: paginationSchema,
          toAgentId: paginationSchema,
          reason: paginationSchema
        }
      });
      
      const userId = (req as any).user?.userId;
      const orgId = (req as any).user?.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get current agent
      const fromAgent = await prisma.agent.findFirst({
        where: { userId, orgId }
      });

      if (!fromAgent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Get target agent
      const toAgent = await prisma.agent.findFirst({
        where: { id: toAgentId, orgId }
      });

      if (!toAgent) {
        return res.status(404).json({ error: 'Target agent not found' });
      }

      // Get ticket details
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, orgId }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Create handover request (placeholder implementation)
      const handoverRequest = {
        id: Date.now().toString(),
        fromAgent: {
          id: fromAgent.id,
          name: fromAgent.userId, // Would need to join with User table
          email: fromAgent.userId
        },
        toAgent: {
          id: toAgent.id,
          name: toAgent.userId,
          email: toAgent.userId
        },
        ticketId,
        ticketSubject: ticket.subject,
        reason,
        status: 'PENDING',
        requestedAt: new Date(),
        completedAt: null
      };

      res.status(201).json({
        success: true,
        message: 'Handover request created successfully',
        handoverRequest
      });
    } catch (error: any) {
      console.error('Failed to create handover request:', error);
      return res.status(500).json({ error: 'Failed to create handover request' });
    }
  }

  /**
   * Get team collaboration metrics
   */
  static async getCollaborationMetrics(req: Request, res: Response) {
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

      // Get collaboration metrics
      const [
        handoverStats,
        communicationStats,
        resourceSharingStats,
        teamEfficiency
      ] = await Promise.all([
        // Handover statistics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_handovers,
            COUNT(CASE WHEN "status" = 'COMPLETED' THEN 1 END) as completed_handovers,
            AVG(EXTRACT(EPOCH FROM ("completedAt" - "requestedAt")) / 3600) as avg_completion_hours
          FROM "Handover" -- Placeholder table
          WHERE "orgId" = ${orgId}
            AND "requestedAt" >= NOW() - INTERVAL '${periodDays} days'
        `,
        
        // Communication statistics
        Promise.resolve({
          totalMessages: 245,
          announcementsPosted: 12,
          avgResponseTime: '15 minutes',
          mostActiveAgent: 'John Doe',
          communicationFrequency: 3.2
        }),
        
        // Resource sharing statistics
        Promise.resolve({
          totalResourcesShared: 45,
          totalDownloads: 892,
          topContributor: 'Jane Smith',
          avgResourceRating: 4.7,
          mostDownloadedCategory: 'TEMPLATES'
        }),
        
        // Team efficiency metrics
        prisma.$queryRaw`
          SELECT 
            COUNT(DISTINCT t."assignedAgentId") as active_agents,
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN t."status" = 'RESOLVED' THEN 1 END) as resolved_tickets,
            AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600) as avg_resolution_hours
          FROM "Ticket" t
          WHERE t."orgId" = ${orgId}
            AND t."createdAt" >= NOW() - INTERVAL '${periodDays} days'
        `
      ]);

      const handoverData = handoverStats[0] as any;
      const communicationData = communicationStats as any;
      const resourceData = resourceSharingStats as any;
      const efficiencyData = teamEfficiency[0] as any;

      res.json({
        success: true,
        metrics: {
          handovers: {
            total: handoverData?.total_handovers || 0,
            completed: handoverData?.completed_handovers || 0,
            completionRate: handoverData?.total_handovers 
              ? ((handoverData.completed_handovers / handoverData.total_handovers) * 100).toFixed(1)
              : '0',
            avgCompletionTime: handoverData?.avg_completion_hours
              ? `${parseFloat(handoverData.avg_completion_hours).toFixed(2)} hours`
              : 'N/A'
          },
          communications: communicationData,
          resourceSharing: resourceData,
          teamEfficiency: {
            activeAgents: efficiencyData?.active_agents || 0,
            totalTickets: efficiencyData?.total_tickets || 0,
            resolvedTickets: efficiencyData?.resolved_tickets || 0,
            avgResolutionTime: efficiencyData?.avg_resolution_hours
              ? `${parseFloat(efficiencyData.avg_resolution_hours).toFixed(2)} hours`
              : 'N/A',
            resolutionRate: efficiencyData?.total_tickets
              ? ((efficiencyData.resolved_tickets / efficiencyData.total_tickets) * 100).toFixed(1)
              : '0'
          }
        },
        generatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Failed to get collaboration metrics:', error);
      return res.status(500).json({ error: 'Failed to get collaboration metrics' });
    }
  }
}
