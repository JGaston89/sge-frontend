import { apiClient } from './client';
import type {
  Alumno,
  CreateAlumnoDto,
  UpdateAlumnoDto,
  BajaAlumnoDto,
  QueryAlumnosDto,
  HistorialItem,
  AlumnoEnRiesgo,
} from '../shared/types/alumnos.types';
import type { ApiResponse, PaginatedResponse } from '../shared/types/api.types';

// El backend devuelve 'numero_legajo'; normalizamos a 'legajo' para el frontend
function normalizeAlumno(raw: Record<string, unknown>): Alumno {
  return { ...raw, legajo: (raw.legajo ?? raw.numero_legajo) as string } as Alumno;
}

export const alumnosApi = {
  list: (params?: QueryAlumnosDto) =>
    apiClient
      .get<ApiResponse<PaginatedResponse<Record<string, unknown>>>>('/alumnos', { params })
      .then((r) => ({
        ...r.data.data,
        items: r.data.data.items.map(normalizeAlumno),
      })),

  getById: (id: string) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>(`/alumnos/${id}`)
      .then((r) => normalizeAlumno(r.data.data)),

  create: (dto: CreateAlumnoDto) =>
    apiClient.post<ApiResponse<Alumno>>('/alumnos', dto).then((r) => r.data.data),

  update: (id: string, dto: UpdateAlumnoDto) =>
    apiClient.patch<ApiResponse<Alumno>>(`/alumnos/${id}`, dto).then((r) => r.data.data),

  baja: (id: string, dto: BajaAlumnoDto) =>
    apiClient.post<ApiResponse<Alumno>>(`/alumnos/${id}/baja`, dto).then((r) => r.data.data),

  historial: (id: string) =>
    apiClient
      .get<ApiResponse<HistorialItem[]>>(`/alumnos/${id}/historial`)
      .then((r) => r.data.data),

  getRiesgo: (ciclo?: number): Promise<AlumnoEnRiesgo[]> =>
    apiClient
      .get<ApiResponse<AlumnoEnRiesgo[]>>('/alumnos/riesgo', { params: ciclo ? { ciclo } : {} })
      .then((r) => r.data.data),
};
