import { apiClient } from '../lib/api-client';
import type { Ticket, TicketMessage, CreateTicketRequest } from '../types';

export interface SendMessageResponse {
    success: boolean;
    userMessage: TicketMessage;
    aiMessage?: TicketMessage;
    aiMode?: 'llm' | 'kb_fallback' | 'safe_fallback';
}

export const ticketsService = {
    async getAll(): Promise<Ticket[]> {
        return apiClient.get<Ticket[]>('/tickets');
    },

    async getUnassigned(): Promise<Ticket[]> {
        return apiClient.get<Ticket[]>('/tickets/unassigned');
    },

    async getById(id: string): Promise<Ticket> {
        return apiClient.get<Ticket>(`/tickets/${id}`);
    },

    async create(data: CreateTicketRequest): Promise<Ticket> {
        return apiClient.post<Ticket>('/tickets', data);
    },

    async updateStatus(id: string, status: string): Promise<Ticket> {
        return apiClient.patch<Ticket>(`/tickets/${id}/status`, { status });
    },

    async update(
        id: string,
        data: { subject?: string; description?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }
    ): Promise<Ticket> {
        return apiClient.patch<Ticket>(`/tickets/${id}`, data);
    },

    async remove(id: string): Promise<{ success: boolean; id: string }> {
        return apiClient.delete<{ success: boolean; id: string }>(`/tickets/${id}`);
    },

    async addMessage(ticketId: string, content: string, role: string = 'AGENT'): Promise<SendMessageResponse> {
        return apiClient.post<SendMessageResponse>(`/tickets/${ticketId}/messages`, {
            content,
            role,
        });
    },

    async search(query: string): Promise<Ticket[]> {
        return apiClient.get<Ticket[]>(`/tickets?search=${encodeURIComponent(query)}`);
    },
};
