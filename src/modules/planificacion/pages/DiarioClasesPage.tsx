import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { planificacionApi } from '../../../api/planificacion.api';
import type { CreateClaseDictadaDto } from '../../../shared/types/planificacion.types';

function fmtDate(v: string | null | undefined) {
  if (!v) return '—';
  const d = new Date(v.includes('T') ? v : v + 'T00:00:00');
  return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function DiarioClasesPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const { data: plan, isLoading: loadingPlan } = useQuery({
    queryKey: ['planificacion', id],
    queryFn:  () => planificacionApi.getOne(id!),
    enabled:  !!id,
  });

  const { data: clases = [], isLoading: loadingClases } = useQuery({
    queryKey: ['planificacion-clases', id],
    queryFn:  () => planificacionApi.getClases(id!),
    enabled:  !!id,
  });

  const [form, setForm] = useState<Partial<CreateClaseDictadaDto>>({
    fecha: '', contenidos_trabajados: '', observaciones: '',
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateClaseDictadaDto) => planificacionApi.createClase(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificacion-clases', id] });
      setForm({ fecha: '', contenidos_trabajados: '', observaciones: '' });
    },
  });

  const noEsPlanificador = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo', 'docente'].includes(r));
  if (noEsPlanificador) return <Navigate to="/calificaciones" replace />;

  const isLoading = loadingPlan || loadingClases;
  const totalContenidos = plan?.contenidos?.length ?? 0;
  const pct = totalContenidos > 0 ? Math.min(100, Math.round((clases.length / totalContenidos) * 100)) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fecha || !form.contenidos_trabajados) return;
    createMutation.mutate({
      planificacion_id:     id!,
      fecha:                form.fecha,
      contenidos_trabajados: form.contenidos_trabajados,
      observaciones:        form.observaciones || undefined,
    });
  }

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/planificacion" style={S.back}>← Planificación</Link>
      </div>

      <div style={S.header}>
        <div>
          <h1 style={S.title}>Diario de Clases</h1>
          {plan && (
            <p style={S.subtitle}>
              {plan.materia_nombre} · {plan.curso_nombre} · {plan.ciclo_lectivo}
            </p>
          )}
        </div>
        <a
          href={planificacionApi.getPdfUrl(id!)}
          target="_blank" rel="noopener noreferrer"
          style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          📄 Exportar PDF
        </a>
      </div>

      {isLoading && <p style={S.empty}>Cargando...</p>}

      {!isLoading && (
        <>
          {/* Barra de avance */}
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Avance del programa</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: pct >= 100 ? '#15803d' : pct >= 60 ? '#0f172a' : '#b45309' }}>
                {clases.length} / {totalContenidos} unidades ({pct}%)
              </span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 99, height: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99, transition: 'width 0.4s',
                width: `${pct}%`,
                background: pct >= 100 ? '#16a34a' : pct >= 60 ? '#2563eb' : '#f59e0b',
              }} />
            </div>
            {pct < 60 && totalContenidos > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#b45309' }}>
                ⚠ Menos del 60% de avance. Se enviarán alertas al directivo si continúa así a mitad de ciclo.
              </p>
            )}
          </div>

          {/* Formulario nueva clase */}
          <div style={S.card}>
            <h3 style={S.sectionTitle}>Registrar clase dictada</h3>
            <form onSubmit={handleSubmit}>
              {createMutation.isError && (
                <div style={S.errorBox}>Error al registrar la clase.</div>
              )}
              <div style={S.grid3}>
                <label style={S.label}>
                  Fecha *
                  <input required type="date" style={S.input} value={form.fecha ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
                </label>
                <label style={{ ...S.label, gridColumn: '2 / -1' }}>
                  Contenidos trabajados *
                  <input required style={S.input} value={form.contenidos_trabajados ?? ''}
                    placeholder="Ej: Ecuaciones de primer grado. Resolución de ejercicios."
                    onChange={(e) => setForm((f) => ({ ...f, contenidos_trabajados: e.target.value }))} />
                </label>
                <label style={{ ...S.label, gridColumn: '1 / -1' }}>
                  Observaciones
                  <input style={S.input} value={form.observaciones ?? ''}
                    placeholder="Opcional"
                    onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="submit" style={{ ...S.btnPrimary, opacity: createMutation.isPending ? 0.6 : 1 }}
                  disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Guardando...' : '+ Agregar clase'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de clases */}
          <div style={S.card}>
            <h3 style={S.sectionTitle}>Clases registradas ({clases.length})</h3>
            {clases.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>No hay clases registradas aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {clases.map((c) => (
                  <div key={c.id} style={S.claseRow}>
                    <div style={S.claseFecha}>{fmtDate(c.fecha)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{c.contenidos_trabajados}</div>
                      {c.observaciones && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>↳ {c.observaciones}</div>
                      )}
                      {c.docente_nombre && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.docente_nombre}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:         { maxWidth: 900 },
  back:         { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:        { margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle:     { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:         { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle: { margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid3:        { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  label:        { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:        { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:     { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  btnPrimary:   { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' },
  empty:        { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  claseRow:     { display: 'flex', gap: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, borderLeft: '3px solid #2563eb' },
  claseFecha:   { fontSize: 13, fontWeight: 700, color: '#2563eb', minWidth: 90, paddingTop: 1 },
};
