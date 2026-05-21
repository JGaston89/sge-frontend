import React from 'react';

export type NivelRiesgo = 'alto' | 'medio' | 'bajo' | 'sin_datos';

export interface AlertaAlumno {
  alumno_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
  materias_evaluadas: number;
  total_notas: number;
  promedio_general: number | null;
  materias_desaprobadas: number;
  notas_bajo_minimo: number;
  nivel_riesgo: NivelRiesgo;
  motivos: string[];
}

export interface AlertaAlumnoConCurso extends AlertaAlumno {
  curso_id: string;
  curso_nombre: string;
}

export interface ResumenAlertas {
  total: number;
  alto: number;
  medio: number;
  bajo: number;
  sin_datos: number;
}

export interface AlertasByCursoResponse {
  resumen: ResumenAlertas;
  alumnos: AlertaAlumno[];
}

export const NIVEL_RIESGO_STYLES: Record<NivelRiesgo, React.CSSProperties> = {
  alto:      { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
  medio:     { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' },
  bajo:      { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' },
  sin_datos: { background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' },
};

export const NIVEL_RIESGO_LABEL: Record<NivelRiesgo, string> = {
  alto:      'Riesgo alto',
  medio:     'Riesgo medio',
  bajo:      'Sin riesgo',
  sin_datos: 'Sin datos',
};
