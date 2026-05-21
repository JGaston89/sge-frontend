import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';
import type {
  CicloLectivo, CalendarioEvento,
  CreateCicloDto, CreateEventoDto, ImportarFeriadosDto,
} from '../shared/types/calendario.types';

export const calendarioApi = {
  // ── Ciclos ──────────────────────────────────────────────────
  getCiclos: (): Promise<CicloLectivo[]> =>
    apiClient.get<ApiResponse<CicloLectivo[]>>('/calendario/ciclos').then((r) => r.data.data),

  getCicloActivo: (): Promise<CicloLectivo> =>
    apiClient.get<ApiResponse<CicloLectivo>>('/calendario/ciclos/activo').then((r) => r.data.data),

  createCiclo: (dto: CreateCicloDto): Promise<CicloLectivo> =>
    apiClient.post<ApiResponse<CicloLectivo>>('/calendario/ciclos', dto).then((r) => r.data.data),

  // ── Eventos ─────────────────────────────────────────────────
  getEventos: (params?: { desde?: string; hasta?: string; tipo?: string }): Promise<CalendarioEvento[]> =>
    apiClient.get<ApiResponse<CalendarioEvento[]>>('/calendario/eventos', { params }).then((r) => r.data.data),

  createEvento: (dto: CreateEventoDto): Promise<CalendarioEvento> =>
    apiClient.post<ApiResponse<CalendarioEvento>>('/calendario/eventos', dto).then((r) => r.data.data),

  importarFeriados: (dto: ImportarFeriadosDto): Promise<{ anio: number; total: number; insertados: number }> =>
    apiClient.post<ApiResponse<{ anio: number; total: number; insertados: number }>>('/calendario/feriados/importar', dto).then((r) => r.data.data),

  getIcalUrl: (): string =>
    `${apiClient.defaults.baseURL}/calendario/eventos/export.ics`,
};
