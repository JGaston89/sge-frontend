import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';
import type {
  Espacio, ReservaEspacio, Mantenimiento,
  CreateEspacioDto, CreateReservaEspacioDto, CreateMantenimientoDto,
} from '../shared/types/espacios.types';

export const espaciosApi = {
  // ── Espacios ──────────────────────────────────────────────────
  getEspacios: (params?: { tipo?: string }): Promise<Espacio[]> =>
    apiClient.get<ApiResponse<Espacio[]>>('/espacios', { params }).then((r) => r.data.data),

  createEspacio: (dto: CreateEspacioDto): Promise<Espacio> =>
    apiClient.post<ApiResponse<Espacio>>('/espacios', dto).then((r) => r.data.data),

  updateEstado: (id: string, estado: string): Promise<Espacio> =>
    apiClient.patch<ApiResponse<Espacio>>(`/espacios/${id}/estado`, { estado }).then((r) => r.data.data),

  // ── Disponibilidad ────────────────────────────────────────────
  getDisponibles: (params: { fecha: string; hora_inicio: string; hora_fin: string }): Promise<Espacio[]> =>
    apiClient.get<ApiResponse<Espacio[]>>('/espacios/disponibilidad', { params }).then((r) => r.data.data),

  getOcupacion: (semana: string): Promise<ReservaEspacio[]> =>
    apiClient.get<ApiResponse<ReservaEspacio[]>>('/espacios/ocupacion', { params: { semana } }).then((r) => r.data.data),

  // ── Reservas ─────────────────────────────────────────────────
  createReserva: (espacioId: string, dto: CreateReservaEspacioDto): Promise<ReservaEspacio> =>
    apiClient.post<ApiResponse<ReservaEspacio>>(`/espacios/${espacioId}/reservas`, dto).then((r) => r.data.data),

  getMisReservas: (): Promise<ReservaEspacio[]> =>
    apiClient.get<ApiResponse<ReservaEspacio[]>>('/espacios/mis-reservas').then((r) => r.data.data),

  cancelarReserva: (id: string): Promise<ReservaEspacio> =>
    apiClient.delete<ApiResponse<ReservaEspacio>>(`/espacios/reservas/${id}`).then((r) => r.data.data),

  // ── Mantenimiento ─────────────────────────────────────────────
  getMantenimiento: (params?: { estado?: string }): Promise<Mantenimiento[]> =>
    apiClient.get<ApiResponse<Mantenimiento[]>>('/espacios/mantenimiento', { params }).then((r) => r.data.data),

  createMantenimiento: (dto: CreateMantenimientoDto): Promise<Mantenimiento> =>
    apiClient.post<ApiResponse<Mantenimiento>>('/espacios/mantenimiento', dto).then((r) => r.data.data),

  updateMantenimiento: (id: string, estado: string): Promise<Mantenimiento> =>
    apiClient.patch<ApiResponse<Mantenimiento>>(`/espacios/mantenimiento/${id}`, { estado }).then((r) => r.data.data),
};
