import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { examenesApi } from '../../../api/examenes.api';
import { docentesApi } from '../../../api/docentes.api';
import { calendarioApi } from '../../../api/calendario.api';
import type { CreateMesaDto, EstadoMesa } from '../../../shared/types/examenes.types';
import { useMaterias, useCursos } from '../../calificaciones/hooks/useCalificaciones';

const ESTADO_COLOR: Record<EstadoMesa, React.CSSProperties> = {
  abierta:   { background: '#dcfce7', color: '#15803d' },
  cerrada:   { background: '#f1f5f9', color: '#475569' },
  cancelada: { background: '#fee2e2', color: '#b91c1c' },
};

const ESTADO_LABEL: Record<EstadoMesa, string> = {
  abierta: 'Abierta', cerrada: 'Cerrada', cancelada: 'Cancelada',
};

function fmtDate(v: string | null | undefined) {
  if (!v) return '—';
  const d = new Date(v.includes('T') ? v : v + 'T00:00:00');
  return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

const EMPTY_FORM: CreateMesaDto = {
  materia_id: '', fecha: '', hora: '', aula: '',
  docente_id: '', ciclo_id: '', curso_id: '',
};

export function MesasPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const { data: materias = [] } = useMaterias();
  const { data: cursos   = [] } = useCursos();

  const { data: docentes = [] } = useQuery({
    queryKey: ['docentes', { estado: 'activo' }],
    queryFn:  () => docentesApi.getAll({ estado: 'activo' }),
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: ['calendario-ciclos'],
    queryFn:  calendarioApi.getCiclos,
  });

  const [filters, setFilters] = useState({ materia_id: '', estado: '', curso_id: '' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateMesaDto>(EMPTY_FORM);

  const { data: mesas = [], isLoading } = useQuery({
    queryKey: ['examenes-mesas', filters],
    queryFn:  () => examenesApi.getMesas({
      materia_id: filters.materia_id || undefined,
      estado:     filters.estado     || undefined,
      curso_id:   filters.curso_id   || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateMesaDto) => examenesApi.createMesa(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['examenes-mesas'] });
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.materia_id || !form.fecha) return;
    const dto: CreateMesaDto = { materia_id: form.materia_id, fecha: form.fecha };
    if (form.curso_id)   dto.curso_id   = form.curso_id;
    if (form.docente_id) dto.docente_id  = form.docente_id;
    if (form.ciclo_id)   dto.ciclo_id    = form.ciclo_id;
    if (form.hora)       dto.hora        = form.hora;
    if (form.aula)       dto.aula        = form.aula;
    createMutation.mutate(dto);
  }

  const esAlumno = user?.roles?.includes('alumno') ?? false;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Mesas de Examen</h1>
          <p style={S.subtitle}>Gestión de mesas, inscripciones y actas</p>
        </div>
        {!esAlumno && (
          <button style={S.btnPrimary} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : '+ Nueva mesa'}
          </button>
        )}
      </div>

      {/* Formulario nueva mesa */}
      {!esAlumno && showForm && (
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Nueva mesa de examen</h3>
          <form onSubmit={handleSubmit}>
            {createMutation.isError && (
              <div style={S.errorBox}>Error al crear la mesa. Revisá los datos.</div>
            )}
            <div style={S.grid3}>
              <label style={S.label}>
                Materia *
                <select required style={S.input} value={form.materia_id}
                  onChange={(e) => setForm((f) => ({ ...f, materia_id: e.target.value }))}>
                  <option value="">Seleccionar materia</option>
                  {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </label>
              <label style={S.label}>
                Curso
                <select style={S.input} value={form.curso_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, curso_id: e.target.value || undefined }))}>
                  <option value="">Sin curso</option>
                  {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.anio_academico})</option>)}
                </select>
              </label>
              <label style={S.label}>
                Docente
                <select style={S.input} value={form.docente_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, docente_id: e.target.value || undefined }))}>
                  <option value="">Sin asignar</option>
                  {docentes.map((d) => <option key={d.id} value={d.id}>{d.apellido}, {d.nombre}</option>)}
                </select>
              </label>
              <label style={S.label}>
                Período / Ciclo
                <select style={S.input} value={form.ciclo_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, ciclo_id: e.target.value || undefined }))}>
                  <option value="">Sin período</option>
                  {ciclos.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.anio})</option>)}
                </select>
              </label>
              <label style={S.label}>
                Fecha del examen *
                <input required type="date" style={S.input} value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
              </label>
              <label style={S.label}>
                Hora
                <input type="time" style={S.input} value={form.hora ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value || undefined }))} />
              </label>
              <label style={S.label}>
                Aula
                <input style={S.input} value={form.aula ?? ''} placeholder="Ej: Aula 3"
                  onChange={(e) => setForm((f) => ({ ...f, aula: e.target.value || undefined }))} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" style={S.btnSecondary}
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancelar</button>
              <button type="submit" style={{ ...S.btnPrimary, opacity: createMutation.isPending ? 0.6 : 1 }}
                disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Crear mesa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={{ ...S.card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <label style={S.label}>
          Materia
          <select style={{ ...S.input, width: 200 }} value={filters.materia_id}
            onChange={(e) => setFilters((f) => ({ ...f, materia_id: e.target.value }))}>
            <option value="">Todas</option>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>
        <label style={S.label}>
          Curso
          <select style={{ ...S.input, width: 200 }} value={filters.curso_id}
            onChange={(e) => setFilters((f) => ({ ...f, curso_id: e.target.value }))}>
            <option value="">Todos</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label style={S.label}>
          Estado
          <select style={{ ...S.input, width: 140 }} value={filters.estado}
            onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}>
            <option value="">Todos</option>
            <option value="abierta">Abierta</option>
            <option value="cerrada">Cerrada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
      </div>

      {/* Tabla */}
      {isLoading && <p style={S.empty}>Cargando mesas...</p>}
      {!isLoading && mesas.length === 0 && (
        <p style={S.empty}>No hay mesas para los filtros seleccionados.</p>
      )}
      {!isLoading && mesas.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Materia</th>
                <th style={S.th}>Curso</th>
                <th style={S.th}>Docente</th>
                <th style={S.th}>Fecha</th>
                <th style={S.th}>Hora / Aula</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Inscriptos</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Estado</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mesas.map((m, i) => (
                <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{m.materia_nombre}</td>
                  <td style={{ ...S.td, color: m.curso_nombre ? '#0f172a' : '#94a3b8', fontSize: 13 }}>
                    {m.curso_nombre ?? '—'}
                  </td>
                  <td style={{ ...S.td, color: m.docente_nombre ? '#0f172a' : '#94a3b8', fontSize: 13 }}>
                    {m.docente_nombre ?? '—'}
                  </td>
                  <td style={S.td}>{fmtDate(m.fecha)}</td>
                  <td style={{ ...S.td, fontSize: 13, color: '#475569' }}>
                    {m.hora ?? '—'}{m.aula ? ` · ${m.aula}` : ''}
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{m.inscriptos}</span>
                    <span style={{ color: '#94a3b8' }}> / {m.cupo_maximo}</span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <span style={{ ...ESTADO_COLOR[m.estado], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {ESTADO_LABEL[m.estado]}
                    </span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <Link to={`/examenes/${m.id}`} style={S.linkBtn}>Ver detalle</Link>
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
  page:         { maxWidth: 1200 },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:        { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:     { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:         { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle: { margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid3:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 },
  label:        { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:        { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:     { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  btnPrimary:   { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' },
  empty:        { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' },
  td:           { padding: '12px 16px', fontSize: 14, color: '#0f172a', borderBottom: '1px solid #f1f5f9' },
  linkBtn:      { color: '#2563eb', textDecoration: 'none', fontSize: 13, fontWeight: 600 },
};
