import { apiClient } from './client';
import type { AlertasByCursoResponse, AlertaAlumnoConCurso } from '../shared/types/alertas.types';

export const alertasApi = {
  listarPorCurso: (
    cursoId: string,
    cicloLectivo: number,
    periodo?: string,
  ): Promise<AlertasByCursoResponse> =>
    apiClient
      .get('/alertas', { params: { curso_id: cursoId, ciclo_lectivo: cicloLectivo, periodo } })
      .then((r) => r.data.data),

  listarPorAlumno: (
    alumnoId: string,
    cicloLectivo: number,
  ): Promise<AlertaAlumnoConCurso[]> =>
    apiClient
      .get(`/alumnos/${alumnoId}/alertas`, { params: { ciclo_lectivo: cicloLectivo } })
      .then((r) => r.data.data),
};
