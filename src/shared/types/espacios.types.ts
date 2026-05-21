export type TipoEspacio       = 'aula' | 'laboratorio' | 'sum' | 'biblioteca' | 'patio' | 'otro';
export type EstadoEspacio     = 'disponible' | 'mantenimiento' | 'inhabilitado';
export type EstadoReservaEsp  = 'confirmada' | 'cancelada';
export type PrioridadMant     = 'baja' | 'media' | 'alta';
export type EstadoMant        = 'pendiente' | 'en_proceso' | 'resuelto';

export interface Espacio {
  id: string;
  nombre: string;
  tipo: TipoEspacio;
  capacidad: number | null;
  equipamiento: string[];
  estado: EstadoEspacio;
  piso: string | null;
  descripcion: string | null;
  created_at: string;
}

export interface ReservaEspacio {
  id: string;
  espacio_id: string;
  espacio_nombre: string;
  espacio_tipo: TipoEspacio;
  capacidad: number | null;
  nombre_evento: string | null;
  motivo: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoReservaEsp;
  created_by: string;
  created_at: string;
}

export interface Mantenimiento {
  id: string;
  espacio_id: string | null;
  espacio_nombre: string | null;
  descripcion_problema: string;
  descripcion_equipo: string | null;
  prioridad: PrioridadMant;
  estado: EstadoMant;
  reported_by: string;
  resolved_at: string | null;
  created_at: string;
}

export interface CreateEspacioDto {
  nombre: string;
  tipo: TipoEspacio;
  capacidad?: number;
  piso?: string;
  descripcion?: string;
  equipamiento?: string[];
}

export interface CreateReservaEspacioDto {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  nombre_evento?: string;
  motivo?: string;
}

export interface CreateMantenimientoDto {
  espacio_id?: string;
  descripcion_problema: string;
  descripcion_equipo?: string;
  prioridad: PrioridadMant;
}

export const TIPO_ESPACIO_LABEL: Record<TipoEspacio, string> = {
  aula:        'Aula',
  laboratorio: 'Laboratorio',
  sum:         'SUM',
  biblioteca:  'Biblioteca',
  patio:       'Patio',
  otro:        'Otro',
};

export const PRIORIDAD_COLOR: Record<PrioridadMant, React.CSSProperties> = {
  alta:  { background: '#fee2e2', color: '#b91c1c' },
  media: { background: '#fef9c3', color: '#854d0e' },
  baja:  { background: '#f1f5f9', color: '#475569' },
};

export const ESTADO_MANT_COLOR: Record<EstadoMant, React.CSSProperties> = {
  pendiente:  { background: '#fef9c3', color: '#854d0e' },
  en_proceso: { background: '#dbeafe', color: '#1d4ed8' },
  resuelto:   { background: '#dcfce7', color: '#15803d' },
};
