import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { ticketsService } from '../services/ticket.service';
import type { Ticket, TicketMessage, CreateTicketRequest, TicketStatus } from '../types';
import type { SendMessageResponse } from '../services/ticket.service';

export function useTickets(): UseQueryResult<Ticket[]> {
    return useQuery({
        queryKey: ['tickets'],
        queryFn: () => ticketsService.getAll(),
        staleTime: 1000 * 30,
    });
}

export function useUnassignedTickets(enabled: boolean): UseQueryResult<Ticket[]> {
    return useQuery({
        queryKey: ['tickets', 'unassigned'],
        queryFn: () => ticketsService.getUnassigned(),
        enabled,
        staleTime: 1000 * 15,
    });
}

export function useTicket(id: string): UseQueryResult<Ticket> {
    return useQuery({
        queryKey: ['tickets', id],
        queryFn: () => ticketsService.getById(id),
        enabled: !!id,
        staleTime: 1000 * 15,
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

export function useReopenTicket(): UseMutationResult<Ticket, Error, { id: string }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id }) => ticketsService.reopen(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['tickets', data.id] });
            queryClient.invalidateQueries({ queryKey: ['tickets', data.id, 'assignments'] });
        },
    });
}

export function useUpdateTicket(): UseMutationResult<
    Ticket,
    Error,
    { id: string; data: { subject?: string; description?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' } }
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => ticketsService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['tickets', data.id] });
        },
    });
}

export function useDeleteTicket(): UseMutationResult<{ success: boolean; id: string }, Error, { id: string }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id }) => ticketsService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
}

export function useAddMessage(): UseMutationResult<SendMessageResponse, Error, { ticketId: string; content: string; role?: string }> {
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
