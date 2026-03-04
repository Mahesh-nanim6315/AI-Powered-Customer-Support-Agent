import { apiClient } from '../lib/api-client';
import type { DashboardAnalytics, TicketAnalytics } from '../types';

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
};
