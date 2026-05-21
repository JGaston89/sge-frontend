export interface Curso {
  id: string;
  nombre: string;
  anio_academico: number;
  nivel: string | null;
  turno: string | null;
  activo: boolean;
  created_at: string;
  materia_ids: string[];
}

export interface Materia {
  id: string;
  nombre: string;
  codigo: string | null;
  activo: boolean;
  created_at: string;
}

export interface Periodo {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
}

export interface CicloLectivo {
  id: string;
  anio: number;
  nombre: string;
  activo: boolean;
  created_at: string;
}

export const NIVELES = ['inicial', 'primaria', 'secundaria', 'terciario'] as const;
export const TURNOS  = ['manana', 'tarde', 'vespertino', 'noche'] as const;

export const NIVEL_LABEL: Record<string, string> = {
  inicial:     'Inicial',
  primaria:    'Primaria',
  secundaria:  'Secundaria',
  terciario:   'Terciario',
};

export const TURNO_LABEL: Record<string, string> = {
  manana:     'Mañana',
  tarde:      'Tarde',
  vespertino: 'Vespertino',
  noche:      'Noche',
};
