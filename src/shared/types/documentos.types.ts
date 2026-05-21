export interface AlumnoDocumento {
  id: string;
  alumno_id: string;
  tipo_documento: string;
  nombre_archivo: string;
  mime_type: string;
  tamano_bytes: number;
  version: number;
  subido_por: string;
  subido_por_nombre: string;
  activo: boolean;
  created_at: string;
  url: string;
}

export const TIPOS_DOCUMENTO: Array<{ value: string; label: string }> = [
  { value: 'dni',                 label: 'DNI' },
  { value: 'partida_nacimiento',  label: 'Partida de nacimiento' },
  { value: 'libreta_sanitaria',   label: 'Libreta sanitaria' },
  { value: 'certificado_medico',  label: 'Certificado médico' },
  { value: 'foto',                label: 'Foto carnet' },
  { value: 'constancia_domicilio',label: 'Constancia de domicilio' },
  { value: 'vacunas',             label: 'Carnet de vacunación' },
  { value: 'beca',                label: 'Documentación de beca' },
  { value: 'otro',                label: 'Otro' },
];

export function tipoDocumentoLabel(value: string): string {
  return TIPOS_DOCUMENTO.find((t) => t.value === value)?.label ?? value;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
