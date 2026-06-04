export type EstadoAlumno = 'activo' | 'baja' | 'egresado';
export type AccesoEstado = 'SIN_CUENTA' | 'PENDIENTE' | 'ACTIVADO';
export type TipoDocumento = 'DNI' | 'CI' | 'Pasaporte' | 'Otro';
export type RelacionTutor =
  | 'padre' | 'madre' | 'abuelo' | 'abuela'
  | 'tio' | 'tia' | 'tutor_legal' | 'hermano' | 'hermana' | 'otro';

// ── Tutor / responsable ───────────────────────────────────────────

export interface Tutor {
  id: string;
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  email: string | null;
  telefono: string | null;
  telefono_laboral: string | null;
  domicilio_calle: string | null;
  domicilio_numero: string | null;
  domicilio_piso: string | null;
  domicilio_torre: string | null;
  domicilio_depto: string | null;
  localidad: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  pais: string;
  nacionalidad: string | null;
  observaciones: string | null;
  // Campos de la relación alumno↔tutor
  relacion: RelacionTutor;
  es_contacto_emergencia: boolean;
  es_responsable_economico: boolean;
  vive_con_alumno: boolean;
  orden: number;
  alumno_tutor_id: string;
}

export interface CreateTutorDto {
  nombre: string;
  apellido: string;
  tipo_documento?: TipoDocumento;
  numero_documento: string;
  email?: string;
  telefono?: string;
  telefono_laboral?: string;
  domicilio_calle?: string;
  domicilio_numero?: string;
  domicilio_piso?: string;
  domicilio_torre?: string;
  domicilio_depto?: string;
  localidad?: string;
  provincia?: string;
  codigo_postal?: string;
  pais?: string;
  nacionalidad?: string;
  observaciones?: string;
}

export interface LinkTutorDto {
  relacion: RelacionTutor;
  es_contacto_emergencia?: boolean;
  es_responsable_economico?: boolean;
  vive_con_alumno?: boolean;
  orden?: number;
}

// ── Alumno ────────────────────────────────────────────────────────

export interface Alumno {
  id: string;
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string;
  genero: string | null;
  nacionalidad: string | null;
  // Domicilio estructurado
  domicilio_calle: string | null;
  domicilio_numero: string | null;
  domicilio_piso: string | null;
  domicilio_torre: string | null;
  domicilio_depto: string | null;
  localidad: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  estado: EstadoAlumno;
  fecha_baja: string | null;
  motivo_baja: string | null;
  institucion_id: string;
  created_at: string;
  updated_at: string;
  usuario_id: string | null;
  acceso_estado: AccesoEstado;
  ultimo_envio_activacion: string | null;
  ultimo_acceso: string | null;
}

export interface CreateAlumnoDto {
  nombre: string;
  apellido: string;
  dni: string;
  email?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: 'masculino' | 'femenino' | 'otro' | 'no_especificado';
  nacionalidad?: string;
  domicilio_calle?: string;
  domicilio_numero?: string;
  domicilio_piso?: string;
  domicilio_torre?: string;
  domicilio_depto?: string;
  localidad?: string;
  provincia?: string;
  codigo_postal?: string;
}

export interface UpdateAlumnoDto {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  nacionalidad?: string;
  domicilio_calle?: string;
  domicilio_numero?: string;
  domicilio_piso?: string;
  domicilio_torre?: string;
  domicilio_depto?: string;
  localidad?: string;
  provincia?: string;
  codigo_postal?: string;
}

export interface BajaAlumnoDto {
  motivo: string;
  fecha_baja: string;
}

export interface QueryAlumnosDto {
  q?: string;
  cursor?: string;
  limit?: number;
  estado?: EstadoAlumno;
  nombre?: string;
  dni?: string;
  curso_id?: string;
}

export interface AlumnoEnRiesgo {
  id: string;
  nombre: string;
  apellido: string;
  numero_legajo: string;
  estado_inscripcion: 'regular' | 'libre';
  curso_nombre: string;
  promedio_general: number | null;
  materias_en_riesgo: number;
  materias_con_notas: number;
}

export interface HistorialItem {
  id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string;
  usuario: string;
  created_at: string;
}
