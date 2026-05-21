import { apiClient } from './client';
import type { LoginDto, LoginResponse, AuthTokens } from '../shared/types/auth.types';
import type { ApiResponse } from '../shared/types/api.types';

export const authApi = {
  getInstituciones: (): Promise<Array<{ id: string; nombre: string }>> =>
    apiClient.get('/auth/instituciones').then((r) => r.data.data),

  login: (dto: LoginDto) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', dto).then((r) => r.data.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<ApiResponse<AuthTokens>>('/auth/refresh', { refresh_token: refreshToken })
      .then((r) => r.data.data),

  logout: () =>
    apiClient.post('/auth/logout', {
      refresh_token: localStorage.getItem('refresh_token') ?? '',
    }),

  me: () =>
    apiClient.get('/auth/me').then((r) => r.data.data),

  activate: (token: string, password: string): Promise<{ message: string }> =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/activate', { token, password }).then((r) => r.data.data),

  resendActivation: (id: string): Promise<{ message: string }> =>
    apiClient.post<ApiResponse<{ message: string }>>(`/auth/resend-activation/${id}`).then((r) => r.data.data),

  adminReset: (id: string): Promise<{ message: string }> =>
    apiClient.post<ApiResponse<{ message: string }>>(`/auth/admin-reset/${id}`).then((r) => r.data.data),
};
