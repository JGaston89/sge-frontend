import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';

export type AccesoEstado = 'SIN_CUENTA' | 'PENDIENTE' | 'ACTIVADO';

export interface StaffAdministrativo {
  id: string;
  institucion_id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  fecha_ingreso: string | null;
  estado: 'activo' | 'inactivo';
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  // ── Acceso al sistema ─────────────────────────────────────
  acceso_estado: AccesoEstado;
  ultimo_envio_activacion: string | null;
  ultimo_acceso: string | null;
}

export interface CreateAdministrativoDto {
  nombre: string;
  apellido: string;
  dni?: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  fecha_ingreso?: string;
  observaciones?: string;
}

export interface UpdateAdministrativoDto {
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  fecha_ingreso?: string | null;
  estado?: 'activo' | 'inactivo';
  observaciones?: string;
}

export const administrativosApi = {
  getAll: (params?: { search?: string; estado?: string }): Promise<StaffAdministrativo[]> =>
    apiClient
      .get<ApiResponse<StaffAdministrativo[]>>('/administrativos', { params })
      .then(r => r.data.data),

  getOne: (id: string): Promise<StaffAdministrativo> =>
    apiClient
      .get<ApiResponse<StaffAdministrativo>>(`/administrativos/${id}`)
      .then(r => r.data.data),

  create: (dto: CreateAdministrativoDto): Promise<StaffAdministrativo> =>
    apiClient
      .post<ApiResponse<StaffAdministrativo>>('/administrativos', dto)
      .then(r => r.data.data),

  update: (id: string, dto: UpdateAdministrativoDto): Promise<StaffAdministrativo> =>
    apiClient
      .patch<ApiResponse<StaffAdministrativo>>(`/administrativos/${id}`, dto)
      .then(r => r.data.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/administrativos/${id}`).then(() => undefined),
};
