import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import type { LoginRequest, LoginResponse, RegisterRequest, AuthUser } from '../types';

export function useLogin(): UseMutationResult<LoginResponse, Error, LoginRequest> {
    return useMutation({
        mutationFn: (credentials) => authService.login(credentials),
    });
}

export function useRegister(): UseMutationResult<LoginResponse, Error, RegisterRequest> {
    return useMutation({
        mutationFn: (data) => authService.register(data),
    });
}

export function useAuthLogout() {
    return () => {
        authService.clearToken();
    };
}
