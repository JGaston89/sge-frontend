import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdfApi } from '../../../api/pdf.api';
import { useAuthContext } from '../../../store/AuthContext';
import { useCursos, useMaterias, useActa, useCerrarActa, useRectificarActa } from '../hooks/useCalificaciones';
import type { QueryCalificacionesParams, TipoCalificacion } from '../../../shared/types/calificaciones.types';
import { isAxiosError } from 'axios';

const TIPO_LABELS: Record<TipoCalificacion, string> = {
  nota: 'Nota',
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recuperatorio',
  concepto: 'Concepto',
};

const PERIODOS = ['1er trimestre', '2do trimestre', '3er trimestre', '1er cuatrimestre', '2do cuatrimestre'];

export function CalificacionesPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const isDirectivo = user?.roles?.some((r) => ['admin', 'directivo', 'administrativo'].includes(r)) ?? false;
  const esAlumno = user?.roles?.includes('alumno') ?? false;

  const { data: cursos = [], isLoading: loadingCursos } = useCursos();
  const { data: materias = [], isLoading: loadingMaterias } = useMaterias();

  const [form, setForm] = useState({
    curso_id: '',
    materia_id: '',
    periodo: '',
    anio_academico: new Date().getFullYear(),
  });

  const cursoSeleccionado = cursos.find((c) => c.id === form.curso_id) ?? null;
  // materia_ids puede ser undefined si el backend aún no corrió la migración 008
  const cursoMateriaIds = cursoSeleccionado?.materia_ids;
  const materiasFiltradas = !cursoSeleccionado || cursoMateriaIds === undefined
    ? materias
    : materias.filter((m) => cursoMateriaIds.includes(m.id));
  const [searchParams, setSearchParams] = useState<QueryCalificacionesParams | null>(null);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [cerrarObs, setCerrarObs] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const { data: acta, isLoading: loadingActa, error } = useActa(searchParams);
  const cerrarMutation = useCerrarActa();
  const rectificarMutation = useRectificarActa();

  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  function handleBuscar() {
    if (!form.curso_id || !form.materia_id || !form.periodo) return;
    setSearchParams({ ...form });
  }

  function handleCargar() {
    const q = new URLSearchParams({
      curso_id: form.curso_id,
      materia_id: form.materia_id,
      periodo: form.periodo,
      anio_academico: String(form.anio_academico),
    });
    navigate(`/calificaciones/libro?${q}`);
  }

  function handleCerrar() {
    if (!acta) return;
    cerrarMutation.mutate(
      { actaId: acta.id, observaciones: cerrarObs || undefined },
      { onSuccess: () => { setShowCerrarModal(false); setCerrarObs(''); } },
    );
  }

  async function handleDescargarPdf() {
    if (!acta) return;
    setPdfLoading(true);
    setPdfError('');
    try {
      await pdfApi.downloadActa(acta.id);
    } catch (e) {
      setPdfError((e as Error).message);
    } finally {
      setPdfLoading(false);
    }
  }

  function handleRectificar() {
    if (!acta || !confirm('¿Reabrir el acta para modificaciones?')) return;
    rectificarMutation.mutate(acta.id);
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Calificaciones</h1>
      </div>

      {/* Filtro */}
      <div style={styles.card}>
        <div style={styles.filterGrid}>
          <label style={styles.label}>
            Curso
            <select
              style={styles.select}
              value={form.curso_id}
              onChange={(e) => setForm((f) => ({ ...f, curso_id: e.target.value, materia_id: '' }))}
              disabled={loadingCursos}
            >
              <option value="">Seleccionar curso...</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.anio_academico})
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Materia
            <select
              style={styles.select}
              value={form.materia_id}
              onChange={(e) => setForm((f) => ({ ...f, materia_id: e.target.value }))}
              disabled={loadingMaterias || !form.curso_id}
            >
              <option value="">
                {!form.curso_id
                  ? 'Seleccioná un curso primero...'
                  : cursoMateriaIds !== undefined && materiasFiltradas.length === 0
                  ? 'Sin materias asignadas al curso'
                  : 'Seleccionar materia...'}
              </option>
              {materiasFiltradas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Período
            <input
              list="periodos-list"
              style={styles.input}
              value={form.periodo}
              onChange={(e) => setForm((f) => ({ ...f, periodo: e.target.value }))}
              placeholder="Ej: 1er trimestre"
            />
            <datalist id="periodos-list">
              {PERIODOS.map((p) => <option key={p} value={p} />)}
            </datalist>
          </label>

          <label style={styles.label}>
            Año académico
            <input
              type="number"
              style={styles.input}
              value={form.anio_academico}
              onChange={(e) => setForm((f) => ({ ...f, anio_academico: Number(e.target.value) }))}
              min={2000}
              max={2100}
            />
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            style={{
              ...styles.btnPrimary,
              opacity: (!form.curso_id || !form.materia_id || !form.periodo) ? 0.5 : 1,
            }}
            onClick={handleBuscar}
            disabled={!form.curso_id || !form.materia_id || !form.periodo}
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Resultados */}
      {searchParams && (
        <div style={{ marginTop: 24 }}>
          {loadingActa && <div style={styles.loading}>Buscando acta...</div>}

          {!loadingActa && isNotFound && (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No existe acta para estos parámetros.</p>
              {!esAlumno && (
                <>
                  <p style={{ ...styles.emptyText, fontSize: 13, color: '#94a3b8' }}>
                    Podés cargar la primera calificación y el acta se creará automáticamente.
                  </p>
                  <button style={styles.btnPrimary} onClick={handleCargar}>
                    + Cargar calificaciones
                  </button>
                </>
              )}
            </div>
          )}

          {!loadingActa && error && !isNotFound && (
            <div style={styles.errorState}>Error al cargar el acta. Intentá nuevamente.</div>
          )}

          {!loadingActa && acta && (
            <>
              {/* Info acta */}
              <div style={styles.actaCard}>
                <div style={styles.actaHeader}>
                  <div>
                    <div style={styles.actaTitle}>{acta.materia_nombre}</div>
                    <div style={styles.actaMeta}>
                      {acta.curso_nombre} · {acta.periodo} {acta.anio_academico}
                      {acta.promedio_general && (
                        <span style={styles.promedio}>
                          Promedio: {parseFloat(acta.promedio_general).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={styles.actaActions}>
                    <span style={{ ...styles.badge, ...(acta.estado === 'borrador' ? styles.badgeBorrador : styles.badgeCerrada) }}>
                      {acta.estado}
                    </span>
                    <button
                      style={styles.btnPdf}
                      onClick={handleDescargarPdf}
                      disabled={pdfLoading}
                      title="Descargar PDF con firma digital"
                    >
                      {pdfLoading ? 'Generando...' : '⬇ PDF'}
                    </button>
                    {acta.estado === 'borrador' && !esAlumno && (
                      <>
                        <button style={styles.btnSecondary} onClick={handleCargar}>
                          Cargar / editar notas
                        </button>
                        <button style={styles.btnDanger} onClick={() => setShowCerrarModal(true)}>
                          Cerrar acta
                        </button>
                      </>
                    )}
                    {acta.estado === 'cerrada' && isDirectivo && !esAlumno && (
                      <button
                        style={styles.btnSecondary}
                        onClick={handleRectificar}
                        disabled={rectificarMutation.isPending}
                      >
                        {rectificarMutation.isPending ? 'Procesando...' : 'Rectificar (reabrir)'}
                      </button>
                    )}
                  </div>
                </div>

                {pdfError && (
                <div style={{ padding: '8px 24px', background: '#fee2e2', color: '#b91c1c', fontSize: 13 }}>
                  {pdfError}
                </div>
              )}

              {/* Tabla de calificaciones */}
                {acta.calificaciones.length === 0 ? (
                  <p style={{ color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>
                    Sin calificaciones cargadas.
                  </p>
                ) : (
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {['Alumno', 'Legajo', 'Tipo', 'Nota', 'Equivalencia', 'Observaciones'].map((h) => (
                            <th key={h} style={styles.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {acta.calificaciones.map((c) => (
                          <tr key={c.id} style={styles.tr}>
                            <td style={styles.td}>{c.alumno_apellido}, {c.alumno_nombre}</td>
                            <td style={{ ...styles.td, ...styles.tdCode }}>{c.alumno_legajo}</td>
                            <td style={styles.td}>{TIPO_LABELS[c.tipo] ?? c.tipo}</td>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{c.nota_valor}</td>
                            <td style={styles.td}>
                              {c.nota_numerica ? Number(c.nota_numerica).toFixed(2) : '—'}
                            </td>
                            <td style={{ ...styles.td, color: '#64748b' }}>{c.observaciones ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal cerrar acta */}
      {showCerrarModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ margin: '0 0 8px' }}>Cerrar acta</h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>
              Una vez cerrada, no se podrán modificar las calificaciones sin rectificación directiva.
            </p>
            <label style={styles.modalLabel}>
              Observaciones (opcional)
              <textarea
                value={cerrarObs}
                onChange={(e) => setCerrarObs(e.target.value)}
                rows={3}
                style={styles.textarea}
                placeholder="Ej: Cierre de primer trimestre"
              />
            </label>
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setShowCerrarModal(false)}>
                Cancelar
              </button>
              <button
                style={styles.btnDanger}
                onClick={handleCerrar}
                disabled={cerrarMutation.isPending}
              >
                {cerrarMutation.isPending ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: 24 },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #e2e8f0',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#374151', fontWeight: 500 },
  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    background: '#fff',
  },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  btnPrimary: {
    padding: '10px 24px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '9px 18px',
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  btnPdf: {
    padding: '9px 14px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  btnDanger: {
    padding: '9px 18px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  emptyState: {
    background: '#fff',
    borderRadius: 12,
    padding: 40,
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { margin: 0, fontSize: 15, color: '#475569' },
  errorState: {
    background: '#fee2e2',
    color: '#b91c1c',
    borderRadius: 12,
    padding: 20,
    fontSize: 14,
  },
  actaCard: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  actaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px',
    borderBottom: '1px solid #f1f5f9',
    gap: 16,
    flexWrap: 'wrap',
  },
  actaTitle: { fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 },
  actaMeta: { fontSize: 14, color: '#64748b', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  promedio: {
    background: '#dbeafe',
    color: '#1d4ed8',
    padding: '2px 10px',
    borderRadius: 20,
    fontWeight: 600,
    fontSize: 13,
  },
  actaActions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  badgeBorrador: { background: '#fef9c3', color: '#854d0e' },
  badgeCerrada: { background: '#dcfce7', color: '#15803d' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 16px', fontSize: 14, color: '#0f172a' },
  tdCode: { fontFamily: 'monospace', fontSize: 13, color: '#475569' },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 12, padding: 32,
    width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16,
  },
  modalLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#374151' },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical' },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
};
