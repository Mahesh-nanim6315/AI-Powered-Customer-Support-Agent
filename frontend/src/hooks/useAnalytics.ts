import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type { DashboardAnalytics, AdminAnalyticsOverview, TicketTrends, AgentPerformance } from '../types';

export function useDashboardAnalytics(enabled = true): UseQueryResult<DashboardAnalytics> {
    return useQuery({
        queryKey: ['analytics', 'dashboard'],
        queryFn: () => analyticsService.getDashboardAnalytics(),
        refetchInterval: 30000, // Refetch every 30 seconds
        enabled,
    });
}

export function useAdminAnalytics(enabled = true): UseQueryResult<AdminAnalyticsOverview> {
    return useQuery({
        queryKey: ['analytics', 'admin', 'overview'],
        queryFn: () => analyticsService.getAdminOverview(),
        refetchInterval: 30000, // Refetch every 30 seconds
        enabled,
    });
}

export function useTicketTrends(days: number = 30, enabled = true): UseQueryResult<TicketTrends> {
    return useQuery({
        queryKey: ['analytics', 'admin', 'ticket-trends', days],
        queryFn: () => analyticsService.getTicketTrends(days),
        refetchInterval: 60000, // Refetch every minute
        enabled,
    });
}

export function useAgentPerformance(enabled = true): UseQueryResult<AgentPerformance[]> {
    return useQuery({
        queryKey: ['analytics', 'admin', 'agent-performance'],
        queryFn: () => analyticsService.getAgentPerformance(),
        refetchInterval: 60000, // Refetch every minute
        enabled,
    });
}

export function useMetrics(dateFrom?: string, dateTo?: string) {
    return useQuery({
        queryKey: ['analytics', 'metrics', dateFrom, dateTo],
        queryFn: () => analyticsService.getMetrics(dateFrom, dateTo),
    });
}
