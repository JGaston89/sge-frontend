import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { useAlumno } from '../hooks/useAlumnos';
import { inscripcionesApi } from '../../../api/inscripciones.api';
import { pdfApi } from '../../../api/pdf.api';
import { ESTADO_COLORS } from '../../../shared/types/inscripciones.types';

export function HistorialAcademicoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const { data: alumno, isLoading: loadingAlumno, isError: errorAlumno } = useAlumno(id!);
  const { data: rawInscripciones = [], isLoading: loadingInscripciones, isError: errorInscripciones } = useQuery({
    queryKey: ['inscripciones-alumno', id],
    queryFn: () => inscripcionesApi.listarPorAlumno(id!),
    enabled: !!id,
  });

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  const isError = errorAlumno || errorInscripciones;
  const inscripciones = [...rawInscripciones].sort((a, b) => b.ciclo_lectivo - a.ciclo_lectivo);

  const primerAnio  = inscripciones.length ? inscripciones[inscripciones.length - 1].ciclo_lectivo : null;
  const ultimoAnio  = inscripciones.length ? inscripciones[0].ciclo_lectivo : null;
  const cursoActual = inscripciones.length ? inscripciones[0].curso_nombre : null;

  async function handleDownload() {
    setDownloadError('');
    setDownloading(true);
    try {
      await pdfApi.downloadFicha(id!);
    } catch (e) {
      setDownloadError((e as Error).message ?? 'Error al generar el PDF');
    } finally {
      setDownloading(false);
    }
  }

  const isLoading = loadingAlumno || loadingInscripciones;

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
            {loadingAlumno
              ? 'Cargando...'
              : alumno
              ? `${alumno.apellido}, ${alumno.nombre}`
              : 'Alumno no encontrado'}
          </h1>
          <p style={S.subtitle}>Historial Académico</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {alumno && <span style={S.legajoBadge}>Leg. {alumno.legajo}</span>}
          <button
            style={{ ...S.btnPdf, opacity: downloading ? 0.6 : 1 }}
            onClick={handleDownload}
            disabled={downloading || isLoading}
            title="Descargar ficha completa (incluye historial)"
          >
            {downloading ? 'Generando...' : '⬇ Descargar PDF'}
          </button>
        </div>
      </div>

      {downloadError && (
        <div style={S.errorBar} onClick={() => setDownloadError('')}>
          {downloadError} <span style={{ float: 'right', cursor: 'pointer' }}>✕</span>
        </div>
      )}

      {/* ── Stats ── */}
      {!isLoading && inscripciones.length > 0 && (
        <div style={S.statsRow}>
          <StatCard
            label="Ciclos cursados"
            value={String(inscripciones.length)}
            color="#2563eb"
            bg="#eff6ff"
          />
          <StatCard
            label="Primer ingreso"
            value={primerAnio ? String(primerAnio) : '—'}
            color="#16a34a"
            bg="#f0fdf4"
          />
          <StatCard
            label="Último ciclo"
            value={ultimoAnio ? String(ultimoAnio) : '—'}
            color="#9333ea"
            bg="#fdf4ff"
          />
          <StatCard
            label="Curso actual"
            value={cursoActual ?? '—'}
            color="#ea580c"
            bg="#fff7ed"
          />
        </div>
      )}

      {/* ── Tabla ── */}
      <div style={S.card}>
        {isLoading && (
          <p style={S.empty}>Cargando historial...</p>
        )}

        {!isLoading && isError && (
          <p style={{ ...S.empty, color: '#dc2626' }}>Error al cargar el historial. Intente nuevamente.</p>
        )}

        {!isLoading && !isError && inscripciones.length === 0 && (
          <p style={S.empty}>No hay inscripciones registradas para este alumno.</p>
        )}

        {!isLoading && !isError && inscripciones.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Ciclo Lectivo', 'Curso', 'Estado', 'Fecha de inscripción', 'Observaciones'].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inscripciones.map((ins, i) => (
                  <tr
                    key={ins.id}
                    style={{ ...S.tr, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                  >
                    <td style={{ ...S.td, fontWeight: 700, fontSize: 15 }}>
                      {ins.ciclo_lectivo}
                    </td>
                    <td style={S.td}>{ins.curso_nombre}</td>
                    <td style={S.td}>
                      <span style={{ ...S.estadoBadge, ...ESTADO_COLORS[ins.estado] }}>
                        {ins.estado}
                      </span>
                    </td>
                    <td style={S.td}>
                      {new Date(ins.fecha_inscripcion).toLocaleDateString('es-AR')}
                    </td>
                    <td style={{ ...S.td, color: '#64748b' }}>
                      {ins.observaciones ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ ...S.statCard, background: bg, borderColor: color + '30' }}>
      <span style={{ ...S.statValue, color }}>{value}</span>
      <span style={S.statLabel}>{label}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900 },
  breadcrumb: { marginBottom: 12 },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 24,
  },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  legajoBadge: {
    padding: '4px 12px', background: '#f1f5f9',
    borderRadius: 6, fontSize: 13, color: '#475569',
  },
  btnPdf: {
    padding: '9px 18px', background: '#0f172a', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  errorBar: {
    background: '#fee2e2', color: '#b91c1c',
    padding: '10px 16px', borderRadius: 8, fontSize: 13,
    marginBottom: 16, cursor: 'pointer',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 14,
    marginBottom: 20,
  },
  statCard: {
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '16px 20px', borderRadius: 12,
    border: '1px solid transparent',
  },
  statValue: { fontSize: 24, fontWeight: 700 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: 500 },
  card: {
    background: '#fff', borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
  },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' },
  td: { padding: '12px 16px', fontSize: 14, color: '#0f172a' },
  estadoBadge: {
    display: 'inline-block', padding: '3px 12px',
    borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
};
