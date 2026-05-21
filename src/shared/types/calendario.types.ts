export type TipoEvento =
  | 'feriado_nacional' | 'feriado_provincial' | 'feriado_institucional'
  | 'inicio_clases' | 'fin_clases' | 'receso_invernal' | 'receso_primavera'
  | 'reunion_padres' | 'acto_escolar' | 'jornada_institucional'
  | 'periodo_examenes' | 'entrega_boletines' | 'otro';

export const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  feriado_nacional:       'Feriado nacional',
  feriado_provincial:     'Feriado provincial',
  feriado_institucional:  'Feriado institucional',
  inicio_clases:          'Inicio de clases',
  fin_clases:             'Fin de clases',
  receso_invernal:        'Receso invernal',
  receso_primavera:       'Receso de primavera',
  reunion_padres:         'Reunión de padres',
  acto_escolar:           'Acto escolar',
  jornada_institucional:  'Jornada institucional',
  periodo_examenes:       'Período de exámenes',
  entrega_boletines:      'Entrega de boletines',
  otro:                   'Otro',
};

export const TIPO_EVENTO_COLOR: Record<TipoEvento, string> = {
  feriado_nacional:       '#dc2626',
  feriado_provincial:     '#ea580c',
  feriado_institucional:  '#d97706',
  inicio_clases:          '#16a34a',
  fin_clases:             '#15803d',
  receso_invernal:        '#0284c7',
  receso_primavera:       '#7c3aed',
  reunion_padres:         '#db2777',
  acto_escolar:           '#0e7490',
  jornada_institucional:  '#059669',
  periodo_examenes:       '#4f46e5',
  entrega_boletines:      '#b45309',
  otro:                   '#64748b',
};

export interface CicloLectivo {
  id: string;
  nombre: string;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

export interface CalendarioEvento {
  id: string;
  ciclo_id: string | null;
  ciclo_nombre: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  fecha_inicio: string;
  fecha_fin: string | null;
  todo_el_dia: boolean;
  created_at: string;
}

export interface CreateCicloDto {
  nombre: string;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface CreateEventoDto {
  ciclo_id?: string;
  titulo: string;
  descripcion?: string;
  tipo: TipoEvento;
  fecha_inicio: string;
  fecha_fin?: string;
  todo_el_dia?: boolean;
}

export interface ImportarFeriadosDto {
  anio: number;
  ciclo_id?: string;
}
