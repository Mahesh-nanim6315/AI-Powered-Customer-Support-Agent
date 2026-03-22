import { apiClient } from '../lib/api-client';
import type { Ticket, TicketMessage, CreateTicketRequest, TicketAssignmentHistoryEntry, TicketActivityEntry } from '../types';

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

    async getAssignmentHistory(id: string): Promise<{ success: boolean; history: TicketAssignmentHistoryEntry[] }> {
        return apiClient.get<{ success: boolean; history: TicketAssignmentHistoryEntry[] }>(`/tickets/${id}/assignments`);
    },

    async getActivity(id: string): Promise<{ success: boolean; activity: TicketActivityEntry[] }> {
        return apiClient.get<{ success: boolean; activity: TicketActivityEntry[] }>(`/tickets/${id}/activity`);
    },

    async create(data: CreateTicketRequest): Promise<Ticket> {
        return apiClient.post<Ticket>('/tickets', data);
    },

    async updateStatus(id: string, status: string): Promise<Ticket> {
        return apiClient.patch<Ticket>(`/tickets/${id}/status`, { status });
    },

    async reopen(id: string): Promise<Ticket> {
        return apiClient.post<Ticket>(`/tickets/${id}/reopen`);
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
