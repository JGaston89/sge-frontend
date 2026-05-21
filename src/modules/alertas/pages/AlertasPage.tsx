import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { alertasApi } from '../../../api/alertas.api';
import { pdfApi } from '../../../api/pdf.api';
import { useCursos } from '../../calificaciones/hooks/useCalificaciones';
import {
  NIVEL_RIESGO_STYLES,
  NIVEL_RIESGO_LABEL,
  type NivelRiesgo,
  type AlertaAlumno,
  type AlertasByCursoResponse,
} from '../../../shared/types/alertas.types';

const PERIODOS = [
  '1er trimestre',
  '2do trimestre',
  '3er trimestre',
  '1er cuatrimestre',
  '2do cuatrimestre',
];

function NivelBadge({ nivel }: { nivel: NivelRiesgo }) {
  return (
    <span
      style={{
        ...NIVEL_RIESGO_STYLES[nivel],
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {NIVEL_RIESGO_LABEL[nivel]}
    </span>
  );
}

function ResumenCard({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div style={{ ...styles.card, background: bg, flex: 1, minWidth: 120, textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{count}</div>
      <div style={{ fontSize: 13, color, fontWeight: 500, marginTop: 4 }}>{label}</div>
    </div>
  );
}

interface FilterState {
  curso_id: string;
  ciclo_lectivo: number;
  periodo: string;
}

export function AlertasPage() {
  const { data: cursos = [], isLoading: loadingCursos } = useCursos();

  const [form, setForm] = useState<FilterState>({
    curso_id: '',
    ciclo_lectivo: new Date().getFullYear(),
    periodo: '',
  });
  const [params, setParams] = useState<FilterState | null>(null);
  const [nivelFiltro, setNivelFiltro] = useState<NivelRiesgo | ''>('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading, error } = useQuery<AlertasByCursoResponse>({
    queryKey: ['alertas', 'curso', params],
    queryFn: () =>
      alertasApi.listarPorCurso(
        params!.curso_id,
        params!.ciclo_lectivo,
        params!.periodo || undefined,
      ),
    enabled: !!params?.curso_id,
  });

  function handleBuscar() {
    if (!form.curso_id) return;
    setParams({ ...form });
    setNivelFiltro('');
  }

  async function handleExportPdf() {
    if (!params) return;
    setPdfLoading(true);
    try {
      await pdfApi.downloadAlertas(params.curso_id, params.ciclo_lectivo, params.periodo || undefined);
    } finally {
      setPdfLoading(false);
    }
  }

  const alumnosFiltrados: AlertaAlumno[] = (data?.alumnos ?? []).filter(
    (a) => !nivelFiltro || a.nivel_riesgo === nivelFiltro,
  );

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.title}>Alertas de Riesgo Academico</h1>
        <p style={styles.subtitle}>
          Identifica alumnos en riesgo segun su rendimiento academico en el ciclo lectivo.
        </p>
      </div>

      {/* Filtros */}
      <div style={styles.card}>
        <div style={styles.filterGrid}>
          <label style={styles.label}>
            Curso
            <select
              style={styles.select}
              value={form.curso_id}
              onChange={(e) => setForm((f) => ({ ...f, curso_id: e.target.value }))}
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
            Ciclo lectivo
            <input
              type="number"
              style={styles.input}
              value={form.ciclo_lectivo}
              onChange={(e) => setForm((f) => ({ ...f, ciclo_lectivo: Number(e.target.value) }))}
              min={2000}
              max={2100}
            />
          </label>

          <label style={styles.label}>
            Periodo (opcional)
            <input
              list="periodos-list"
              style={styles.input}
              value={form.periodo}
              onChange={(e) => setForm((f) => ({ ...f, periodo: e.target.value }))}
              placeholder="Todos los periodos"
            />
            <datalist id="periodos-list">
              {PERIODOS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            style={{ ...styles.btnPrimary, opacity: !form.curso_id ? 0.5 : 1 }}
            onClick={handleBuscar}
            disabled={!form.curso_id}
          >
            Analizar riesgo
          </button>
        </div>
      </div>

      {/* Resultados */}
      {params && (
        <div style={{ marginTop: 24 }}>
          {isLoading && <div style={styles.loading}>Calculando riesgo academico...</div>}

          {error && (
            <div style={styles.errorBox}>Error al cargar alertas. Intenta nuevamente.</div>
          )}

          {data && (
            <>
              {/* Tarjetas resumen */}
              <div style={styles.resumenGrid}>
                <ResumenCard
                  label="Total alumnos"
                  count={data.resumen.total}
                  color="#1e293b"
                  bg="#f8fafc"
                />
                <ResumenCard
                  label="Riesgo alto"
                  count={data.resumen.alto}
                  color="#b91c1c"
                  bg="#fee2e2"
                />
                <ResumenCard
                  label="Riesgo medio"
                  count={data.resumen.medio}
                  color="#854d0e"
                  bg="#fef9c3"
                />
                <ResumenCard
                  label="Sin riesgo"
                  count={data.resumen.bajo}
                  color="#15803d"
                  bg="#dcfce7"
                />
                <ResumenCard
                  label="Sin datos"
                  count={data.resumen.sin_datos}
                  color="#64748b"
                  bg="#f1f5f9"
                />
              </div>

              {/* Filtro por nivel + Exportar */}
              <div style={{ ...styles.nivelFilterRow, justifyContent: 'space-between' }}>
                <div style={styles.nivelFilterRow}>
                  <span style={styles.filterLabel}>Filtrar:</span>
                  {(['', 'alto', 'medio', 'bajo', 'sin_datos'] as const).map((n) => (
                    <button
                      key={n}
                      style={{
                        ...styles.filterChip,
                        ...(nivelFiltro === n ? styles.filterChipActive : {}),
                      }}
                      onClick={() => setNivelFiltro(n)}
                    >
                      {n === '' ? 'Todos' : NIVEL_RIESGO_LABEL[n]}
                    </button>
                  ))}
                </div>
                <button
                  style={styles.btnExport}
                  onClick={handleExportPdf}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? 'Generando...' : '⬇ Exportar PDF'}
                </button>
              </div>

              {/* Tabla */}
              {alumnosFiltrados.length === 0 ? (
                <div style={styles.emptyBox}>
                  No hay alumnos con ese nivel de riesgo en el curso seleccionado.
                </div>
              ) : (
                <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {[
                            'Alumno',
                            'Legajo',
                            'Promedio',
                            'Materias eval.',
                            'Desaprobadas',
                            'Nivel riesgo',
                            'Motivos',
                          ].map((h) => (
                            <th key={h} style={styles.th}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {alumnosFiltrados.map((a) => (
                          <tr
                            key={a.alumno_id}
                            style={{
                              ...styles.tr,
                              background:
                                a.nivel_riesgo === 'alto'
                                  ? 'rgba(254,226,226,0.3)'
                                  : a.nivel_riesgo === 'medio'
                                    ? 'rgba(254,249,195,0.3)'
                                    : undefined,
                            }}
                          >
                            <td style={styles.td}>
                              <span style={{ fontWeight: 600 }}>{a.alumno_apellido}</span>
                              {', '}
                              {a.alumno_nombre}
                            </td>
                            <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 13 }}>
                              {a.alumno_legajo}
                            </td>
                            <td style={{ ...styles.td, fontWeight: 700, fontSize: 15 }}>
                              {a.promedio_general !== null ? (
                                <span
                                  style={{
                                    color:
                                      a.promedio_general < 6
                                        ? '#b91c1c'
                                        : a.promedio_general < 7
                                          ? '#854d0e'
                                          : '#15803d',
                                  }}
                                >
                                  {Number(a.promedio_general).toFixed(2)}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {a.materias_evaluadas}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {a.materias_desaprobadas > 0 ? (
                                <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                                  {a.materias_desaprobadas}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>0</span>
                              )}
                            </td>
                            <td style={styles.td}>
                              <NivelBadge nivel={a.nivel_riesgo} />
                            </td>
                            <td style={{ ...styles.td, maxWidth: 280 }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {a.motivos.map((m, i) => (
                                  <span key={i} style={styles.motivoChip}>
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: 24 },
  title: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: 0, fontSize: 14, color: '#64748b' },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #e2e8f0',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 14,
    color: '#374151',
    fontWeight: 500,
  },
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
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  errorBox: {
    background: '#fee2e2',
    color: '#b91c1c',
    borderRadius: 12,
    padding: 20,
    fontSize: 14,
  },
  resumenGrid: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  nivelFilterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterLabel: { fontSize: 13, color: '#64748b', fontWeight: 500 },
  filterChip: {
    padding: '5px 14px',
    borderRadius: 20,
    border: '1px solid #d1d5db',
    background: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    color: '#374151',
  },
  filterChipActive: {
    background: '#1e293b',
    color: '#fff',
    borderColor: '#1e293b',
  },
  btnExport: {
    padding: '6px 16px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  emptyBox: {
    background: '#fff',
    borderRadius: 12,
    padding: 40,
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    color: '#64748b',
    fontSize: 15,
  },
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
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 16px', fontSize: 14, color: '#0f172a', verticalAlign: 'middle' },
  motivoChip: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    background: '#f1f5f9',
    color: '#475569',
    fontSize: 12,
    border: '1px solid #e2e8f0',
  },
};
