import axios from 'axios';
import { apiClient } from './client';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

// Cliente sin JWT para rutas públicas
const publicClient = axios.create({ baseURL: BASE_URL, timeout: 10_000 });

export interface PerfilInstitucional {
  id: string;
  nombre: string;
  tipo: string;
  domicilio: string | null;
  logo_url: string | null;
  banner_url: string | null;
  motto: string | null;
  descripcion: string | null;
  email_contacto: string | null;
  telefono_contacto: string | null;
  sitio_web: string | null;
  color_primario: string;
  color_secundario: string;
  redes_sociales: Record<string, string>;
}

export interface NoticiaArchivo {
  nombre: string;
  url: string;
  s3_key: string;
  mime_type: string;
  tamano_bytes: number;
}

export interface NoticiaCard {
  id: string;
  titulo: string;
  slug: string;
  resumen: string | null;
  imagen_url: string | null;
  categoria: string;
  destacada: boolean;
  publicado_en: string;
  autor_nombre: string | null;
  autor_apellido: string | null;
}

export interface NoticiaDetalle extends NoticiaCard {
  contenido: string;
  publicada: boolean;
  archivos: NoticiaArchivo[];
  created_at: string;
  updated_at: string;
}

// ── Endpoints públicos ────────────────────────────────────────────────────────

export const portalApi = {
  getInfo: (institucionId: string) =>
    publicClient.get<{ data: PerfilInstitucional }>(`/portal/${institucionId}/info`)
      .then(r => r.data.data),

  getNoticias: (institucionId: string, params?: { categoria?: string; destacada?: boolean; q?: string }) =>
    publicClient.get<{ data: NoticiaCard[] }>(`/portal/${institucionId}/noticias`, { params })
      .then(r => r.data.data),

  getNoticia: (institucionId: string, slug: string) =>
    publicClient.get<{ data: NoticiaDetalle }>(`/portal/${institucionId}/noticias/${slug}`)
      .then(r => r.data.data),
};

// ── Endpoints admin (requieren JWT) ──────────────────────────────────────────

export const portalAdminApi = {
  getInfo: () =>
    apiClient.get<{ data: PerfilInstitucional }>('/portal/admin/info').then(r => r.data.data),

  updateInfo: (dto: Partial<PerfilInstitucional>) =>
    apiClient.patch<{ data: PerfilInstitucional }>('/portal/admin/info', dto).then(r => r.data.data),

  uploadFile: (file: File, onProgress?: (pct: number) => void): Promise<NoticiaArchivo> => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<{ data: NoticiaArchivo }>('/portal/admin/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then(r => r.data.data).catch(err => {
      const raw = err?.response?.data?.message ?? err?.message ?? 'Error al subir el archivo';
      const msg = Array.isArray(raw) ? raw[0] : raw;
      throw new Error(msg);
    });
  },

  getNoticias: () =>
    apiClient.get<{ data: NoticiaDetalle[] }>('/portal/admin/noticias').then(r => r.data.data),

  getNoticia: (id: string) =>
    apiClient.get<{ data: NoticiaDetalle }>(`/portal/admin/noticias/${id}`).then(r => r.data.data),

  createNoticia: (dto: Partial<NoticiaDetalle>) =>
    apiClient.post<{ data: NoticiaDetalle }>('/portal/admin/noticias', dto).then(r => r.data.data),

  updateNoticia: (id: string, dto: Partial<NoticiaDetalle>) =>
    apiClient.patch<{ data: NoticiaDetalle }>(`/portal/admin/noticias/${id}`, dto).then(r => r.data.data),

  deleteNoticia: (id: string) =>
    apiClient.delete(`/portal/admin/noticias/${id}`),
};
