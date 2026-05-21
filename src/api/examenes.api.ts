import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';
import type {
  MesaExamen, MesaDetalle, InscripcionExamen,
  CreateMesaDto, NotaItemDto,
} from '../shared/types/examenes.types';

export const examenesApi = {
  // ── Mesas ───────────────────────────────────────────────────
  getMesas: (params?: { ciclo_id?: string; materia_id?: string; estado?: string; curso_id?: string }): Promise<MesaExamen[]> =>
    apiClient.get<ApiResponse<MesaExamen[]>>('/examenes/mesas', { params }).then((r) => r.data.data),

  getMesa: (id: string): Promise<MesaDetalle> =>
    apiClient.get<ApiResponse<MesaDetalle>>(`/examenes/mesas/${id}`).then((r) => r.data.data),

  createMesa: (dto: CreateMesaDto): Promise<MesaExamen> =>
    apiClient.post<ApiResponse<MesaExamen>>('/examenes/mesas', dto).then((r) => r.data.data),

  // ── Inscripciones ────────────────────────────────────────────
  inscribir: (mesaId: string, alumno_id: string): Promise<InscripcionExamen> =>
    apiClient.post<ApiResponse<InscripcionExamen>>(`/examenes/mesas/${mesaId}/inscribir`, { alumno_id }).then((r) => r.data.data),

  desinscribir: (inscripcionId: string): Promise<void> =>
    apiClient.delete(`/examenes/inscripciones/${inscripcionId}`).then(() => undefined),

  // ── Notas ────────────────────────────────────────────────────
  cargarNotas: (mesaId: string, items: NotaItemDto[]): Promise<InscripcionExamen[]> =>
    apiClient.put<ApiResponse<InscripcionExamen[]>>(`/examenes/mesas/${mesaId}/notas`, { items }).then((r) => r.data.data),

  // ── Acta ─────────────────────────────────────────────────────
  cerrarMesa: (mesaId: string): Promise<MesaExamen> =>
    apiClient.post<ApiResponse<MesaExamen>>(`/examenes/mesas/${mesaId}/acta/cerrar`).then((r) => r.data.data),

  getActaUrl: (mesaId: string): string =>
    `${apiClient.defaults.baseURL}/examenes/mesas/${mesaId}/acta`,
};
