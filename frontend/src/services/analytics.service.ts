import { apiClient } from '../lib/api-client';
import type { DashboardAnalytics, TicketAnalytics, AdminAnalyticsOverview, TicketTrends, AgentPerformance, AnalyticsOperationalInsights } from '../types';

export const analyticsService = {
    async getDashboardAnalytics(): Promise<DashboardAnalytics> {
        return apiClient.get<DashboardAnalytics>('/analytics/dashboard');
    },

    async getTicketAnalytics(ticketId: string): Promise<TicketAnalytics> {
        return apiClient.get<TicketAnalytics>(`/analytics/tickets/${ticketId}`);
    },

    async getMetrics(dateFrom?: string, dateTo?: string): Promise<any> {
        const params = new URLSearchParams();
        if (dateFrom) params.append('from', dateFrom);
        if (dateTo) params.append('to', dateTo);
        return apiClient.get(`/analytics/metrics?${params.toString()}`);
    },

    // Admin analytics endpoints
    async getAdminOverview(): Promise<AdminAnalyticsOverview> {
        return apiClient.get<AdminAnalyticsOverview>('/analytics/admin/overview');
    },

    async getTicketTrends(days: number = 30): Promise<TicketTrends> {
        return apiClient.get<TicketTrends>(`/analytics/admin/ticket-trends?days=${days}`);
    },

    async getAgentPerformance(): Promise<AgentPerformance[]> {
        return apiClient.get<AgentPerformance[]>('/analytics/admin/agent-performance');
    },

    async getOperationalInsights(): Promise<AnalyticsOperationalInsights> {
        return apiClient.get<AnalyticsOperationalInsights>('/analytics/admin/operational-insights');
    },
};
