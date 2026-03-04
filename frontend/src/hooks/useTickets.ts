import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { ticketsService } from '../services/ticket.service';
import type { Ticket, TicketMessage, CreateTicketRequest, TicketStatus } from '../types';

export function useTickets(): UseQueryResult<Ticket[]> {
    return useQuery({
        queryKey: ['tickets'],
        queryFn: () => ticketsService.getAll(),
    });
}

export function useTicket(id: string): UseQueryResult<Ticket> {
    return useQuery({
        queryKey: ['tickets', id],
        queryFn: () => ticketsService.getById(id),
        enabled: !!id,
    });
}

export function useCreateTicket(): UseMutationResult<Ticket, Error, CreateTicketRequest> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => ticketsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
}

export function useUpdateTicketStatus(): UseMutationResult<Ticket, Error, { id: string; status: TicketStatus }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }) => ticketsService.updateStatus(id, status),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['tickets', data.id] });
        },
    });
}

export function useAddMessage(): UseMutationResult<TicketMessage, Error, { ticketId: string; content: string; role?: string }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ ticketId, content, role }) => ticketsService.addMessage(ticketId, content, role),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tickets', variables.ticketId] });
        },
    });
}

export function useSearchTickets(query: string) {
    return useQuery({
        queryKey: ['tickets', 'search', query],
        queryFn: () => ticketsService.search(query),
        enabled: query.length > 2,
    });
}
