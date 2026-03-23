import { apiClient } from '../lib/api-client';
import type { AiSuggestion } from '../types';

export const aiSuggestionsService = {
    async getAll(): Promise<AiSuggestion[]> {
        return apiClient.get<AiSuggestion[]>('/ai/suggestions');
    },

    async getByTicket(ticketId: string): Promise<AiSuggestion[]> {
        return apiClient.get<AiSuggestion[]>(`/ai/suggestions?ticketId=${ticketId}`);
    },

    async approve(id: string, options?: { execute?: boolean }): Promise<AiSuggestion> {
        return apiClient.post<AiSuggestion>(`/ai/suggestions/${id}/approve`, { execute: options?.execute ?? true });
    },

    async reject(id: string): Promise<AiSuggestion> {
        return apiClient.post<AiSuggestion>(`/ai/suggestions/${id}/reject`);
    },
};
