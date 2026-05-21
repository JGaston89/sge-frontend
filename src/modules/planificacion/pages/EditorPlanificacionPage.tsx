import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { planificacionApi } from '../../../api/planificacion.api';
import { useCursos, useMaterias } from '../../calificaciones/hooks/useCalificaciones';
import type { UnidadTematica } from '../../../shared/types/planificacion.types';

function TextArea({
  label, value, onChange, rows = 4, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string;
}) {
  return (
    <label style={S.label}>
      {label}
      <textarea
        style={{ ...S.select, resize: 'vertical', minHeight: rows * 24 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}

function UnidadesEditor({
  unidades, onChange,
}: {
  unidades: UnidadTematica[];
  onChange: (u: UnidadTematica[]) => void;
}) {
  function add() {
    onChange([...unidades, { titulo: '', descripcion: '' }]);
  }
  function remove(idx: number) {
    onChange(unidades.filter((_, i) => i !== idx));
  }
  function update(idx: number, field: keyof UnidadTematica, value: string) {
    onChange(unidades.map((u, i) => i === idx ? { ...u, [field]: value } : u));
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...unidades];
    const swap = idx + dir;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Unidades temáticas ({unidades.length})
        </span>
        <button type="button" style={S.btnMini} onClick={add}>+ Agregar unidad</button>
      </div>

      {unidades.length === 0 && (
        <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
          Sin unidades aún. Hacé clic en "Agregar unidad".
        </p>
      )}

      {unidades.map((u, i) => (
        <div key={i} style={S.unidadRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', minWidth: 22 }}>#{i + 1}</span>
            <input
              style={{ ...S.select, flex: 1 }}
              placeholder="Título de la unidad"
              value={u.titulo}
              onChange={(e) => update(i, 'titulo', e.target.value)}
            />
            <button
              type="button" style={S.iconBtn}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              title="Subir"
            >↑</button>
            <button
              type="button" style={S.iconBtn}
              disabled={i === unidades.length - 1}
              onClick={() => move(i, 1)}
              title="Bajar"
            >↓</button>
            <button
              type="button"
              style={{ ...S.iconBtn, color: '#b91c1c', borderColor: '#fecaca' }}
              onClick={() => remove(i)}
              title="Eliminar"
            >✕</button>
          </div>
          <textarea
            style={{ ...S.select, width: '100%', resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }}
            placeholder="Contenidos, temas y actividades de esta unidad (opcional)"
            value={u.descripcion ?? ''}
            onChange={(e) => update(i, 'descripcion', e.target.value)}
            rows={3}
          />
        </div>
      ))}
    </div>
  );
}

export function EditorPlanificacionPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit  = !!id;
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const qc       = useQueryClient();

  const { data: cursos   = [] } = useCursos();
  const { data: materias = [] } = useMaterias();

  const { data: existing } = useQuery({
    queryKey: ['planificacion', id],
    queryFn:  () => planificacionApi.getOne(id!),
    enabled:  isEdit,
  });

  const [form, setForm] = useState({
    curso_id:            '',
    materia_id:          '',
    ciclo_lectivo:       new Date().getFullYear(),
    objetivos:           '',
    metodologia:         '',
    criterios_evaluacion: '',
    observaciones:       '',
  });
  const [unidades, setUnidades] = useState<UnidadTematica[]>([]);

  useEffect(() => {
    if (existing) {
      setForm({
        curso_id:            existing.curso_id,
        materia_id:          existing.materia_id,
        ciclo_lectivo:       existing.ciclo_lectivo,
        objetivos:           existing.objetivos ?? '',
        metodologia:         existing.metodologia ?? '',
        criterios_evaluacion: existing.criterios_evaluacion ?? '',
        observaciones:       existing.observaciones ?? '',
      });
      setUnidades(existing.contenidos ?? []);
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: () =>
      planificacionApi.create({
        ...form,
        contenidos: unidades,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['planificaciones'] });
      navigate(`/planificacion/${data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      planificacionApi.update(id!, {
        objetivos:           form.objetivos           || undefined,
        metodologia:         form.metodologia         || undefined,
        criterios_evaluacion: form.criterios_evaluacion || undefined,
        observaciones:       form.observaciones        || undefined,
        contenidos:          unidades,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificaciones'] });
      qc.invalidateQueries({ queryKey: ['planificacion', id] });
      navigate(`/planificacion/${id}`);
    },
  });

  const mutation  = isEdit ? updateMutation : createMutation;
  const isPending = mutation.isPending;

  const noEsPlanificador = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo', 'docente'].includes(r));
  if (noEsPlanificador) return <Navigate to="/calificaciones" replace />;

  const materiasFiltradas = (() => {
    const curso = cursos.find((c) => c.id === form.curso_id);
    if (!curso || !curso.materia_ids?.length) return materias;
    return materias.filter((m) => curso.materia_ids.includes(m.id));
  })();

  const canSubmit = isEdit
    ? true
    : !!form.curso_id && !!form.materia_id;

  return (
    <div style={S.page}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 12 }}>
        <Link to="/planificacion" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>
          ← Planificación curricular
        </Link>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={S.title}>{isEdit ? 'Editar planificación' : 'Nueva planificación'}</h1>
        <p style={S.subtitle}>
          {isEdit && existing
            ? `${existing.materia_nombre} · ${existing.curso_nombre} · ${existing.ciclo_lectivo}`
            : 'Completá los datos de la planificación'}
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Selector (solo en creación) */}
        {!isEdit && (
          <div style={S.card}>
            <h2 style={S.sectionTitle}>Identificación</h2>
            <div style={S.filterGrid}>
              <label style={S.label}>
                Ciclo lectivo *
                <input
                  type="number" style={S.select}
                  value={form.ciclo_lectivo}
                  onChange={(e) => setForm((f) => ({ ...f, ciclo_lectivo: Number(e.target.value) }))}
                  min={2000} max={2100}
                />
              </label>
              <label style={S.label}>
                Curso *
                <select
                  style={S.select}
                  value={form.curso_id}
                  onChange={(e) => setForm((f) => ({ ...f, curso_id: e.target.value, materia_id: '' }))}
                  required
                >
                  <option value="">Seleccionar curso...</option>
                  {cursos.filter((c) => c.activo).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.anio_academico})</option>
                  ))}
                </select>
              </label>
              <label style={S.label}>
                Materia *
                <select
                  style={S.select}
                  value={form.materia_id}
                  onChange={(e) => setForm((f) => ({ ...f, materia_id: e.target.value }))}
                  disabled={!form.curso_id}
                  required
                >
                  <option value="">{form.curso_id ? 'Seleccionar materia...' : 'Primero elegí un curso'}</option>
                  {materiasFiltradas.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Objetivos */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Objetivos generales</h2>
          <TextArea
            label=""
            value={form.objetivos}
            onChange={(v) => setForm((f) => ({ ...f, objetivos: v }))}
            rows={5}
            placeholder="Describí los objetivos generales de la materia para este ciclo..."
          />
        </div>

        {/* Unidades temáticas */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Unidades temáticas</h2>
          <UnidadesEditor unidades={unidades} onChange={setUnidades} />
        </div>

        {/* Metodología */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Metodología de enseñanza</h2>
          <TextArea
            label=""
            value={form.metodologia}
            onChange={(v) => setForm((f) => ({ ...f, metodologia: v }))}
            rows={4}
            placeholder="Metodologías, recursos, estrategias didácticas..."
          />
        </div>

        {/* Criterios de evaluación */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Criterios de evaluación</h2>
          <TextArea
            label=""
            value={form.criterios_evaluacion}
            onChange={(v) => setForm((f) => ({ ...f, criterios_evaluacion: v }))}
            rows={4}
            placeholder="Criterios, instrumentos y modalidades de evaluación..."
          />
        </div>

        {/* Observaciones */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Observaciones</h2>
          <TextArea
            label=""
            value={form.observaciones}
            onChange={(v) => setForm((f) => ({ ...f, observaciones: v }))}
            rows={3}
            placeholder="Observaciones adicionales (opcional)..."
          />
        </div>

        {/* Footer */}
        <div style={S.saveRow}>
          {mutation.isError && (
            <span style={{ color: '#dc2626', fontSize: 14 }}>
              Error al guardar. Verificá que no exista ya una planificación para ese curso/materia/ciclo.
            </span>
          )}
          <Link to="/planificacion" style={S.btnSecondary}>Cancelar</Link>
          <button
            type="submit"
            style={{ ...S.btnPrimary, opacity: !canSubmit || isPending ? 0.6 : 1 }}
            disabled={!canSubmit || isPending}
          >
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear planificación'}
          </button>
        </div>
      </form>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:         { maxWidth: 800 },
  title:        { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:     { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:         { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 },
  sectionTitle: { margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
  filterGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  label:        { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  select:       { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  unidadRow:    { background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: 12, marginBottom: 10 },
  btnMini:      { padding: '6px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  iconBtn:      { padding: '4px 8px', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#475569' },
  saveRow:      { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingBottom: 24 },
  btnPrimary:   { padding: '11px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '11px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-block' },
};
