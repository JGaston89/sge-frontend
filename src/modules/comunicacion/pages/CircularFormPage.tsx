import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { comunicacionApi } from '../../../api/comunicacion.api';
import type { TipoCircular, DestinatariosTipo, CreateCircularDto } from '../../../shared/types/comunicacion.types';
import { TIPO_CIRCULAR_LABEL, DESTINATARIOS_LABEL } from '../../../shared/types/comunicacion.types';

const today = new Date().toISOString().slice(0, 10);

const EMPTY: CreateCircularDto = {
  titulo: '', contenido: '',
  tipo: 'circular', destinatarios_tipo: 'todos',
  fecha_publicacion: today,
};

export function CircularFormPage() {
  const { user }   = useAuthContext();
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { id }     = useParams<{ id?: string }>();
  const isEditing  = !!id;

  const estaff = user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r)) ?? false;
  if (!estaff) return <Navigate to="/comunicacion" replace />;

  const [form, setForm] = useState<CreateCircularDto>(EMPTY);

  const { data: existing } = useQuery({
    queryKey: ['circular', id],
    queryFn:  () => comunicacionApi.getCircularById(id!),
    enabled:  isEditing,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        titulo:            existing.titulo,
        contenido:         existing.contenido,
        tipo:              existing.tipo,
        destinatarios_tipo: existing.destinatarios_tipo,
        fecha_publicacion:  existing.fecha_publicacion.slice(0, 10),
        fecha_vencimiento:  existing.fecha_vencimiento?.slice(0, 10) ?? undefined,
      });
    }
  }, [existing?.id]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateCircularDto) => comunicacionApi.createCircular(dto),
    onSuccess:  (c) => {
      qc.invalidateQueries({ queryKey: ['circulares'] });
      navigate(`/comunicacion/${c.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: CreateCircularDto) => comunicacionApi.updateCircular(id!, dto),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['circulares'] });
      qc.invalidateQueries({ queryKey: ['circular', id] });
      navigate(`/comunicacion/${id}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isError   = createMutation.isError   || updateMutation.isError;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo || !form.contenido) return;
    const dto = { ...form };
    if (!dto.fecha_vencimiento) delete dto.fecha_vencimiento;
    if (isEditing) updateMutation.mutate(dto);
    else           createMutation.mutate(dto);
  }

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/comunicacion" style={S.back}>← Comunicación</Link>
      </div>
      <h1 style={S.title}>{isEditing ? 'Editar circular' : 'Nueva circular'}</h1>

      <div style={S.card}>
        <form onSubmit={handleSubmit}>
          {isError && (
            <div style={S.errorBox}>Error al guardar. Revisá los datos e intentá nuevamente.</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <label style={{ ...S.label, gridColumn: '1 / -1' }}>
              Título *
              <input required style={S.input} value={form.titulo} placeholder="Título de la circular"
                onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </label>

            <label style={S.label}>
              Tipo
              <select style={S.input} value={form.tipo}
                onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value as TipoCircular }))}>
                {(['circular', 'aviso', 'comunicado'] as const).map(t => (
                  <option key={t} value={t}>{TIPO_CIRCULAR_LABEL[t]}</option>
                ))}
              </select>
            </label>

            <label style={S.label}>
              Destinatarios
              <select style={S.input} value={form.destinatarios_tipo}
                onChange={(e) => setForm(f => ({ ...f, destinatarios_tipo: e.target.value as DestinatariosTipo }))}>
                {(['todos', 'docentes', 'alumnos', 'administrativos', 'docentes_y_administrativos'] as const).map(d => (
                  <option key={d} value={d}>{DESTINATARIOS_LABEL[d]}</option>
                ))}
              </select>
            </label>

            <label style={S.label}>
              Fecha de publicación *
              <input required type="date" style={S.input} value={form.fecha_publicacion}
                onChange={(e) => setForm(f => ({ ...f, fecha_publicacion: e.target.value }))} />
            </label>

            <label style={S.label}>
              Fecha de vencimiento
              <input type="date" style={S.input} value={form.fecha_vencimiento ?? ''}
                onChange={(e) => setForm(f => ({ ...f, fecha_vencimiento: e.target.value || undefined }))} />
            </label>

            <label style={{ ...S.label, gridColumn: '1 / -1' }}>
              Contenido *
              <textarea required style={{ ...S.input, minHeight: 160, resize: 'vertical' }}
                placeholder="Escribí el contenido de la circular..."
                value={form.contenido}
                onChange={(e) => setForm(f => ({ ...f, contenido: e.target.value }))} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <Link to="/comunicacion"
              style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Cancelar
            </Link>
            <button type="submit"
              style={{ ...S.btnPrimary, opacity: isPending ? 0.6 : 1 }}
              disabled={isPending}>
              {isPending ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Publicar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:         { maxWidth: 800 },
  back:         { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  title:        { margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#0f172a' },
  card:         { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 },
  label:        { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:        { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:     { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  btnPrimary:   { padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '10px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#374151' },
};
