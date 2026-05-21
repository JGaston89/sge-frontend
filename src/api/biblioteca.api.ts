import { apiClient } from './client';
import type { ApiResponse } from '../shared/types/api.types';
import type {
  MaterialEstudio, MaterialesResponse, ArchivoEstudio,
  CreateMaterialEstudioDto, UpdateMaterialEstudioDto,
} from '../shared/types/biblioteca.types';

export const bibliotecaApi = {
  getMateriales: (params?: {
    search?: string;
    docente_id?: string;
    curso_id?: string;
    materia_id?: string;
    page?: number;
  }): Promise<MaterialesResponse> =>
    apiClient.get<ApiResponse<MaterialesResponse>>('/biblioteca', { params }).then((r) => r.data.data),

  getMaterial: (id: string): Promise<MaterialEstudio> =>
    apiClient.get<ApiResponse<MaterialEstudio>>(`/biblioteca/${id}`).then((r) => r.data.data),

  createMaterial: (dto: CreateMaterialEstudioDto): Promise<MaterialEstudio> =>
    apiClient.post<ApiResponse<MaterialEstudio>>('/biblioteca', dto).then((r) => r.data.data),

  updateMaterial: (id: string, dto: UpdateMaterialEstudioDto): Promise<MaterialEstudio> =>
    apiClient.patch<ApiResponse<MaterialEstudio>>(`/biblioteca/${id}`, dto).then((r) => r.data.data),

  deleteMaterial: (id: string): Promise<void> =>
    apiClient.delete(`/biblioteca/${id}`).then(() => undefined),

  uploadArchivo: (materialId: string, file: File, titulo?: string): Promise<ArchivoEstudio> => {
    const form = new FormData();
    form.append('file', file);
    const params = titulo ? { titulo } : undefined;
    return apiClient
      .post<ApiResponse<ArchivoEstudio>>(`/biblioteca/${materialId}/archivos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params,
      })
      .then((r) => r.data.data);
  },

  getArchivoUrl: (archivoId: string): Promise<{ url: string }> =>
    apiClient.get<ApiResponse<{ url: string }>>(`/biblioteca/archivos/${archivoId}/url`).then((r) => r.data.data),

  deleteArchivo: (archivoId: string): Promise<void> =>
    apiClient.delete(`/biblioteca/archivos/${archivoId}`).then(() => undefined),
};
