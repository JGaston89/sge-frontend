import { apiClient } from './client';
import type {
  Alumno, CreateAlumnoDto, UpdateAlumnoDto, BajaAlumnoDto,
  QueryAlumnosDto, HistorialItem, AlumnoEnRiesgo,
  Tutor, CreateTutorDto, LinkTutorDto,
} from '../shared/types/alumnos.types';
import type { ApiResponse, PaginatedResponse } from '../shared/types/api.types';

function normalizeAlumno(raw: Record<string, unknown>): Alumno {
  return { ...raw, legajo: (raw.legajo ?? raw.numero_legajo) as string } as Alumno;
}

export const alumnosApi = {
  list: (params?: QueryAlumnosDto) =>
    apiClient
      .get<ApiResponse<PaginatedResponse<Record<string, unknown>>>>('/alumnos', { params })
      .then((r) => ({ ...r.data.data, items: r.data.data.items.map(normalizeAlumno) })),

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
    apiClient.get<ApiResponse<HistorialItem[]>>(`/alumnos/${id}/historial`).then((r) => r.data.data),

  getRiesgo: (ciclo?: number): Promise<AlumnoEnRiesgo[]> =>
    apiClient
      .get<ApiResponse<AlumnoEnRiesgo[]>>('/alumnos/riesgo', { params: ciclo ? { ciclo } : {} })
      .then((r) => r.data.data),

  // ── Tutores ─────────────────────────────────────────────────────

  getTutores: (alumnoId: string): Promise<Tutor[]> =>
    apiClient.get<ApiResponse<Tutor[]>>(`/alumnos/${alumnoId}/tutores`).then((r) => r.data.data),

  buscarTutor: (tipoDocumento: string, numeroDocumento: string): Promise<Tutor | null> =>
    apiClient
      .get<ApiResponse<Tutor | null>>('/alumnos/tutores/buscar', {
        params: { tipo_documento: tipoDocumento, numero_documento: numeroDocumento },
      })
      .then((r) => r.data.data)
      .catch(() => null),

  addTutor: (alumnoId: string, body: { tutor_id?: string; tutor?: CreateTutorDto; relacion: LinkTutorDto }): Promise<Tutor[]> =>
    apiClient.post<ApiResponse<Tutor[]>>(`/alumnos/${alumnoId}/tutores`, body).then((r) => r.data.data),

  updateTutorDatos: (alumnoId: string, tutorId: string, dto: Partial<CreateTutorDto>): Promise<Tutor> =>
    apiClient.patch<ApiResponse<Tutor>>(`/alumnos/${alumnoId}/tutores/${tutorId}/datos`, dto).then((r) => r.data.data),

  updateRelacion: (alumnoId: string, tutorId: string, dto: Partial<LinkTutorDto>): Promise<Tutor[]> =>
    apiClient.patch<ApiResponse<Tutor[]>>(`/alumnos/${alumnoId}/tutores/${tutorId}/relacion`, dto).then((r) => r.data.data),

  removeTutor: (alumnoId: string, tutorId: string): Promise<void> =>
    apiClient.delete(`/alumnos/${alumnoId}/tutores/${tutorId}`).then(() => undefined),
};
