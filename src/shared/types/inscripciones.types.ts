export type EstadoInscripcion = 'regular' | 'libre' | 'baja';

export interface Inscripcion {
  id: string;
  alumno_id: string;
  curso_id: string;
  ciclo_lectivo: number;
  estado: EstadoInscripcion;
  fecha_inscripcion: string;
  observaciones: string | null;
  creado_por: string;
  created_at: string;
  updated_at: string;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
  curso_nombre: string;
}

export interface PreviewMasiva {
  total: number;
  a_inscribir: number;
  ya_inscriptos: number;
  alumnos: Array<{
    alumno_id: string;
    alumno_nombre: string;
    alumno_legajo: string;
    ya_inscripto: boolean;
  }>;
}

export interface ResultadoMasiva {
  inscriptos: number;
  ya_existian: number;
  total_proceso: number;
}

export const ESTADO_COLORS: Record<EstadoInscripcion, React.CSSProperties> = {
  regular: { background: '#dcfce7', color: '#15803d' },
  libre:   { background: '#fef9c3', color: '#854d0e' },
  baja:    { background: '#fee2e2', color: '#b91c1c' },
};
