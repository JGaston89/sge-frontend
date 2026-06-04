import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alumnosApi } from '../../../api/alumnos.api';
import type {
  QueryAlumnosDto, CreateAlumnoDto, UpdateAlumnoDto, BajaAlumnoDto,
  CreateTutorDto, LinkTutorDto,
} from '../../../shared/types/alumnos.types';

const KEYS = {
  list:     (params?: QueryAlumnosDto) => ['alumnos', params] as const,
  detail:   (id: string)              => ['alumnos', id] as const,
  historial:(id: string)              => ['alumnos', id, 'historial'] as const,
  tutores:  (id: string)              => ['alumnos', id, 'tutores'] as const,
};

export function useAlumnosList(params?: QueryAlumnosDto) {
  return useQuery({ queryKey: KEYS.list(params), queryFn: () => alumnosApi.list(params) });
}

export function useAlumno(id: string) {
  return useQuery({ queryKey: KEYS.detail(id), queryFn: () => alumnosApi.getById(id), enabled: !!id });
}

export function useAlumnoHistorial(id: string) {
  return useQuery({ queryKey: KEYS.historial(id), queryFn: () => alumnosApi.historial(id), enabled: !!id });
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

// ── Tutores ──────────────────────────────────────────────────────

export function useTutores(alumnoId: string) {
  return useQuery({
    queryKey: KEYS.tutores(alumnoId),
    queryFn: () => alumnosApi.getTutores(alumnoId),
    enabled: !!alumnoId,
  });
}

export function useAddTutor(alumnoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { tutor_id?: string; tutor?: CreateTutorDto; relacion: LinkTutorDto }) =>
      alumnosApi.addTutor(alumnoId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tutores(alumnoId) }),
  });
}

export function useUpdateTutorDatos(alumnoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tutorId, dto }: { tutorId: string; dto: Partial<CreateTutorDto> }) =>
      alumnosApi.updateTutorDatos(alumnoId, tutorId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tutores(alumnoId) }),
  });
}

export function useUpdateRelacion(alumnoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tutorId, dto }: { tutorId: string; dto: Partial<LinkTutorDto> }) =>
      alumnosApi.updateRelacion(alumnoId, tutorId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tutores(alumnoId) }),
  });
}

export function useRemoveTutor(alumnoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tutorId: string) => alumnosApi.removeTutor(alumnoId, tutorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tutores(alumnoId) }),
  });
}
