export type TipoCircular       = 'circular' | 'aviso' | 'comunicado';
export type DestinatariosTipo  = 'todos' | 'docentes' | 'alumnos' | 'administrativos' | 'docentes_y_administrativos';

export interface Circular {
  id: string;
  institucion_id: string;
  titulo: string;
  contenido: string;
  tipo: TipoCircular;
  destinatarios_tipo: DestinatariosTipo;
  fecha_publicacion: string;
  fecha_vencimiento: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creado_por_nombre: string;
  visto: boolean;
  adjuntos: unknown[];
}

export interface CreateCircularDto {
  titulo: string;
  contenido: string;
  tipo: TipoCircular;
  destinatarios_tipo: DestinatariosTipo;
  fecha_publicacion: string;
  fecha_vencimiento?: string;
}

export type UpdateCircularDto = Partial<CreateCircularDto>;

export const TIPO_CIRCULAR_LABEL: Record<TipoCircular, string> = {
  circular:   'Circular',
  aviso:      'Aviso',
  comunicado: 'Comunicado',
};

export const DESTINATARIOS_LABEL: Record<DestinatariosTipo, string> = {
  todos:                      'Todos',
  docentes:                   'Docentes',
  alumnos:                    'Alumnos',
  administrativos:            'Administrativos',
  docentes_y_administrativos: 'Docentes y Administrativos',
};

export const TIPO_CIRCULAR_COLOR: Record<TipoCircular, React.CSSProperties> = {
  circular:   { background: '#dbeafe', color: '#1d4ed8' },
  aviso:      { background: '#fef9c3', color: '#854d0e' },
  comunicado: { background: '#f3e8ff', color: '#7e22ce' },
};
