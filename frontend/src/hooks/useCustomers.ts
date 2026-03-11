import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { customersService } from '../services/customer.service';
import type { Customer, CreateCustomerRequest } from '../types';

export function useCustomers(enabled = true): UseQueryResult<Customer[]> {
    return useQuery({
        queryKey: ['customers'],
        queryFn: () => customersService.getAll(),
        enabled,
    });
}

export function useCustomer(id: string): UseQueryResult<Customer> {
    return useQuery({
        queryKey: ['customers', id],
        queryFn: () => customersService.getById(id),
        enabled: !!id,
    });
}

export function useCreateCustomer(): UseMutationResult<Customer, Error, CreateCustomerRequest> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => customersService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
}

export function useUpdateCustomer(): UseMutationResult<Customer, Error, { id: string; data: Partial<CreateCustomerRequest> }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => customersService.update(id, data),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customers', result.id] });
        },
    });
}

export function useDeleteCustomer(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => customersService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
}

export function useSearchCustomers(query: string) {
    return useQuery({
        queryKey: ['customers', 'search', query],
        queryFn: () => customersService.search(query),
        enabled: query.length > 2,
    });
}
