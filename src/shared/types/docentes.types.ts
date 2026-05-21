export type EstadoDocente = 'activo' | 'inactivo' | 'licencia';
export type AccesoEstado = 'SIN_CUENTA' | 'PENDIENTE' | 'ACTIVADO';

export const ESTADO_DOCENTE_LABEL: Record<EstadoDocente, string> = {
  activo:   'Activo',
  inactivo: 'Inactivo',
  licencia: 'Licencia',
};

export const ESTADO_DOCENTE_COLORS: Record<EstadoDocente, React.CSSProperties> = {
  activo:   { background: '#dcfce7', color: '#15803d' },
  inactivo: { background: '#f1f5f9', color: '#475569' },
  licencia: { background: '#fef9c3', color: '#854d0e' },
};

export interface LegajoDocente {
  id: string;
  institucion_id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  titulo: string | null;
  especialidades: string[];
  fecha_ingreso: string | null;
  estado: EstadoDocente;
  observaciones: string | null;
  total_asignaciones: number;
  created_at: string;
  updated_at: string;
  // ── Acceso al sistema ─────────────────────────────────────
  acceso_estado: AccesoEstado;
  ultimo_envio_activacion: string | null;
  ultimo_acceso: string | null;
}

export interface Asignacion {
  id: string;
  institucion_id: string;
  docente_id: string;
  docente_nombre: string;
  docente_apellido: string;
  materia_id: string;
  materia_nombre: string;
  curso_id: string;
  curso_nombre: string;
  ciclo_lectivo: number;
  horas_semanales: number | null;
  created_at: string;
}

export interface CreateDocenteDto {
  usuario_id?: string;
  nombre: string;
  apellido: string;
  dni?: string;
  email?: string;
  telefono?: string;
  titulo?: string;
  especialidades?: string[];
  fecha_ingreso?: string;
  observaciones?: string;
}

export interface UpdateDocenteDto {
  usuario_id?: string | null;
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string;
  telefono?: string;
  titulo?: string;
  especialidades?: string[];
  fecha_ingreso?: string | null;
  estado?: EstadoDocente;
  observaciones?: string;
}

export interface CreateAsignacionDto {
  docente_id: string;
  materia_id: string;
  curso_id: string;
  ciclo_lectivo: number;
  horas_semanales?: number;
}
