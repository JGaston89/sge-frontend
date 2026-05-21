export type EstadoAsistencia = 'presente' | 'ausente' | 'tardanza' | 'justificado';

export const ESTADO_ASISTENCIA_LABEL: Record<EstadoAsistencia, string> = {
  presente:    'Presente',
  ausente:     'Ausente',
  tardanza:    'Tardanza',
  justificado: 'Justificado',
};

export const ESTADO_ASISTENCIA_COLORS: Record<EstadoAsistencia, React.CSSProperties> = {
  presente:    { background: '#dcfce7', color: '#15803d' },
  ausente:     { background: '#fee2e2', color: '#b91c1c' },
  tardanza:    { background: '#fef9c3', color: '#854d0e' },
  justificado: { background: '#dbeafe', color: '#1d4ed8' },
};

export interface Asistencia {
  id: string;
  alumno_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
  materia_id: string;
  curso_id: string;
  ciclo_lectivo: number;
  fecha: string;
  estado: EstadoAsistencia;
  observaciones: string | null;
}

export interface AsistenciaResumenAlumno {
  alumno_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
  total_clases: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  justificados: number;
  porcentaje_asistencia: number;
}

export interface ClaseFecha {
  fecha: string;
  total: number;
  presentes: number;
}

export interface AsistenciaItemDto {
  alumno_id: string;
  estado: EstadoAsistencia;
  observaciones?: string;
}

export interface RegistrarAsistenciaDto {
  curso_id: string;
  materia_id: string;
  fecha: string;
  asistencias: AsistenciaItemDto[];
}
