import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';

export type OrigenPersona = 'sistema' | 'docente' | 'alumno' | 'administrativo';
export type AccesoEstado = 'SIN_CUENTA' | 'PENDIENTE' | 'ACTIVADO';
export type TipoEntidad = 'alumno' | 'docente' | 'administrativo' | 'sistema';

export interface PersonaUnificada {
  id: string;
  persona_id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  origen: OrigenPersona;
  tiene_cuenta: boolean;
  activo: boolean | null;
  cuenta_activada: boolean;
  roles: string[];
  ultimo_acceso: string | null;
  ultimo_envio_activacion: string | null;
}

export interface UsuarioSistema {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  cuenta_activada: boolean;
  roles: string[];
  ultimo_acceso: string | null;
  ultimo_envio_activacion: string | null;
  created_at: string;
}

export interface PendienteActivacion {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  created_at: string;
  ultimo_envio_activacion: string | null;
  activation_token_expires_at: string | null;
  tipo_entidad: TipoEntidad;
}

export interface CreateUsuarioDto {
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
}

export interface CreateFromPersonaDto {
  personaId: string;
  origen: OrigenPersona;
  rol: string;
}

export interface UpdateUsuarioDto {
  nombre?: string;
  apellido?: string;
  activo?: boolean;
  rol?: string;
}

export const usuariosApi = {
  getAll: (): Promise<PersonaUnificada[]> =>
    apiClient.get<ApiResponse<PersonaUnificada[]>>('/usuarios').then(r => r.data.data),

  getSistema: (): Promise<UsuarioSistema[]> =>
    apiClient.get<ApiResponse<UsuarioSistema[]>>('/usuarios/sistema').then(r => r.data.data),

  getPendientes: (): Promise<PendienteActivacion[]> =>
    apiClient.get<ApiResponse<PendienteActivacion[]>>('/usuarios/pendientes').then(r => r.data.data),

  cancelarPendiente: (id: string): Promise<void> =>
    apiClient.delete(`/usuarios/${id}/pendiente`).then(() => undefined),

  create: (dto: CreateUsuarioDto): Promise<UsuarioSistema> =>
    apiClient.post<ApiResponse<UsuarioSistema>>('/usuarios', dto).then(r => r.data.data),

  createFromPersona: (dto: CreateFromPersonaDto): Promise<UsuarioSistema> =>
    apiClient.post<ApiResponse<UsuarioSistema>>('/usuarios/from-persona', dto).then(r => r.data.data),

  update: (id: string, dto: UpdateUsuarioDto): Promise<UsuarioSistema> =>
    apiClient.patch<ApiResponse<UsuarioSistema>>(`/usuarios/${id}`, dto).then(r => r.data.data),
};
