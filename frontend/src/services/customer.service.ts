import { apiClient } from '../lib/api-client';
import type { Customer, CreateCustomerRequest } from '../types';

export const customersService = {
    async getAll(): Promise<Customer[]> {
        return apiClient.get<Customer[]>('/customers');
    },

    async getById(id: string): Promise<Customer> {
        return apiClient.get<Customer>(`/customers/${id}`);
    },

    async create(data: CreateCustomerRequest): Promise<Customer> {
        return apiClient.post<Customer>('/customers', data);
    },

    async update(id: string, data: Partial<CreateCustomerRequest>): Promise<Customer> {
        return apiClient.patch<Customer>(`/customers/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        return apiClient.delete(`/customers/${id}`);
    },

    async search(query: string): Promise<Customer[]> {
        return apiClient.get<Customer[]>(`/customers?search=${encodeURIComponent(query)}`);
    },
};
