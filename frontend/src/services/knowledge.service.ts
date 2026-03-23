import { apiClient } from '../lib/api-client';
import type { KnowledgeBase, CreateKnowledgeRequest, UploadKnowledgeRequest, UploadKnowledgeResponse } from '../types';

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

    async uploadDocument(data: UploadKnowledgeRequest): Promise<UploadKnowledgeResponse> {
        const formData = new FormData();
        formData.append('file', data.file);
        if (data.title?.trim()) {
            formData.append('title', data.title.trim());
        }
        if (data.category?.trim()) {
            formData.append('category', data.category.trim());
        }

        return apiClient.postForm<UploadKnowledgeResponse>('/knowledge/upload', formData);
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
