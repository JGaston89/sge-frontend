export type EstadoAlumno = 'activo' | 'baja' | 'egresado';
export type AccesoEstado = 'SIN_CUENTA' | 'PENDIENTE' | 'ACTIVADO';

export interface ContactoEmergencia {
  nombre: string;
  relacion: 'padre' | 'madre' | 'tutor' | 'otro';
  telefono?: string;
  email?: string;
}

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
  domicilio: string | null;
  contactos: ContactoEmergencia[];
  estado: EstadoAlumno;
  fecha_baja: string | null;
  motivo_baja: string | null;
  institucion_id: string;
  created_at: string;
  updated_at: string;
  // ── Acceso al sistema ─────────────────────────────────────
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
  domicilio?: string;
  contactos?: ContactoEmergencia[];
}

export interface UpdateAlumnoDto {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  nacionalidad?: string;
  domicilio?: string;
  contactos?: ContactoEmergencia[];
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
