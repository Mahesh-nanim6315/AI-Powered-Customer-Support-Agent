import { apiClient } from '../lib/api-client';
import type { Ticket, TicketMessage, CreateTicketRequest } from '../types';

export const ticketsService = {
    async getAll(): Promise<Ticket[]> {
        return apiClient.get<Ticket[]>('/tickets');
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

    async addMessage(ticketId: string, content: string, role: string = 'AGENT'): Promise<TicketMessage> {
        return apiClient.post<TicketMessage>(`/tickets/${ticketId}/messages`, {
            content,
            role,
        });
    },

    async search(query: string): Promise<Ticket[]> {
        return apiClient.get<Ticket[]>(`/tickets?search=${encodeURIComponent(query)}`);
    },
};
