import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { asistenciasApi } from '../../../api/asistencias.api';
import { useCursos, useMaterias } from '../../calificaciones/hooks/useCalificaciones';
import type { AsistenciaResumenAlumno } from '../../../shared/types/asistencias.types';

function colorPct(pct: number): string {
  if (pct >= 85) return '#15803d';
  if (pct >= 70) return '#854d0e';
  return '#b91c1c';
}

function bgPct(pct: number): string {
  if (pct >= 85) return '#dcfce7';
  if (pct >= 70) return '#fef9c3';
  return '#fee2e2';
}

function BarAsistencia({ pct }: { pct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: colorPct(pct), borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: colorPct(pct), minWidth: 42, textAlign: 'right' }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 24, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

export function ResumenAsistenciaPage() {
  const { data: cursos   = [] } = useCursos();
  const { data: materias = [] } = useMaterias();

  const [form, setForm] = useState({
    curso_id:   '',
    materia_id: '',
    ciclo:      new Date().getFullYear(),
  });
  const [buscar, setBuscar] = useState(false);

  const { data: resumen = [], isLoading, isError } = useQuery({
    queryKey: ['asistencias-resumen', form.curso_id, form.materia_id, form.ciclo],
    queryFn:  () => asistenciasApi.getResumen(form.curso_id, form.materia_id, form.ciclo),
    enabled:  buscar && !!form.curso_id && !!form.materia_id,
  });

  const { data: fechas = [] } = useQuery({
    queryKey: ['asistencias-fechas', form.curso_id, form.materia_id, form.ciclo],
    queryFn:  () => asistenciasApi.getFechas(form.curso_id, form.materia_id, form.ciclo),
    enabled:  buscar && !!form.curso_id && !!form.materia_id,
  });

  const materiasFiltradas = (() => {
    const curso = cursos.find((c) => c.id === form.curso_id);
    if (!curso || !curso.materia_ids?.length) return materias;
    return materias.filter((m) => curso.materia_ids.includes(m.id));
  })();

  const enRiesgo    = resumen.filter((a: AsistenciaResumenAlumno) => a.porcentaje_asistencia < 70).length;
  const atencion    = resumen.filter((a: AsistenciaResumenAlumno) => a.porcentaje_asistencia >= 70 && a.porcentaje_asistencia < 85).length;
  const promedioPct = resumen.length
    ? resumen.reduce((s: number, a: AsistenciaResumenAlumno) => s + a.porcentaje_asistencia, 0) / resumen.length
    : 0;

  return (
    <div style={S.page}>

      {/* ── Breadcrumb ── */}
      <div style={{ marginBottom: 12 }}>
        <Link to="/asistencias" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>
          ← Asistencias
        </Link>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={S.title}>Resumen de Asistencia</h1>
        <p style={S.subtitle}>Porcentaje de asistencia por alumno en la materia</p>
      </div>

      {/* ── Filtros ── */}
      <div style={S.card}>
        <div style={S.filterGrid}>
          <label style={S.label}>
            Curso
            <select
              style={S.select}
              value={form.curso_id}
              onChange={(e) => { setForm((f) => ({ ...f, curso_id: e.target.value, materia_id: '' })); setBuscar(false); }}
            >
              <option value="">Seleccionar curso...</option>
              {cursos.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.anio_academico})</option>
              ))}
            </select>
          </label>
          <label style={S.label}>
            Materia
            <select
              style={S.select}
              value={form.materia_id}
              onChange={(e) => { setForm((f) => ({ ...f, materia_id: e.target.value })); setBuscar(false); }}
              disabled={!form.curso_id}
            >
              <option value="">Seleccionar materia...</option>
              {materiasFiltradas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </label>
          <label style={S.label}>
            Ciclo lectivo
            <input
              type="number" style={S.select}
              value={form.ciclo}
              onChange={(e) => { setForm((f) => ({ ...f, ciclo: Number(e.target.value) })); setBuscar(false); }}
              min={2000} max={2100}
            />
          </label>
        </div>
        <div style={{ marginTop: 16 }}>
          <button
            style={{ ...S.btnPrimary, opacity: !form.curso_id || !form.materia_id ? 0.5 : 1 }}
            disabled={!form.curso_id || !form.materia_id}
            onClick={() => setBuscar(true)}
          >
            Ver resumen
          </button>
        </div>
      </div>

      {/* ── Resultados ── */}
      {buscar && (
        <div style={{ marginTop: 24 }}>
          {isLoading && <p style={S.empty}>Calculando asistencia...</p>}
          {isError   && <p style={{ ...S.empty, color: '#dc2626' }}>Error al cargar. Intente nuevamente.</p>}

          {!isLoading && !isError && resumen.length === 0 && (
            <p style={S.empty}>No hay registros de asistencia para esta materia y ciclo.</p>
          )}

          {!isLoading && !isError && resumen.length > 0 && (
            <>
              {/* Stats */}
              <div style={S.statsRow}>
                <StatCard label="Clases registradas" value={fechas.length}           color="#2563eb" bg="#eff6ff" />
                <StatCard label="Alumnos"             value={resumen.length}          color="#0f172a" bg="#f8fafc" />
                <StatCard label="En riesgo (<70%)"    value={enRiesgo}               color="#b91c1c" bg="#fee2e2" />
                <StatCard label="Con atención (70-85%)" value={atencion}             color="#854d0e" bg="#fef9c3" />
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: colorPct(promedioPct) }}>
                    {promedioPct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Promedio grupo</span>
                </div>
              </div>

              {/* Tabla */}
              <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>#</th>
                        <th style={S.th}>Alumno</th>
                        <th style={S.th}>Legajo</th>
                        <th style={{ ...S.th, textAlign: 'center' }}>Clases</th>
                        <th style={{ ...S.th, textAlign: 'center' }}>Presentes</th>
                        <th style={{ ...S.th, textAlign: 'center' }}>Ausentes</th>
                        <th style={{ ...S.th, textAlign: 'center' }}>Tardanzas</th>
                        <th style={{ ...S.th, textAlign: 'center' }}>Justificados</th>
                        <th style={{ ...S.th, minWidth: 180 }}>Asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...resumen]
                        .sort((a, b) => a.porcentaje_asistencia - b.porcentaje_asistencia)
                        .map((a: AsistenciaResumenAlumno, i) => (
                          <tr
                            key={a.alumno_id}
                            style={{
                              ...S.tr,
                              background: i % 2 === 0 ? '#fff' : '#f8fafc',
                            }}
                          >
                            <td style={{ ...S.td, color: '#94a3b8', fontSize: 13 }}>{i + 1}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>
                              {a.alumno_apellido}, {a.alumno_nombre}
                            </td>
                            <td style={S.td}>
                              <code style={S.legajoBadge}>{a.alumno_legajo}</code>
                            </td>
                            <td style={{ ...S.td, textAlign: 'center' }}>{a.total_clases}</td>
                            <td style={{ ...S.td, textAlign: 'center', color: '#15803d', fontWeight: 600 }}>{a.presentes}</td>
                            <td style={{ ...S.td, textAlign: 'center', color: a.ausentes > 0 ? '#b91c1c' : '#94a3b8', fontWeight: a.ausentes > 0 ? 700 : 400 }}>{a.ausentes}</td>
                            <td style={{ ...S.td, textAlign: 'center', color: a.tardanzas > 0 ? '#854d0e' : '#94a3b8' }}>{a.tardanzas}</td>
                            <td style={{ ...S.td, textAlign: 'center', color: '#1d4ed8' }}>{a.justificados}</td>
                            <td style={S.td}>
                              <BarAsistencia pct={a.porcentaje_asistencia} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:     { maxWidth: 1000 },
  title:    { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:     { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  label:    { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  select:   { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' },
  empty:    { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 },
  btnPrimary: { padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  table:    { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr:       { borderBottom: '1px solid #f1f5f9' },
  td:       { padding: '10px 14px', fontSize: 14, color: '#0f172a' },
  legajoBadge: { fontSize: 12, background: '#f1f5f9', padding: '2px 7px', borderRadius: 4, color: '#475569' },
};
