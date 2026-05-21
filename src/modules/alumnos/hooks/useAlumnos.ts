import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alumnosApi } from '../../../api/alumnos.api';
import type { QueryAlumnosDto, CreateAlumnoDto, UpdateAlumnoDto, BajaAlumnoDto } from '../../../shared/types/alumnos.types';

const KEYS = {
  list: (params?: QueryAlumnosDto) => ['alumnos', params] as const,
  detail: (id: string) => ['alumnos', id] as const,
  historial: (id: string) => ['alumnos', id, 'historial'] as const,
};

export function useAlumnosList(params?: QueryAlumnosDto) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => alumnosApi.list(params),
  });
}

export function useAlumno(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => alumnosApi.getById(id),
    enabled: !!id,
  });
}

export function useAlumnoHistorial(id: string) {
  return useQuery({
    queryKey: KEYS.historial(id),
    queryFn: () => alumnosApi.historial(id),
    enabled: !!id,
  });
}

export function useCreateAlumno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAlumnoDto) => alumnosApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  });
}

export function useUpdateAlumno(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateAlumnoDto) => alumnosApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  });
}

export function useBajaAlumno(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: BajaAlumnoDto) => alumnosApi.baja(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumnos'] }),
  });
}
