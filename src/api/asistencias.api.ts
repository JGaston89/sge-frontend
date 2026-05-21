import { apiClient } from './client';
import type {
  Asistencia,
  AsistenciaResumenAlumno,
  ClaseFecha,
  RegistrarAsistenciaDto,
} from '../shared/types/asistencias.types';
import type { ApiResponse } from '../shared/types/api.types';

export const asistenciasApi = {
  registrar: (dto: RegistrarAsistenciaDto): Promise<Asistencia[]> =>
    apiClient.post<ApiResponse<Asistencia[]>>('/asistencias', dto).then((r) => r.data.data),

  getByClase: (curso_id: string, materia_id: string, fecha: string): Promise<Asistencia[]> =>
    apiClient
      .get<ApiResponse<Asistencia[]>>('/asistencias', { params: { curso_id, materia_id, fecha } })
      .then((r) => r.data.data),

  getResumen: (curso_id: string, materia_id: string, ciclo?: number): Promise<AsistenciaResumenAlumno[]> =>
    apiClient
      .get<ApiResponse<AsistenciaResumenAlumno[]>>('/asistencias/resumen', {
        params: { curso_id, materia_id, ciclo },
      })
      .then((r) => r.data.data),

  getFechas: (curso_id: string, materia_id: string, ciclo?: number): Promise<ClaseFecha[]> =>
    apiClient
      .get<ApiResponse<ClaseFecha[]>>('/asistencias/fechas', {
        params: { curso_id, materia_id, ciclo },
      })
      .then((r) => r.data.data),

  getByAlumno: (alumno_id: string, ciclo?: number, materia_id?: string): Promise<Asistencia[]> =>
    apiClient
      .get<ApiResponse<Asistencia[]>>(`/asistencias/alumno/${alumno_id}`, {
        params: { ciclo, materia_id },
      })
      .then((r) => r.data.data),

  updateOne: (id: string, estado: string, observaciones?: string): Promise<Asistencia> =>
    apiClient
      .patch<ApiResponse<Asistencia>>(`/asistencias/${id}`, { estado, observaciones })
      .then((r) => r.data.data),
};
