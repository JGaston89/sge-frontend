import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { calificacionesApi } from '../../../api/calificaciones.api';
import { inscripcionesApi } from '../../../api/inscripciones.api';
import { pdfApi } from '../../../api/pdf.api';
import { ESTADO_COLORS } from '../../../shared/types/inscripciones.types';

export function BuscarCursoPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuthContext();
  const cursoId = searchParams.get('cursoId') ?? '';
  const anio    = parseInt(searchParams.get('anio') ?? '0', 10);

  const [filtro, setFiltro]           = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorId, setErrorId]         = useState<string | null>(null);

  const { data: cursos = [] } = useQuery({
    queryKey: ['calificaciones', 'cursos'],
    queryFn:  calificacionesApi.getCursos,
  });

  const { data: inscripciones = [], isLoading, isError } = useQuery({
    queryKey: ['inscripciones-curso', cursoId, anio],
    queryFn:  () => inscripcionesApi.listar(cursoId, anio),
    enabled:  !!cursoId && !!anio,
  });

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  const curso = cursos.find((c) => c.id === cursoId);
  const cursoNombre = curso
    ? `${curso.nombre}${curso.turno ? ` — ${curso.turno}` : ''}`
    : '—';

  // Ordenar por apellido y filtrar
  const filtroLower = filtro.toLowerCase();
  const lista = [...inscripciones]
    .sort((a, b) => a.alumno_apellido.localeCompare(b.alumno_apellido, 'es'))
    .filter((ins) =>
      !filtroLower ||
      ins.alumno_apellido.toLowerCase().includes(filtroLower) ||
      ins.alumno_nombre.toLowerCase().includes(filtroLower) ||
      ins.alumno_legajo.toLowerCase().includes(filtroLower),
    );

  // Contadores por estado
  const contadores = {
    regular: inscripciones.filter((i) => i.estado === 'regular').length,
    libre:   inscripciones.filter((i) => i.estado === 'libre').length,
    baja:    inscripciones.filter((i) => i.estado === 'baja').length,
  };

  async function handleDownload(alumnoId: string, legajo: string) {
    setErrorId(null);
    setDownloadingId(alumnoId);
    try {
      await pdfApi.downloadFicha(alumnoId);
    } catch (e) {
      setErrorId(alumnoId);
      setTimeout(() => setErrorId(null), 3000);
      console.error('Error al descargar ficha', legajo, e);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div style={S.page}>

      {/* ── Breadcrumb ── */}
      <div style={S.breadcrumb}>
        <Link to="/alumnos" style={S.back}>← Gestión de Alumnos</Link>
      </div>

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>
            {cursoNombre} · {anio || '—'}
          </h1>
          <p style={S.subtitle}>Alumnos inscriptos en el curso</p>
        </div>
      </div>

      {/* ── Stats ── */}
      {!isLoading && inscripciones.length > 0 && (
        <div style={S.statsRow}>
          <StatCard label="Total inscriptos" value={inscripciones.length} color="#0f172a" bg="#f8fafc" />
          <StatCard label="Regulares"        value={contadores.regular}   color="#16a34a" bg="#f0fdf4" />
          <StatCard label="Libres"           value={contadores.libre}     color="#ca8a04" bg="#fefce8" />
          <StatCard label="Baja"             value={contadores.baja}      color="#dc2626" bg="#fef2f2" />
        </div>
      )}

      {/* ── Tabla ── */}
      <div style={S.card}>

        {/* Barra de búsqueda */}
        {!isLoading && inscripciones.length > 0 && (
          <div style={S.searchBar}>
            <input
              style={S.searchInput}
              placeholder="Filtrar por apellido, nombre o legajo..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            {filtro && (
              <span style={S.filtroInfo}>
                {lista.length} de {inscripciones.length} alumnos
              </span>
            )}
          </div>
        )}

        {/* Estados */}
        {isLoading && <p style={S.empty}>Cargando alumnos del curso...</p>}

        {!isLoading && isError && (
          <p style={{ ...S.empty, color: '#dc2626' }}>Error al cargar los alumnos. Intente nuevamente.</p>
        )}

        {!isLoading && !isError && !cursoId && (
          <p style={S.empty}>Parámetros de búsqueda inválidos.</p>
        )}

        {!isLoading && !isError && cursoId && inscripciones.length === 0 && (
          <p style={S.empty}>No hay alumnos inscriptos en este curso para el ciclo {anio}.</p>
        )}

        {!isLoading && !isError && lista.length === 0 && inscripciones.length > 0 && (
          <p style={S.empty}>Ningún alumno coincide con "{filtro}".</p>
        )}

        {/* Tabla */}
        {!isLoading && !isError && lista.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 40 }}>#</th>
                  <th style={S.th}>Alumno</th>
                  <th style={S.th}>Legajo</th>
                  <th style={S.th}>Estado</th>
                  <th style={S.th}>Fecha inscripción</th>
                  <th style={S.th}>Observaciones</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Ficha PDF</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((ins, i) => {
                  const isDownloading = downloadingId === ins.alumno_id;
                  const hasError      = errorId === ins.alumno_id;
                  return (
                    <tr
                      key={ins.id}
                      style={{ ...S.tr, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                    >
                      <td style={{ ...S.td, color: '#94a3b8', fontSize: 13 }}>{i + 1}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>
                        {ins.alumno_apellido}, {ins.alumno_nombre}
                      </td>
                      <td style={{ ...S.td }}>
                        <code style={S.legajoBadge}>{ins.alumno_legajo}</code>
                      </td>
                      <td style={S.td}>
                        <span style={{ ...S.estadoBadge, ...ESTADO_COLORS[ins.estado] }}>
                          {ins.estado}
                        </span>
                      </td>
                      <td style={S.td}>
                        {new Date(ins.fecha_inscripcion).toLocaleDateString('es-AR')}
                      </td>
                      <td style={{ ...S.td, color: '#64748b', fontSize: 13 }}>
                        {ins.observaciones ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <button
                          style={{
                            ...S.btnPdf,
                            ...(isDownloading ? S.btnPdfLoading : {}),
                            ...(hasError ? S.btnPdfError : {}),
                          }}
                          disabled={!!downloadingId}
                          onClick={() => handleDownload(ins.alumno_id, ins.alumno_legajo)}
                          title={`Descargar ficha de ${ins.alumno_apellido}, ${ins.alumno_nombre}`}
                        >
                          {isDownloading ? '...' : hasError ? '✕' : '⬇'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ ...S.statCard, background: bg }}>
      <span style={{ ...S.statValue, color }}>{value}</span>
      <span style={S.statLabel}>{label}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 960 },
  breadcrumb: { marginBottom: 12 },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  header: { marginBottom: 20 },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    display: 'flex', flexDirection: 'column', gap: 3,
    padding: '14px 18px', borderRadius: 10,
    border: '1px solid #e2e8f0',
  },
  statValue: { fontSize: 26, fontWeight: 800 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: 500 },

  card: {
    background: '#fff', borderRadius: 12,
    border: '1px solid #e2e8f0', overflow: 'hidden',
  },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
  },
  searchInput: {
    flex: 1, padding: '8px 12px',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 14, outline: 'none',
  },
  filtroInfo: { fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' },

  empty: { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '11px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '11px 14px', fontSize: 14, color: '#0f172a' },

  legajoBadge: {
    fontSize: 12, background: '#f1f5f9',
    padding: '2px 7px', borderRadius: 4, color: '#475569',
  },
  estadoBadge: {
    display: 'inline-block', padding: '3px 10px',
    borderRadius: 20, fontSize: 12, fontWeight: 600,
  },

  btnPdf: {
    width: 34, height: 30,
    background: '#0f172a', color: '#fff',
    border: 'none', borderRadius: 7,
    cursor: 'pointer', fontSize: 14,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.15s',
  },
  btnPdfLoading: { opacity: 0.5, cursor: 'not-allowed' },
  btnPdfError: { background: '#dc2626' },
};
