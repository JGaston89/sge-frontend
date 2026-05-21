import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calificacionesApi } from '../../../api/calificaciones.api';
import type { BulkCalificacionesDto, QueryCalificacionesParams } from '../../../shared/types/calificaciones.types';

const KEYS = {
  cursos: ['calificaciones', 'cursos'] as const,
  materias: ['calificaciones', 'materias'] as const,
  alumnosByCurso: (cursoId: string) => ['calificaciones', 'cursos', cursoId, 'alumnos'] as const,
  acta: (params: QueryCalificacionesParams) => ['calificaciones', 'acta', params] as const,
  alumno: (alumnoId: string) => ['calificaciones', 'alumno', alumnoId] as const,
};

export function useCursos() {
  return useQuery({ queryKey: KEYS.cursos, queryFn: calificacionesApi.getCursos });
}

export function useMaterias() {
  return useQuery({ queryKey: KEYS.materias, queryFn: calificacionesApi.getMaterias });
}

export function useAlumnosByCurso(cursoId: string) {
  return useQuery({
    queryKey: KEYS.alumnosByCurso(cursoId),
    queryFn: () => calificacionesApi.getAlumnosByCurso(cursoId),
    enabled: !!cursoId,
  });
}

export function useActa(params: QueryCalificacionesParams | null) {
  return useQuery({
    queryKey: params ? KEYS.acta(params) : ['calificaciones', 'acta', 'none'],
    queryFn: () => calificacionesApi.getActa(params!),
    enabled: !!params,
    retry: false,
  });
}

export function useCargarBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: BulkCalificacionesDto) => calificacionesApi.cargarBulk(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calificaciones'] }),
  });
}

export function useCerrarActa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actaId, observaciones }: { actaId: string; observaciones?: string }) =>
      calificacionesApi.cerrar(actaId, observaciones),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calificaciones'] }),
  });
}

export function useRectificarActa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actaId: string) => calificacionesApi.rectificar(actaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calificaciones'] }),
  });
}

export function useCalificacionesAlumno(alumnoId: string) {
  return useQuery({
    queryKey: KEYS.alumno(alumnoId),
    queryFn: () => calificacionesApi.getCalificacionesAlumno(alumnoId),
    enabled: !!alumnoId,
  });
}
