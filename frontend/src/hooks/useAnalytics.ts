import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type { DashboardAnalytics } from '../types';

export function useDashboardAnalytics(): UseQueryResult<DashboardAnalytics> {
    return useQuery({
        queryKey: ['analytics', 'dashboard'],
        queryFn: () => analyticsService.getDashboardAnalytics(),
        refetchInterval: 30000, // Refetch every 30 seconds
    });
}

export function useMetrics(dateFrom?: string, dateTo?: string) {
    return useQuery({
        queryKey: ['analytics', 'metrics', dateFrom, dateTo],
        queryFn: () => analyticsService.getMetrics(dateFrom, dateTo),
    });
}
