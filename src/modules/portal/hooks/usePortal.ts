import { useQuery } from '@tanstack/react-query';
import { portalApi } from '../../../api/portal.api';

const INST_ID = import.meta.env.VITE_INSTITUCION_ID as string;

export function usePerfilInstitucional() {
  return useQuery({
    queryKey: ['portal', 'info', INST_ID],
    queryFn: () => portalApi.getInfo(INST_ID),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNoticias(params?: { categoria?: string; q?: string }) {
  return useQuery({
    queryKey: ['portal', 'noticias', INST_ID, params],
    queryFn: () => portalApi.getNoticias(INST_ID, params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useNoticiaDetalle(slug: string) {
  return useQuery({
    queryKey: ['portal', 'noticia', INST_ID, slug],
    queryFn: () => portalApi.getNoticia(INST_ID, slug),
    enabled: !!slug,
  });
}

export { INST_ID };
