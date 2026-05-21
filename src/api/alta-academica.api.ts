import { apiClient } from './client';
import type { Curso, Materia, Periodo, CicloLectivo } from '../shared/types/alta-academica.types';

const base = '/alta-academica';

export const altaAcademicaApi = {
  // ── Cursos ────────────────────────────────────────────────
  getCursos: (): Promise<Curso[]> =>
    apiClient.get(`${base}/cursos`).then((r) => r.data.data),

  createCurso: (data: { nombre: string; anio_academico: number; nivel?: string; turno?: string; materia_ids?: string[] }): Promise<Curso> =>
    apiClient.post(`${base}/cursos`, data).then((r) => r.data.data),

  updateCurso: (id: string, data: { nombre?: string; anio_academico?: number; nivel?: string | null; turno?: string | null; materia_ids?: string[] }): Promise<Curso> =>
    apiClient.patch(`${base}/cursos/${id}`, data).then((r) => r.data.data),

  toggleCurso: (id: string): Promise<void> =>
    apiClient.delete(`${base}/cursos/${id}`).then((r) => r.data.data),

  // ── Materias ──────────────────────────────────────────────
  getMaterias: (): Promise<Materia[]> =>
    apiClient.get(`${base}/materias`).then((r) => r.data.data),

  createMateria: (data: { nombre: string; codigo?: string }): Promise<Materia> =>
    apiClient.post(`${base}/materias`, data).then((r) => r.data.data),

  updateMateria: (id: string, data: { nombre?: string; codigo?: string | null }): Promise<Materia> =>
    apiClient.patch(`${base}/materias/${id}`, data).then((r) => r.data.data),

  toggleMateria: (id: string): Promise<void> =>
    apiClient.delete(`${base}/materias/${id}`).then((r) => r.data.data),

  // ── Periodos ──────────────────────────────────────────────
  getPeriodos: (): Promise<Periodo[]> =>
    apiClient.get(`${base}/periodos`).then((r) => r.data.data),

  createPeriodo: (nombre: string): Promise<Periodo> =>
    apiClient.post(`${base}/periodos`, { nombre }).then((r) => r.data.data),

  updatePeriodo: (id: string, nombre: string): Promise<Periodo> =>
    apiClient.patch(`${base}/periodos/${id}`, { nombre }).then((r) => r.data.data),

  togglePeriodo: (id: string): Promise<void> =>
    apiClient.delete(`${base}/periodos/${id}`).then((r) => r.data.data),

  // ── Ciclos Lectivos ───────────────────────────────────────
  getCiclos: (): Promise<CicloLectivo[]> =>
    apiClient.get(`${base}/ciclos`).then((r) => r.data.data),

  createCiclo: (anio: number): Promise<CicloLectivo> =>
    apiClient.post(`${base}/ciclos`, { anio }).then((r) => r.data.data),

  updateCiclo: (id: string, data: { anio?: number; nombre?: string }): Promise<CicloLectivo> =>
    apiClient.patch(`${base}/ciclos/${id}`, data).then((r) => r.data.data),

  toggleCiclo: (id: string): Promise<void> =>
    apiClient.delete(`${base}/ciclos/${id}`).then((r) => r.data.data),
};
