export type EstadoPlanificacion = 'borrador' | 'enviada' | 'aprobada';

export const ESTADO_PLANIFICACION_LABEL: Record<EstadoPlanificacion, string> = {
  borrador: 'Borrador',
  enviada:  'Enviada',
  aprobada: 'Aprobada',
};

export const ESTADO_PLANIFICACION_COLORS: Record<EstadoPlanificacion, React.CSSProperties> = {
  borrador: { background: '#f1f5f9', color: '#475569' },
  enviada:  { background: '#dbeafe', color: '#1d4ed8' },
  aprobada: { background: '#dcfce7', color: '#15803d' },
};

export interface UnidadTematica {
  titulo: string;
  descripcion?: string;
}

export interface Planificacion {
  id: string;
  institucion_id: string;
  materia_id: string;
  materia_nombre: string;
  curso_id: string;
  curso_nombre: string;
  ciclo_lectivo: number;
  docente_id: string | null;
  docente_nombre: string | null;
  estado: EstadoPlanificacion;
  objetivos: string | null;
  contenidos: UnidadTematica[];
  metodologia: string | null;
  criterios_evaluacion: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanificacionDto {
  materia_id: string;
  curso_id: string;
  ciclo_lectivo: number;
  docente_id?: string;
  objetivos?: string;
  contenidos?: UnidadTematica[];
  metodologia?: string;
  criterios_evaluacion?: string;
  observaciones?: string;
}

export interface UpdatePlanificacionDto {
  estado?: EstadoPlanificacion;
  docente_id?: string;
  objetivos?: string;
  contenidos?: UnidadTematica[];
  metodologia?: string;
  criterios_evaluacion?: string;
  observaciones?: string;
}

export interface ClaseDictada {
  id: string;
  planificacion_id: string;
  docente_id: string | null;
  docente_nombre: string | null;
  fecha: string;
  contenidos_trabajados: string;
  observaciones: string | null;
  created_at: string;
}

export interface PlanificacionAvance {
  id: string;
  ciclo_lectivo: number;
  estado: EstadoPlanificacion;
  materia_nombre: string;
  curso_nombre: string;
  total_contenidos: number;
  clases_dictadas: number;
  porcentaje_avance: number;
}

export interface CreateClaseDictadaDto {
  planificacion_id: string;
  docente_id?: string;
  fecha: string;
  contenidos_trabajados: string;
  observaciones?: string;
}
