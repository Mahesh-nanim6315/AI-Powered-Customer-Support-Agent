import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class ApiClient {
    private instance: AxiosInstance;
    private token: string | null = null;

    constructor() {
        this.instance = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.instance.interceptors.request.use((config) => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        });

        this.instance.interceptors.response.use(
            (response) => {
                return response;
            },
            (error: AxiosError<{ message?: string }>) => {
                if (error.response?.status === 401) {
                    this.clearToken();
                    // Only redirect if we're not on the login page already
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                }
                const apiMessage = error.response?.data?.message;
                return Promise.reject(apiMessage ? new Error(apiMessage) : error);
            }
        );
    }

    setToken(token: string) {
        this.token = token;
    }

    clearToken() {
        this.token = null;
    }

    async get<T>(path: string) {
        const response = await this.instance.get<T>(path);
        return response.data;
    }

    async post<T>(path: string, data?: any) {
        const response = await this.instance.post<T>(path, data);
        return response.data;
    }

    async postForm<T>(path: string, data: FormData) {
        const response = await this.instance.post<T>(path, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async patch<T>(path: string, data?: any) {
        const response = await this.instance.patch<T>(path, data);
        return response.data;
    }

    async put<T>(path: string, data?: any) {
        const response = await this.instance.put<T>(path, data);
        return response.data;
    }

    async delete<T>(path: string) {
        const response = await this.instance.delete<T>(path);
        return response.data;
    }
}

export const apiClient = new ApiClient();
