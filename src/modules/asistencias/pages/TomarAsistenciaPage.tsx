import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { asistenciasApi } from '../../../api/asistencias.api';
import { inscripcionesApi } from '../../../api/inscripciones.api';
import { useCursos, useMaterias } from '../../calificaciones/hooks/useCalificaciones';
import {
  ESTADO_ASISTENCIA_LABEL,
  ESTADO_ASISTENCIA_COLORS,
  type EstadoAsistencia,
} from '../../../shared/types/asistencias.types';

const ESTADOS: EstadoAsistencia[] = ['presente', 'ausente', 'tardanza', 'justificado'];

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export function TomarAsistenciaPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const { data: cursos   = [] } = useCursos();
  const { data: materias = [] } = useMaterias();

  const [form, setForm] = useState({ curso_id: '', materia_id: '', fecha: hoy() });
  const [guardado, setGuardado] = useState(false);

  // Alumnos inscriptos en el curso
  const { data: inscripciones = [], isLoading: loadingAlumnos } = useQuery({
    queryKey: ['inscripciones-curso-activos', form.curso_id],
    queryFn:  () => inscripcionesApi.listar(form.curso_id, new Date(form.fecha).getFullYear()),
    enabled:  !!form.curso_id,
    select:   (data) => data.filter((i) => i.estado !== 'baja'),
  });

  // Asistencias ya registradas para esa clase/fecha
  const { data: registradas = [] } = useQuery({
    queryKey: ['asistencias-clase', form.curso_id, form.materia_id, form.fecha],
    queryFn:  () => asistenciasApi.getByClase(form.curso_id, form.materia_id, form.fecha),
    enabled:  !!form.curso_id && !!form.materia_id,
  });

  // Estado local de cada alumno (inicializado desde registradas o 'presente' por defecto)
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia>>({});

  if (user?.roles?.includes('alumno')) return <Navigate to="/asistencias/resumen" replace />;

  // Merge: registradas sobreescriben el default
  const estadoEfectivo = (alumnoId: string): EstadoAsistencia => {
    if (estados[alumnoId]) return estados[alumnoId];
    const reg = registradas.find((r) => r.alumno_id === alumnoId);
    return reg?.estado ?? 'presente';
  };

  function setEstado(alumnoId: string, estado: EstadoAsistencia) {
    setEstados((prev) => ({ ...prev, [alumnoId]: estado }));
    setGuardado(false);
  }

  function marcarTodos(estado: EstadoAsistencia) {
    const map: Record<string, EstadoAsistencia> = {};
    inscripciones.forEach((i) => { map[i.alumno_id] = estado; });
    setEstados(map);
    setGuardado(false);
  }

  const mutation = useMutation({
    mutationFn: () =>
      asistenciasApi.registrar({
        curso_id:    form.curso_id,
        materia_id:  form.materia_id,
        fecha:       form.fecha,
        asistencias: inscripciones.map((i) => ({
          alumno_id: i.alumno_id,
          estado:    estadoEfectivo(i.alumno_id),
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asistencias-clase'] });
      setGuardado(true);
    },
  });

  const listo = !!form.curso_id && !!form.materia_id && inscripciones.length > 0;

  const materiasFiltradas = (() => {
    const curso = cursos.find((c) => c.id === form.curso_id);
    if (!curso || !curso.materia_ids?.length) return materias;
    return materias.filter((m) => curso.materia_ids.includes(m.id));
  })();

  const contadores = inscripciones.reduce((acc, i) => {
    const e = estadoEfectivo(i.alumno_id);
    acc[e] = (acc[e] ?? 0) + 1;
    return acc;
  }, {} as Record<EstadoAsistencia, number>);

  return (
    <div style={S.page}>

      {/* ── Breadcrumb ── */}
      <div style={{ marginBottom: 12 }}>
        <Link to="/asistencias" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>
          ← Asistencias
        </Link>
      </div>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.title}>Tomar Asistencia</h1>
        <p style={S.subtitle}>Registrá la asistencia de una clase</p>
      </div>

      {/* ── Selector ── */}
      <div style={S.card}>
        <div style={S.filterGrid}>
          <label style={S.label}>
            Curso
            <select
              style={S.select}
              value={form.curso_id}
              onChange={(e) => {
                setForm((f) => ({ ...f, curso_id: e.target.value, materia_id: '' }));
                setEstados({});
                setGuardado(false);
              }}
            >
              <option value="">Seleccionar curso...</option>
              {cursos.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.anio_academico}){c.turno ? ` — ${c.turno}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label style={S.label}>
            Materia
            <select
              style={S.select}
              value={form.materia_id}
              onChange={(e) => { setForm((f) => ({ ...f, materia_id: e.target.value })); setEstados({}); setGuardado(false); }}
              disabled={!form.curso_id}
            >
              <option value="">{form.curso_id ? 'Seleccionar materia...' : 'Primero elegí un curso'}</option>
              {materiasFiltradas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </label>

          <label style={S.label}>
            Fecha
            <input
              type="date"
              style={S.select}
              value={form.fecha}
              onChange={(e) => { setForm((f) => ({ ...f, fecha: e.target.value })); setEstados({}); setGuardado(false); }}
            />
          </label>
        </div>
      </div>

      {/* ── Lista de alumnos ── */}
      {form.curso_id && form.materia_id && (
        <div style={{ marginTop: 20 }}>
          {loadingAlumnos && <p style={S.empty}>Cargando alumnos...</p>}

          {!loadingAlumnos && inscripciones.length === 0 && (
            <p style={S.empty}>No hay alumnos activos en este curso.</p>
          )}

          {!loadingAlumnos && inscripciones.length > 0 && (
            <>
              {/* Contadores + acciones rápidas */}
              <div style={S.toolbarRow}>
                <div style={S.contadores}>
                  {ESTADOS.map((e) => (
                    <span key={e} style={{ ...S.contadorChip, ...ESTADO_ASISTENCIA_COLORS[e] }}>
                      {ESTADO_ASISTENCIA_LABEL[e]}: <strong>{contadores[e] ?? 0}</strong>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={S.btnMini} onClick={() => marcarTodos('presente')}>Todos presentes</button>
                  <button style={{ ...S.btnMini, ...ESTADO_ASISTENCIA_COLORS.ausente }} onClick={() => marcarTodos('ausente')}>Todos ausentes</button>
                </div>
              </div>

              {/* Tabla */}
              <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>#</th>
                      <th style={S.th}>Alumno</th>
                      <th style={S.th}>Legajo</th>
                      {ESTADOS.map((e) => (
                        <th key={e} style={{ ...S.th, textAlign: 'center' }}>
                          {ESTADO_ASISTENCIA_LABEL[e]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...inscripciones]
                      .sort((a, b) => a.alumno_apellido.localeCompare(b.alumno_apellido, 'es'))
                      .map((ins, i) => {
                        const actual = estadoEfectivo(ins.alumno_id);
                        return (
                          <tr
                            key={ins.alumno_id}
                            style={{
                              ...S.tr,
                              background: i % 2 === 0 ? '#fff' : '#f8fafc',
                              ...(actual === 'ausente' ? { opacity: 0.75 } : {}),
                            }}
                          >
                            <td style={{ ...S.td, color: '#94a3b8', fontSize: 13 }}>{i + 1}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>
                              {ins.alumno_apellido}, {ins.alumno_nombre}
                            </td>
                            <td style={S.td}>
                              <code style={S.legajoBadge}>{ins.alumno_legajo}</code>
                            </td>
                            {ESTADOS.map((e) => (
                              <td key={e} style={{ ...S.td, textAlign: 'center' }}>
                                <input
                                  type="radio"
                                  name={`estado-${ins.alumno_id}`}
                                  checked={actual === e}
                                  onChange={() => setEstado(ins.alumno_id, e)}
                                  style={{ accentColor: e === 'presente' ? '#16a34a' : e === 'ausente' ? '#dc2626' : e === 'tardanza' ? '#ca8a04' : '#2563eb', width: 18, height: 18, cursor: 'pointer' }}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Guardar */}
              <div style={S.saveRow}>
                {guardado && (
                  <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 500 }}>
                    ✓ Asistencia guardada correctamente
                  </span>
                )}
                {mutation.isError && (
                  <span style={{ color: '#dc2626', fontSize: 14 }}>
                    Error al guardar. Intente nuevamente.
                  </span>
                )}
                <button
                  style={{ ...S.btnGuardar, opacity: !listo || mutation.isPending ? 0.6 : 1 }}
                  disabled={!listo || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending ? 'Guardando...' : 'Guardar asistencia'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:       { maxWidth: 960 },
  title:      { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:   { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card: {
    background: '#fff', borderRadius: 12,
    border: '1px solid #e2e8f0', padding: 20,
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  },
  label:  { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  select: { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' },
  empty:  { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  toolbarRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12, marginBottom: 12,
  },
  contadores: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  contadorChip: {
    padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
  },
  btnMini: {
    padding: '6px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0',
    borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 500,
  },
  table:  { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap',
  },
  tr:     { borderBottom: '1px solid #f1f5f9' },
  td:     { padding: '10px 12px', fontSize: 14, color: '#0f172a' },
  legajoBadge: {
    fontSize: 12, background: '#f1f5f9',
    padding: '2px 7px', borderRadius: 4, color: '#475569',
  },
  saveRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    gap: 16, marginTop: 16,
  },
  btnGuardar: {
    padding: '11px 28px', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
};
