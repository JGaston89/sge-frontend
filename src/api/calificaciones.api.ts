import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';
import type {
  Acta,
  Curso,
  Materia,
  AlumnoByCurso,
  BulkCalificacionesDto,
  QueryCalificacionesParams,
  CalificacionAlumno,
} from '../shared/types/calificaciones.types';

export const calificacionesApi = {
  getCursos: () =>
    apiClient.get<ApiResponse<Curso[]>>('/calificaciones/cursos').then((r) => r.data.data),

  getMaterias: () =>
    apiClient.get<ApiResponse<Materia[]>>('/calificaciones/materias').then((r) => r.data.data),

  getAlumnosByCurso: (cursoId: string) =>
    apiClient
      .get<ApiResponse<AlumnoByCurso[]>>(`/calificaciones/cursos/${cursoId}/alumnos`)
      .then((r) => r.data.data),

  getActa: (params: QueryCalificacionesParams) =>
    apiClient.get<ApiResponse<Acta>>('/calificaciones', { params }).then((r) => r.data.data),

  cargarBulk: (dto: BulkCalificacionesDto) =>
    apiClient
      .post<ApiResponse<{ acta_id: string; total: number }>>('/calificaciones/bulk', dto)
      .then((r) => r.data.data),

  cerrar: (actaId: string, observaciones?: string) =>
    apiClient
      .patch<ApiResponse<Acta>>(`/calificaciones/${actaId}/cerrar`, { observaciones })
      .then((r) => r.data.data),

  rectificar: (actaId: string) =>
    apiClient
      .patch<ApiResponse<Acta>>(`/calificaciones/${actaId}/rectificar`)
      .then((r) => r.data.data),

  getCalificacionesAlumno: (alumnoId: string) =>
    apiClient
      .get<ApiResponse<CalificacionAlumno[]>>(`/alumnos/${alumnoId}/calificaciones`)
      .then((r) => r.data.data),
};
