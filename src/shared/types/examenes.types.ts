export type EstadoMesa = 'abierta' | 'cerrada' | 'cancelada';
export type EstadoInscripcion = 'inscripto' | 'presente' | 'ausente' | 'anulada';

export interface MesaExamen {
  id: string;
  ciclo_id: string | null;
  ciclo_nombre: string | null;
  materia_id: string;
  materia_nombre: string;
  docente_id: string | null;
  docente_nombre: string | null;
  curso_id: string | null;
  curso_nombre: string | null;
  fecha: string;
  hora: string | null;
  aula: string | null;
  cupo_maximo: number;
  estado: EstadoMesa;
  fecha_limite_inscripcion: string | null;
  inscriptos: number;
  created_at: string;
}

export interface InscripcionExamen {
  id: string;
  mesa_id: string;
  alumno_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  alumno_legajo: string;
  estado: EstadoInscripcion;
  nota_numerica: number | null;
  nota_conceptual: 'aprobado' | 'desaprobado' | null;
  observaciones: string | null;
  fecha_inscripcion: string;
}

export interface MesaDetalle extends MesaExamen {
  inscriptos: InscripcionExamen[];
}

export interface CreateMesaDto {
  materia_id: string;
  ciclo_id?: string;
  docente_id?: string;
  curso_id?: string;
  fecha: string;
  hora?: string;
  aula?: string;
  cupo_maximo?: number;
  fecha_limite_inscripcion?: string;
}

export interface NotaItemDto {
  alumno_id: string;
  nota_numerica?: number;
  estado: 'presente' | 'ausente' | 'inscripto';
  observaciones?: string;
}
