import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { planificacionApi } from '../../../api/planificacion.api';
import { useCursos, useMaterias } from '../../calificaciones/hooks/useCalificaciones';
import {
  ESTADO_PLANIFICACION_LABEL,
  ESTADO_PLANIFICACION_COLORS,
  type Planificacion,
  type EstadoPlanificacion,
} from '../../../shared/types/planificacion.types';

function EstadoBadge({ estado }: { estado: EstadoPlanificacion }) {
  return (
    <span style={{
      ...ESTADO_PLANIFICACION_COLORS[estado],
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    }}>
      {ESTADO_PLANIFICACION_LABEL[estado]}
    </span>
  );
}

export function PlanificacionPage() {
  const navigate    = useNavigate();
  const { user }    = useAuthContext();
  const qc          = useQueryClient();
  const { data: cursos   = [] } = useCursos();
  const { data: materias = [] } = useMaterias();

  const [filters, setFilters] = useState({
    ciclo_lectivo: new Date().getFullYear(),
    curso_id:      '',
    materia_id:    '',
    estado:        '',
  });

  const { data: planificaciones = [], isLoading } = useQuery({
    queryKey: ['planificaciones', filters],
    queryFn:  () => planificacionApi.getAll({
      ciclo_lectivo: filters.ciclo_lectivo || undefined,
      curso_id:      filters.curso_id      || undefined,
      materia_id:    filters.materia_id    || undefined,
      estado:        filters.estado        || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => planificacionApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['planificaciones'] }),
  });

  const materiasFiltradas = (() => {
    const curso = cursos.find((c) => c.id === filters.curso_id);
    if (!curso || !curso.materia_ids?.length) return materias;
    return materias.filter((m) => curso.materia_ids.includes(m.id));
  })();

  const noEsPlanificador = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo', 'docente'].includes(r));
  if (noEsPlanificador) return <Navigate to="/calificaciones" replace />;

  function handleDelete(plan: Planificacion) {
    if (!window.confirm(`¿Eliminar la planificación de "${plan.materia_nombre}" en ${plan.curso_nombre}?`)) return;
    deleteMutation.mutate(plan.id);
  }

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.title}>Planificación Curricular</h1>
        <p style={S.subtitle}>Planificaciones por materia, curso y ciclo lectivo</p>
      </div>

      {/* Filtros + acción */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={S.filterGrid}>
          <label style={S.label}>
            Ciclo lectivo
            <input
              type="number" style={S.select}
              value={filters.ciclo_lectivo}
              onChange={(e) => setFilters((f) => ({ ...f, ciclo_lectivo: Number(e.target.value) }))}
              min={2000} max={2100}
            />
          </label>
          <label style={S.label}>
            Curso
            <select
              style={S.select}
              value={filters.curso_id}
              onChange={(e) => setFilters((f) => ({ ...f, curso_id: e.target.value, materia_id: '' }))}
            >
              <option value="">Todos los cursos</option>
              {cursos.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.anio_academico})</option>
              ))}
            </select>
          </label>
          <label style={S.label}>
            Materia
            <select
              style={S.select}
              value={filters.materia_id}
              onChange={(e) => setFilters((f) => ({ ...f, materia_id: e.target.value }))}
            >
              <option value="">Todas las materias</option>
              {materiasFiltradas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </label>
          <label style={S.label}>
            Estado
            <select
              style={S.select}
              value={filters.estado}
              onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="aprobada">Aprobada</option>
            </select>
          </label>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button style={S.btnPrimary} onClick={() => navigate('/planificacion/nueva')}>
            + Nueva planificación
          </button>
        </div>
      </div>

      {/* Resultados */}
      {isLoading && <p style={S.empty}>Cargando planificaciones...</p>}

      {!isLoading && planificaciones.length === 0 && (
        <p style={S.empty}>No hay planificaciones para los filtros seleccionados.</p>
      )}

      {!isLoading && planificaciones.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Materia</th>
                <th style={S.th}>Curso</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Ciclo</th>
                <th style={S.th}>Docente</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Unidades</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Estado</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planificaciones.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ ...S.tr, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                >
                  <td style={{ ...S.td, fontWeight: 600 }}>{p.materia_nombre}</td>
                  <td style={S.td}>{p.curso_nombre}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>{p.ciclo_lectivo}</td>
                  <td style={{ ...S.td, color: p.docente_nombre ? '#0f172a' : '#94a3b8', fontSize: 13 }}>
                    {p.docente_nombre ?? '—'}
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <span style={{ ...S.badge, background: '#f1f5f9', color: '#475569' }}>
                      {p.contenidos.length}
                    </span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <Link
                        to={`/planificacion/${p.id}`}
                        style={{ ...S.btnAction, color: '#2563eb', borderColor: '#bfdbfe' }}
                      >
                        Ver
                      </Link>
                      <Link
                        to={`/planificacion/${p.id}/editar`}
                        style={{ ...S.btnAction, color: '#0f172a', borderColor: '#e2e8f0' }}
                      >
                        Editar
                      </Link>
                      <Link
                        to={`/planificacion/${p.id}/diario`}
                        style={{ ...S.btnAction, color: '#0369a1', borderColor: '#bae6fd' }}
                      >
                        Diario
                      </Link>
                      {p.estado === 'borrador' && (
                        <button
                          style={{ ...S.btnAction, color: '#b91c1c', borderColor: '#fecaca', cursor: 'pointer', background: 'none' }}
                          onClick={() => handleDelete(p)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:       { maxWidth: 1100 },
  title:      { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:   { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:       { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  label:      { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  select:     { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' },
  empty:      { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  btnPrimary: { padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr:         { borderBottom: '1px solid #f1f5f9' },
  td:         { padding: '10px 14px', fontSize: 14, color: '#0f172a' },
  badge:      { fontSize: 12, padding: '2px 8px', borderRadius: 12, fontWeight: 600 },
  btnAction:  { fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid', textDecoration: 'none', fontWeight: 500, display: 'inline-block' },
};
