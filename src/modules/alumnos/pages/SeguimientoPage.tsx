import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { useAlumno } from '../hooks/useAlumnos';
import { calificacionesApi } from '../../../api/calificaciones.api';
import type { CalificacionAlumno } from '../../../shared/types/calificaciones.types';

// ─── Tipos internos ───────────────────────────────────────────

interface AnioStats {
  anio: number;
  promedio: number;
  entradas: number;
}

interface MateriaStats {
  nombre: string;
  anios: AnioStats[];
  promedioGlobal: number | null;
  tieneNumericas: boolean;
}

// ─── Agregación ───────────────────────────────────────────────

function calcularSeguimiento(cals: CalificacionAlumno[]): MateriaStats[] {
  const byMateria = new Map<string, CalificacionAlumno[]>();
  for (const cal of cals) {
    if (!byMateria.has(cal.materia_nombre)) byMateria.set(cal.materia_nombre, []);
    byMateria.get(cal.materia_nombre)!.push(cal);
  }

  const stats: MateriaStats[] = [];

  for (const [nombre, entries] of byMateria) {
    const byAnio = new Map<number, number[]>();
    for (const e of entries) {
      if (e.nota_numerica !== null) {
        const val = parseFloat(e.nota_numerica);
        if (!isNaN(val)) {
          if (!byAnio.has(e.anio_academico)) byAnio.set(e.anio_academico, []);
          byAnio.get(e.anio_academico)!.push(val);
        }
      }
    }

    const anios: AnioStats[] = [...byAnio.entries()]
      .map(([anio, vals]) => ({
        anio,
        promedio: vals.reduce((a, b) => a + b, 0) / vals.length,
        entradas: vals.length,
      }))
      .sort((a, b) => a.anio - b.anio);

    const allVals = [...byAnio.values()].flat();
    const promedioGlobal = allVals.length
      ? allVals.reduce((a, b) => a + b, 0) / allVals.length
      : null;

    stats.push({ nombre, anios, promedioGlobal, tieneNumericas: allVals.length > 0 });
  }

  return stats.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// ─── Helpers de color ─────────────────────────────────────────

function colorNota(val: number | null): string {
  if (val === null) return '#94a3b8';
  if (val >= 7) return '#16a34a';
  if (val >= 5) return '#ca8a04';
  return '#dc2626';
}

function bgNota(val: number | null): string {
  if (val === null) return '#f8fafc';
  if (val >= 7) return '#f0fdf4';
  if (val >= 5) return '#fefce8';
  return '#fef2f2';
}

function borderNota(val: number | null): string {
  if (val === null) return '#e2e8f0';
  if (val >= 7) return '#86efac';
  if (val >= 5) return '#fde047';
  return '#fca5a5';
}

// ─── Mini bar chart ───────────────────────────────────────────

function MiniBarChart({ anios }: { anios: AnioStats[] }) {
  if (anios.length === 0) {
    return <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, paddingTop: 8 }}>Sin calificaciones numéricas</p>;
  }

  const BAR_H = 60;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: BAR_H + 36, marginTop: 12 }}>
      {anios.map(({ anio, promedio }) => {
        const h = Math.max(4, Math.round((promedio / 10) * BAR_H));
        const color = colorNota(promedio);
        return (
          <div
            key={anio}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 24 }}
            title={`${anio}: ${promedio.toFixed(2)}`}
          >
            <span style={{ fontSize: 9, color: '#64748b', marginBottom: 2, fontWeight: 600 }}>
              {promedio.toFixed(1)}
            </span>
            <div
              style={{
                width: '100%', maxWidth: 36, height: h,
                background: color, borderRadius: '3px 3px 0 0',
                opacity: 0.85,
              }}
            />
            <div style={{ width: '100%', maxWidth: 36, height: 3, background: '#e2e8f0' }} />
            <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>{anio}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tarjeta de materia ───────────────────────────────────────

function MateriaCard({ materia }: { materia: MateriaStats }) {
  const color  = colorNota(materia.promedioGlobal);
  const bg     = bgNota(materia.promedioGlobal);
  const border = borderNota(materia.promedioGlobal);

  return (
    <div style={{ ...S.materiaCard, background: bg, borderColor: border }}>
      <div style={S.materiaHeader}>
        <span style={S.materiaNombre}>{materia.nombre}</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ ...S.promedioGlobal, color }}>
            {materia.promedioGlobal !== null ? materia.promedioGlobal.toFixed(2) : '—'}
          </span>
          <span style={S.promedioLabel}>promedio global</span>
        </div>
      </div>

      <div style={S.aniosInfo}>
        {materia.anios.length > 0 && (
          <span style={S.aniosBadge}>
            {materia.anios.length} {materia.anios.length === 1 ? 'año' : 'años'} ·{' '}
            {materia.anios[0].anio}
            {materia.anios.length > 1 ? `–${materia.anios[materia.anios.length - 1].anio}` : ''}
          </span>
        )}
      </div>

      <MiniBarChart anios={materia.anios} />
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────

export function SeguimientoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();

  const { data: alumno, isLoading: loadingAlumno, isError: errorAlumno } = useAlumno(id!);
  const { data: calificaciones = [], isLoading: loadingCals, isError: errorCals } = useQuery({
    queryKey: ['calificaciones-alumno', id],
    queryFn: () => calificacionesApi.getCalificacionesAlumno(id!),
    enabled: !!id,
  });

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  const isLoading = loadingAlumno || loadingCals;
  const isError   = errorAlumno || errorCals;
  const materias  = calcularSeguimiento(calificaciones);
  const edad = (() => {
    const fn = alumno?.fecha_nacimiento;
    if (!fn) return null;
    const d = new Date(fn.includes('T') ? fn : fn + 'T00:00:00');
    return isNaN(d.getTime()) ? null : Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  })();

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
          <p style={S.subtitle}>Seguimiento y Trayectoria Académica</p>
        </div>
        {alumno && <span style={S.legajoBadge}>Leg. {alumno.legajo}</span>}
      </div>

      {/* ── Tarjeta del alumno ── */}
      {alumno && (
        <div style={S.alumnoCard}>
          <div style={S.alumnoAvatar}>
            {alumno.apellido.charAt(0)}{alumno.nombre.charAt(0)}
          </div>
          <div style={S.alumnoInfo}>
            <div style={S.alumnoNombre}>{alumno.apellido}, {alumno.nombre}</div>
            <div style={S.alumnoDatos}>
              <InfoChip label="DNI"   value={alumno.dni} />
              <InfoChip label="Edad"  value={edad !== null ? `${edad} años` : '—'} />
              <InfoChip label="Estado" value={alumno.estado} />
              {alumno.domicilio && <InfoChip label="Domicilio" value={alumno.domicilio} />}
            </div>
          </div>
          {materias.length > 0 && (
            <div style={S.resumenStats}>
              <div style={S.resumenItem}>
                <span style={S.resumenVal}>{materias.length}</span>
                <span style={S.resumenLbl}>materias</span>
              </div>
              <div style={S.resumenItem}>
                <span style={{ ...S.resumenVal, color: '#16a34a' }}>
                  {materias.filter((m) => m.promedioGlobal !== null && m.promedioGlobal >= 7).length}
                </span>
                <span style={S.resumenLbl}>aprobadas ≥7</span>
              </div>
              <div style={S.resumenItem}>
                <span style={{ ...S.resumenVal, color: '#dc2626' }}>
                  {materias.filter((m) => m.promedioGlobal !== null && m.promedioGlobal < 6).length}
                </span>
                <span style={S.resumenLbl}>bajo nivel</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Estados de carga / vacío ── */}
      {isLoading && (
        <p style={S.empty}>Cargando trayectoria...</p>
      )}

      {!isLoading && isError && (
        <p style={{ ...S.empty, color: '#dc2626' }}>Error al cargar la trayectoria. Intente nuevamente.</p>
      )}

      {!isLoading && !isError && calificaciones.length === 0 && (
        <div style={S.emptyCard}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            No hay calificaciones registradas para este alumno.
          </p>
        </div>
      )}

      {/* ── Grid de materias ── */}
      {!isLoading && !isError && materias.length > 0 && (
        <>
          <div style={S.sectionTitle}>
            Rendimiento por Materia
            <span style={S.sectionSub}> — promedio histórico en cada materia cursada</span>
          </div>
          <div style={S.materiasGrid}>
            {materias.map((m) => (
              <MateriaCard key={m.nombre} materia={m} />
            ))}
          </div>
        </>
      )}

    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.chip}>
      <span style={S.chipLabel}>{label}</span>
      <span style={S.chipValue}>{value}</span>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100 },
  breadcrumb: { marginBottom: 12 },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  legajoBadge: {
    padding: '4px 12px', background: '#f1f5f9',
    borderRadius: 6, fontSize: 13, color: '#475569', alignSelf: 'flex-start',
  },

  // Alumno card
  alumnoCard: {
    display: 'flex', alignItems: 'flex-start', gap: 20,
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 14, padding: '20px 24px', marginBottom: 28,
    flexWrap: 'wrap',
  },
  alumnoAvatar: {
    width: 56, height: 56, borderRadius: '50%',
    background: '#1e3a5f', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 700, flexShrink: 0,
  },
  alumnoInfo: { flex: 1 },
  alumnoNombre: { fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 10 },
  alumnoDatos: { display: 'flex', gap: 10, flexWrap: 'wrap' },

  chip: {
    display: 'flex', flexDirection: 'column',
    background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '6px 12px',
  },
  chipLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  chipValue: { fontSize: 13, color: '#0f172a', fontWeight: 600, marginTop: 1 },

  resumenStats: {
    display: 'flex', gap: 16, alignItems: 'center',
    borderLeft: '1px solid #f1f5f9', paddingLeft: 20, flexShrink: 0,
  },
  resumenItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  resumenVal: { fontSize: 24, fontWeight: 700, color: '#0f172a' },
  resumenLbl: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },

  // Section
  sectionTitle: {
    fontSize: 15, fontWeight: 700, color: '#0f172a',
    marginBottom: 14,
  },
  sectionSub: { fontSize: 13, fontWeight: 400, color: '#94a3b8' },

  // Grid materias
  materiasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 14,
  },

  materiaCard: {
    borderRadius: 12, border: '1.5px solid',
    padding: '16px 18px',
  },
  materiaHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 8,
  },
  materiaNombre: {
    fontSize: 14, fontWeight: 700, color: '#0f172a',
    lineHeight: 1.3, flex: 1,
  },
  promedioGlobal: { fontSize: 22, fontWeight: 800, display: 'block' },
  promedioLabel: { fontSize: 10, color: '#94a3b8', display: 'block', textAlign: 'right' },

  aniosInfo: { marginTop: 6 },
  aniosBadge: {
    fontSize: 11, color: '#64748b',
    background: 'rgba(255,255,255,0.6)', padding: '2px 8px',
    borderRadius: 20, display: 'inline-block',
  },

  // Empty states
  empty: { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  emptyCard: {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 14, padding: 48, textAlign: 'center',
  },
};
