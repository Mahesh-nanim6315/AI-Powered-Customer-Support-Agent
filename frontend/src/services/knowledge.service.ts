import { apiClient } from '../lib/api-client';
import type { KnowledgeBase, CreateKnowledgeRequest } from '../types';

export const knowledgeService = {
    async getAll(): Promise<KnowledgeBase[]> {
        return apiClient.get<KnowledgeBase[]>('/knowledge');
    },

    async getById(id: string): Promise<KnowledgeBase> {
        return apiClient.get<KnowledgeBase>(`/knowledge/${id}`);
    },

    async create(data: CreateKnowledgeRequest): Promise<KnowledgeBase> {
        return apiClient.post<KnowledgeBase>('/knowledge', data);
    },

    async update(id: string, data: Partial<CreateKnowledgeRequest>): Promise<KnowledgeBase> {
        return apiClient.patch<KnowledgeBase>(`/knowledge/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        return apiClient.delete(`/knowledge/${id}`);
    },

    async search(query: string): Promise<KnowledgeBase[]> {
        return apiClient.get<KnowledgeBase[]>(`/knowledge/search?q=${encodeURIComponent(query)}`);
    },
};
