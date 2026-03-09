import { apiClient } from '../lib/api-client';
import type { Agent } from '../types';

export const agentsService = {
    async getAll(): Promise<Agent[]> {
        return apiClient.get<Agent[]>('/agents');
    },

    async getById(id: string): Promise<Agent> {
        return apiClient.get<Agent>(`/agents/${id}`);
    },

    async getActive(): Promise<Agent[]> {
        return apiClient.get<Agent[]>('/agents?status=active');
    },

    async create(data: { email: string; password?: string; specialization?: string }): Promise<Agent> {
        return apiClient.post<Agent>('/agents', data);
    },

    async update(id: string, data: { email?: string; password?: string; specialization?: string }): Promise<Agent> {
        return apiClient.patch<Agent>(`/agents/${id}`, data);
    },

    async delete(id: string): Promise<{ success: boolean }> {
        return apiClient.delete<{ success: boolean }>(`/agents/${id}`);
    },

    async updateStatus(id: string, busyStatus: boolean): Promise<Agent> {
        return apiClient.patch<Agent>(`/agents/${id}`, { busyStatus });
    },

    async updateSpecialization(id: string, specialization: string): Promise<Agent> {
        return apiClient.patch<Agent>(`/agents/${id}`, { specialization });
    },
};
