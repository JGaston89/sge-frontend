import { apiClient } from './client';
import type { AlumnoDocumento } from '../shared/types/documentos.types';

export const documentosApi = {
  listar: (alumnoId: string): Promise<AlumnoDocumento[]> =>
    apiClient.get(`/alumnos/${alumnoId}/documentos`).then((r) => r.data.data),

  subir: (alumnoId: string, file: File, tipoDocumento: string): Promise<AlumnoDocumento> => {
    const form = new FormData();
    form.append('file', file);
    form.append('tipo_documento', tipoDocumento);
    return apiClient
      .post(`/alumnos/${alumnoId}/documentos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  eliminar: (alumnoId: string, docId: string): Promise<void> =>
    apiClient.delete(`/alumnos/${alumnoId}/documentos/${docId}`).then(() => undefined),
};
