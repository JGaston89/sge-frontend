import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { docentesApi } from '../../../api/docentes.api';
import { useCursos, useMaterias } from '../../calificaciones/hooks/useCalificaciones';
import type { Asignacion } from '../../../shared/types/docentes.types';

export function AsignacionesPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const { data: cursos   = [] } = useCursos();
  const { data: materias = [] } = useMaterias();
  const { data: docentes = [] } = useQuery({
    queryKey: ['docentes', {}],
    queryFn: () => docentesApi.getAll({ estado: 'activo' }),
  });

  const [filters, setFilters] = useState({
    ciclo_lectivo: new Date().getFullYear(),
    curso_id: '', materia_id: '', docente_id: '',
  });

  const [newForm, setNewForm] = useState({
    docente_id: '', materia_id: '', curso_id: '',
    ciclo_lectivo: new Date().getFullYear(), horas_semanales: '',
  });

  const { data: asignaciones = [], isLoading } = useQuery({
    queryKey: ['asignaciones', filters],
    queryFn: () => docentesApi.getAsignaciones({
      ciclo_lectivo: filters.ciclo_lectivo || undefined,
      curso_id:      filters.curso_id      || undefined,
      materia_id:    filters.materia_id    || undefined,
      docente_id:    filters.docente_id    || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: () => docentesApi.createAsignacion({
      docente_id:     newForm.docente_id,
      materia_id:     newForm.materia_id,
      curso_id:       newForm.curso_id,
      ciclo_lectivo:  newForm.ciclo_lectivo,
      horas_semanales: newForm.horas_semanales ? Number(newForm.horas_semanales) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
      setNewForm((f) => ({ ...f, docente_id: '', materia_id: '', curso_id: '', horas_semanales: '' }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => docentesApi.removeAsignacion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones'] });
      qc.invalidateQueries({ queryKey: ['docentes'] });
    },
  });

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  const materiasFiltradas = (() => {
    const curso = cursos.find((c) => c.id === newForm.curso_id);
    if (!curso || !curso.materia_ids?.length) return materias;
    return materias.filter((m) => curso.materia_ids.includes(m.id));
  })();

  const canCreate = !!newForm.docente_id && !!newForm.materia_id && !!newForm.curso_id;

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/docentes" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>
          ← Gestión Docente
        </Link>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.title}>Asignaciones</h1>
        <p style={S.subtitle}>Asignar docentes a cursos y materias por ciclo lectivo</p>
      </div>

      {/* Nueva asignación */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <h2 style={S.sectionTitle}>Nueva asignación</h2>
        <div style={S.grid}>
          <label style={S.label}>
            Docente *
            <select
              style={S.select}
              value={newForm.docente_id}
              onChange={(e) => setNewForm((f) => ({ ...f, docente_id: e.target.value }))}
            >
              <option value="">Seleccionar docente...</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>{d.apellido}, {d.nombre}</option>
              ))}
            </select>
          </label>
          <label style={S.label}>
            Curso *
            <select
              style={S.select}
              value={newForm.curso_id}
              onChange={(e) => setNewForm((f) => ({ ...f, curso_id: e.target.value, materia_id: '' }))}
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
              value={newForm.materia_id}
              onChange={(e) => setNewForm((f) => ({ ...f, materia_id: e.target.value }))}
              disabled={!newForm.curso_id}
            >
              <option value="">{newForm.curso_id ? 'Seleccionar materia...' : 'Primero elegí un curso'}</option>
              {materiasFiltradas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </label>
          <label style={S.label}>
            Ciclo lectivo
            <input
              type="number" style={S.select}
              value={newForm.ciclo_lectivo}
              onChange={(e) => setNewForm((f) => ({ ...f, ciclo_lectivo: Number(e.target.value) }))}
              min={2000} max={2100}
            />
          </label>
          <label style={S.label}>
            Hs. semanales
            <input
              type="number" style={S.select}
              value={newForm.horas_semanales}
              onChange={(e) => setNewForm((f) => ({ ...f, horas_semanales: e.target.value }))}
              min={1} max={40} placeholder="Opcional"
            />
          </label>
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{ ...S.btnPrimary, opacity: !canCreate || createMutation.isPending ? 0.6 : 1 }}
            disabled={!canCreate || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Guardando...' : '+ Agregar asignación'}
          </button>
          {createMutation.isError && (
            <span style={{ color: '#dc2626', fontSize: 13 }}>
              El docente ya está asignado a esa materia/curso/ciclo.
            </span>
          )}
          {createMutation.isSuccess && (
            <span style={{ color: '#15803d', fontSize: 13 }}>✓ Asignación creada</span>
          )}
        </div>
      </div>

      {/* Filtros listado */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.grid}>
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
            Docente
            <select style={S.select} value={filters.docente_id} onChange={(e) => setFilters((f) => ({ ...f, docente_id: e.target.value }))}>
              <option value="">Todos</option>
              {docentes.map((d) => <option key={d.id} value={d.id}>{d.apellido}, {d.nombre}</option>)}
            </select>
          </label>
          <label style={S.label}>
            Curso
            <select style={S.select} value={filters.curso_id} onChange={(e) => setFilters((f) => ({ ...f, curso_id: e.target.value }))}>
              <option value="">Todos</option>
              {cursos.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label style={S.label}>
            Materia
            <select style={S.select} value={filters.materia_id} onChange={(e) => setFilters((f) => ({ ...f, materia_id: e.target.value }))}>
              <option value="">Todas</option>
              {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Tabla */}
      {isLoading && <p style={S.empty}>Cargando asignaciones...</p>}

      {!isLoading && asignaciones.length === 0 && (
        <p style={S.empty}>No hay asignaciones para los filtros seleccionados.</p>
      )}

      {!isLoading && asignaciones.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Docente</th>
                <th style={S.th}>Materia</th>
                <th style={S.th}>Curso</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Ciclo</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Hs/sem</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((a: Asignacion, i) => (
                <tr key={a.id} style={{ ...S.tr, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{a.docente_apellido}, {a.docente_nombre}</td>
                  <td style={S.td}>{a.materia_nombre}</td>
                  <td style={S.td}>{a.curso_nombre}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>{a.ciclo_lectivo}</td>
                  <td style={{ ...S.td, textAlign: 'center', color: a.horas_semanales ? '#0f172a' : '#94a3b8' }}>
                    {a.horas_semanales ?? '—'}
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <button
                      style={{ ...S.btnDanger, cursor: 'pointer' }}
                      onClick={() => deleteMutation.mutate(a.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Quitar
                    </button>
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
  page:        { maxWidth: 1000 },
  title:       { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:    { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:        { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 },
  sectionTitle:{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 },
  label:       { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  select:      { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' },
  empty:       { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr:          { borderBottom: '1px solid #f1f5f9' },
  td:          { padding: '10px 14px', fontSize: 14, color: '#0f172a' },
  btnPrimary:  { padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnDanger:   { fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', color: '#b91c1c', background: 'none', fontWeight: 500 },
};
