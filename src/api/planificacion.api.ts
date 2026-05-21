import { apiClient } from './client';
import type {
  Planificacion,
  CreatePlanificacionDto,
  UpdatePlanificacionDto,
  ClaseDictada,
  PlanificacionAvance,
  CreateClaseDictadaDto,
} from '../shared/types/planificacion.types';
import type { ApiResponse } from '../shared/types/api.types';

export const planificacionApi = {
  getAll: (params?: {
    ciclo_lectivo?: number;
    curso_id?: string;
    materia_id?: string;
    estado?: string;
  }): Promise<Planificacion[]> =>
    apiClient
      .get<ApiResponse<Planificacion[]>>('/planificacion', { params })
      .then((r) => r.data.data),

  getOne: (id: string): Promise<Planificacion> =>
    apiClient
      .get<ApiResponse<Planificacion>>(`/planificacion/${id}`)
      .then((r) => r.data.data),

  create: (dto: CreatePlanificacionDto): Promise<Planificacion> =>
    apiClient
      .post<ApiResponse<Planificacion>>('/planificacion', dto)
      .then((r) => r.data.data),

  update: (id: string, dto: UpdatePlanificacionDto): Promise<Planificacion> =>
    apiClient
      .patch<ApiResponse<Planificacion>>(`/planificacion/${id}`, dto)
      .then((r) => r.data.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/planificacion/${id}`).then(() => undefined),

  aprobar: (id: string): Promise<Planificacion> =>
    apiClient.patch<ApiResponse<Planificacion>>(`/planificacion/${id}/aprobar`).then((r) => r.data.data),

  getAvance: (params?: { materia_id?: string; ciclo_lectivo?: number }): Promise<PlanificacionAvance[]> =>
    apiClient.get<ApiResponse<PlanificacionAvance[]>>('/planificacion/avance', { params }).then((r) => r.data.data),

  createClase: (dto: CreateClaseDictadaDto): Promise<ClaseDictada> =>
    apiClient.post<ApiResponse<ClaseDictada>>('/planificacion/clases', dto).then((r) => r.data.data),

  getClases: (id: string): Promise<ClaseDictada[]> =>
    apiClient.get<ApiResponse<ClaseDictada[]>>(`/planificacion/${id}/clases`).then((r) => r.data.data),

  getPdfUrl: (id: string): string =>
    `${apiClient.defaults.baseURL}/planificacion/${id}/pdf`,
};
