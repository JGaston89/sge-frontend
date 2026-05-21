import { apiClient } from './client';
import type {
  LegajoDocente,
  Asignacion,
  CreateDocenteDto,
  UpdateDocenteDto,
  CreateAsignacionDto,
} from '../shared/types/docentes.types';
import type { ApiResponse } from '../shared/types/api.types';

export const docentesApi = {
  // ── Legajos ──────────────────────────────────────────────────
  getAll: (params?: { estado?: string; search?: string }): Promise<LegajoDocente[]> =>
    apiClient.get<ApiResponse<LegajoDocente[]>>('/docentes', { params }).then((r) => r.data.data),

  getOne: (id: string): Promise<LegajoDocente> =>
    apiClient.get<ApiResponse<LegajoDocente>>(`/docentes/${id}`).then((r) => r.data.data),

  create: (dto: CreateDocenteDto): Promise<LegajoDocente> =>
    apiClient.post<ApiResponse<LegajoDocente>>('/docentes', dto).then((r) => r.data.data),

  update: (id: string, dto: UpdateDocenteDto): Promise<LegajoDocente> =>
    apiClient.patch<ApiResponse<LegajoDocente>>(`/docentes/${id}`, dto).then((r) => r.data.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/docentes/${id}`).then(() => undefined),

  // ── Asignaciones ─────────────────────────────────────────────
  getAsignaciones: (params?: {
    docente_id?: string;
    materia_id?: string;
    curso_id?: string;
    ciclo_lectivo?: number;
  }): Promise<Asignacion[]> =>
    apiClient
      .get<ApiResponse<Asignacion[]>>('/docentes/asignaciones/list', { params })
      .then((r) => r.data.data),

  createAsignacion: (dto: CreateAsignacionDto): Promise<Asignacion> =>
    apiClient
      .post<ApiResponse<Asignacion>>('/docentes/asignaciones', dto)
      .then((r) => r.data.data),

  removeAsignacion: (id: string): Promise<void> =>
    apiClient.delete(`/docentes/asignaciones/${id}`).then(() => undefined),
};
