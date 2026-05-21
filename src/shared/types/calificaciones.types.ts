export interface Materia {
  id: string;
  nombre: string;
  codigo: string | null;
}

export interface Curso {
  id: string;
  nombre: string;
  anio_academico: number;
  nivel: string | null;
  turno: string | null;
  materia_ids: string[];
}

export interface AlumnoByCurso {
  id: string;
  nombre: string;
  apellido: string;
  numero_legajo: string;
}

export type TipoCalificacion = 'nota' | 'parcial' | 'final' | 'recuperatorio' | 'concepto';

export interface Calificacion {
  id: string;
  acta_id: string;
  alumno_id: string;
  tipo: TipoCalificacion;
  nota_valor: string;
  nota_numerica: string | null;
  observaciones: string | null;
  cargado_por: string;
  created_at: string;
  updated_at: string;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
}

export interface Acta {
  id: string;
  institucion_id: string;
  curso_id: string;
  materia_id: string;
  periodo: string;
  anio_academico: number;
  estado: 'borrador' | 'cerrada';
  cerrada_por: string | null;
  cerrada_at: string | null;
  creado_por: string;
  created_at: string;
  updated_at: string;
  curso_nombre: string;
  materia_nombre: string;
  creado_por_nombre: string;
  promedio_general: string | null;
  calificaciones: Calificacion[];
}

export interface BulkCalificacionesDto {
  curso_id: string;
  materia_id: string;
  periodo: string;
  anio_academico?: number;
  calificaciones: Array<{
    alumno_id: string;
    tipo?: TipoCalificacion;
    nota_valor: string;
    observaciones?: string;
  }>;
}

export interface QueryCalificacionesParams {
  curso_id: string;
  materia_id: string;
  periodo: string;
  anio_academico?: number;
}

export interface CalificacionAlumno {
  acta_id: string;
  curso_id: string;
  curso_nombre: string;
  materia_id: string;
  materia_nombre: string;
  periodo: string;
  anio_academico: number;
  estado_acta: string;
  tipo: string;
  nota_valor: string;
  nota_numerica: string | null;
  observaciones: string | null;
  created_at: string;
}
