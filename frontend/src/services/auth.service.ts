import { apiClient } from '../lib/api-client';
import type { LoginRequest, LoginResponse, RegisterRequest, AuthUser, Organization } from '../types';

export const authService = {
    async login(data: LoginRequest): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/login', data);
        if (response.token) {
            apiClient.setToken(response.token);
        }
        return response;
    },

    async register(data: RegisterRequest): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/register', data);
        if (response.token) {
            apiClient.setToken(response.token);
        }
        return response;
    },

    async me(): Promise<{ user: AuthUser; organizations: Organization[] }> {
        return apiClient.get<{ user: AuthUser; organizations: Organization[] }>('/auth/me');
    },

    async switchOrg(orgId: string): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/switch-org', { orgId });
        if (response.token) {
            apiClient.setToken(response.token);
        }
        return response;
    },

    async invite(email: string, role: string = 'AGENT'): Promise<{ success: boolean }> {
        return apiClient.post<{ success: boolean }>('/auth/invite', { email, role });
    },

    async acceptInvite(token: string, password?: string): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/accept-invite', { token, password });
        if (response.token) {
            apiClient.setToken(response.token);
        }
        return response;
    },

    setToken(token: string) {
        apiClient.setToken(token);
    },

    clearToken() {
        apiClient.clearToken();
    },
};
