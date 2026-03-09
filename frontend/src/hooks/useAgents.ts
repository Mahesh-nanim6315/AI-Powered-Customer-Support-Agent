import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { agentsService } from '../services/agent.service';
import type { Agent } from '../types';

export function useAgents(): UseQueryResult<Agent[]> {
    return useQuery({
        queryKey: ['agents'],
        queryFn: () => agentsService.getAll(),
    });
}

export function useAgent(id: string): UseQueryResult<Agent> {
    return useQuery({
        queryKey: ['agents', id],
        queryFn: () => agentsService.getById(id),
        enabled: !!id,
    });
}

export function useActiveAgents(): UseQueryResult<Agent[]> {
    return useQuery({
        queryKey: ['agents', 'active'],
        queryFn: () => agentsService.getActive(),
    });
}

export function useUpdateAgentStatus(): UseMutationResult<Agent, Error, { id: string; busyStatus: boolean }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, busyStatus }) => agentsService.updateStatus(id, busyStatus),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            queryClient.invalidateQueries({ queryKey: ['agents', data.id] });
        },
    });
}

export function useUpdateAgentSpecialization(): UseMutationResult<Agent, Error, { id: string; specialization: string }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, specialization }) => agentsService.updateSpecialization(id, specialization),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            queryClient.invalidateQueries({ queryKey: ['agents', data.id] });
        },
    });
}

export function useCreateAgent(): UseMutationResult<Agent, Error, { email: string; password?: string; specialization?: string }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => agentsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
        },
    });
}

export function useUpdateAgent(): UseMutationResult<Agent, Error, { id: string; email?: string; password?: string; specialization?: string }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...data }) => agentsService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            queryClient.invalidateQueries({ queryKey: ['agents', data.id] });
        },
    });
}

export function useDeleteAgent(): UseMutationResult<{ success: boolean }, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => agentsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
        },
    });
}

