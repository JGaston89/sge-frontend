import { apiClient } from './client';
import type { Inscripcion, PreviewMasiva, ResultadoMasiva } from '../shared/types/inscripciones.types';

export interface CreateInscripcionDto {
  alumno_id: string;
  curso_id: string;
  ciclo_lectivo: number;
  estado?: 'regular' | 'libre';
  fecha_inscripcion?: string;
  observaciones?: string;
}

export interface InscripcionMasivaDto {
  curso_id_origen: string;
  curso_id_destino: string;
  ciclo_origen: number;
  ciclo_destino: number;
  alumno_ids?: string[];
}

export interface AsignarMasivoDto {
  curso_id: string;
  ciclo_lectivo: number;
  alumno_ids: string[];
  estado?: 'regular' | 'libre';
  observaciones?: string;
}

export interface ResultadoAsignar {
  inscriptos: number;
  errores: Array<{ alumno_id: string; mensaje: string }>;
  total: number;
}

export const inscripcionesApi = {
  listar: (cursoId: string, cicloLectivo: number): Promise<Inscripcion[]> =>
    apiClient
      .get('/inscripciones', { params: { curso_id: cursoId, ciclo_lectivo: cicloLectivo } })
      .then((r) => r.data.data),

  listarPorAlumno: (alumnoId: string): Promise<Inscripcion[]> =>
    apiClient.get(`/alumnos/${alumnoId}/inscripciones`).then((r) => r.data.data),

  crear: (dto: CreateInscripcionDto): Promise<Inscripcion> =>
    apiClient.post('/inscripciones', dto).then((r) => r.data.data),

  getAlumnosDisponibles: (cicloLectivo: number): Promise<any[]> =>
    apiClient.get('/inscripciones/alumnos-disponibles', { params: { ciclo_lectivo: cicloLectivo } }).then((r) => r.data.data),

  asignarMasivo: (dto: AsignarMasivoDto): Promise<ResultadoAsignar> =>
    apiClient.post('/inscripciones/asignar-masivo', dto).then((r) => r.data.data),

  previewMasiva: (dto: InscripcionMasivaDto): Promise<PreviewMasiva> =>
    apiClient.post('/inscripciones/masiva/preview', dto).then((r) => r.data.data),

  ejecutarMasiva: (dto: InscripcionMasivaDto): Promise<ResultadoMasiva> =>
    apiClient.post('/inscripciones/masiva', dto).then((r) => r.data.data),

  cambiarEstado: (id: string, estado: 'regular' | 'libre' | 'baja'): Promise<Inscripcion> =>
    apiClient.patch(`/inscripciones/${id}/estado`, { estado }).then((r) => r.data.data),
};
