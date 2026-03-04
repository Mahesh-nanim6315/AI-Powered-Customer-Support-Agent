import { apiClient } from '../lib/api-client';
import type { LoginRequest, LoginResponse, RegisterRequest, AuthUser } from '../types';

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

    setToken(token: string) {
        apiClient.setToken(token);
    },

    clearToken() {
        apiClient.clearToken();
    },
};
