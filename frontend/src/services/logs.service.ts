import { apiClient } from '../lib/api-client';
import type { LogsResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const logsService = {
  async list(filters?: { limit?: number; level?: string; source?: string; startDate?: string; endDate?: string }): Promise<LogsResponse> {
    const params = new URLSearchParams();
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.level) params.set('level', filters.level);
    if (filters?.source) params.set('source', filters.source);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const query = params.toString();
    return apiClient.get<LogsResponse>(`/logs${query ? `?${query}` : ''}`);
  },

  async downloadCsv(filters?: { limit?: number; level?: string; source?: string; startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.level) params.set('level', filters.level);
    if (filters?.source) params.set('source', filters.source);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const query = params.toString();
    const token = window.localStorage.getItem('chitti_auth_user');
    const parsed = token ? JSON.parse(token) : null;

    const response = await fetch(`${API_BASE_URL}/logs/export${query ? `?${query}` : ''}`, {
      headers: parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {},
    });

    if (!response.ok) {
      throw new Error('Failed to export logs');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const disposition = response.headers.get('content-disposition');
    const filenameMatch = disposition?.match(/filename="([^"]+)"/);
    link.href = url;
    link.download = filenameMatch?.[1] || 'system-logs.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
