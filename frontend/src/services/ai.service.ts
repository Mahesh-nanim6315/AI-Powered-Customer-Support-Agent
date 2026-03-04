import { apiClient } from '../lib/api-client';
import type { AiSuggestion } from '../types';

export const aiSuggestionsService = {
    async getAll(): Promise<AiSuggestion[]> {
        return apiClient.get<AiSuggestion[]>('/ai/suggestions');
    },

    async getById(id: string): Promise<AiSuggestion> {
        return apiClient.get<AiSuggestion>(`/ai/suggestions/${id}`);
    },

    async getByTicket(ticketId: string): Promise<AiSuggestion[]> {
        return apiClient.get<AiSuggestion[]>(`/ai/suggestions?ticketId=${ticketId}`);
    },

    async approve(id: string): Promise<AiSuggestion> {
        return apiClient.patch<AiSuggestion>(`/ai/suggestions/${id}`, { status: 'APPROVED' });
    },

    async reject(id: string): Promise<AiSuggestion> {
        return apiClient.patch<AiSuggestion>(`/ai/suggestions/${id}`, { status: 'REJECTED' });
    },
};
