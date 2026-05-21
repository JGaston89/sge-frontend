export interface ArchivoEstudio {
  id: string;
  material_id: string;
  nombre_original: string;
  titulo_archivo: string | null;
  s3_key: string;
  s3_bucket: string;
  mime_type: string;
  tamano_bytes: number | null;
  created_at: string;
  url?: string;
}

export interface MaterialEstudio {
  id: string;
  titulo: string;
  docente_id: string | null;
  docente_nombre: string | null;
  curso_id: string | null;
  curso_nombre: string | null;
  materia_id: string | null;
  materia_nombre: string | null;
  temas: string | null;
  descripcion: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archivos: ArchivoEstudio[];
}

export interface MaterialesResponse {
  items: MaterialEstudio[];
  total: number;
  page: number;
  pages: number;
}

export interface CreateMaterialEstudioDto {
  titulo: string;
  docente_id?: string;
  curso_id?: string;
  materia_id?: string;
  temas?: string;
  descripcion?: string;
}

export type UpdateMaterialEstudioDto = Partial<CreateMaterialEstudioDto>;
