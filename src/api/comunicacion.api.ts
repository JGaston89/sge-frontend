import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';
import type { Circular, CreateCircularDto, UpdateCircularDto } from '../shared/types/comunicacion.types';

export const comunicacionApi = {
  // ── Circulares ────────────────────────────────────────────────
  getCirculares: (): Promise<Circular[]> =>
    apiClient.get<ApiResponse<Circular[]>>('/comunicacion/circulares').then((r) => r.data.data),

  getCircularById: (id: string): Promise<Circular> =>
    apiClient.get<ApiResponse<Circular>>(`/comunicacion/circulares/${id}`).then((r) => r.data.data),

  createCircular: (dto: CreateCircularDto): Promise<Circular> =>
    apiClient.post<ApiResponse<Circular>>('/comunicacion/circulares', dto).then((r) => r.data.data),

  updateCircular: (id: string, dto: UpdateCircularDto): Promise<Circular> =>
    apiClient.patch<ApiResponse<Circular>>(`/comunicacion/circulares/${id}`, dto).then((r) => r.data.data),

  deleteCircular: (id: string): Promise<{ message: string }> =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/comunicacion/circulares/${id}`).then((r) => r.data.data),
};
