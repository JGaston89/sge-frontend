import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { AlumnoAutocomplete } from '../components/AlumnoAutocomplete';
import { FichaCompletaModal } from '../components/modals/FichaCompletaModal';
import { calificacionesApi } from '../../../api/calificaciones.api';
import type { SelectedAlumno } from '../components/AlumnoAutocomplete';

export function AlumnosHubPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // ── Ficha Completa
  const [fichaAlumno, setFichaAlumno] = useState<SelectedAlumno | null>(null);
  const [showFicha, setShowFicha] = useState(false);

  // ── Historial Académico
  const [historialAlumno, setHistorialAlumno] = useState<SelectedAlumno | null>(null);

  // ── Seguimiento
  const [seguimientoAlumno, setSeguimientoAlumno] = useState<SelectedAlumno | null>(null);

  // ── Buscar Curso
  const [cursoId, setCursoId] = useState('');
  const [anio, setAnio] = useState('');

  const { data: cursos = [] } = useQuery({
    queryKey: ['calificaciones', 'cursos'],
    queryFn: calificacionesApi.getCursos,
  });

  const aniosDisponibles = [...new Set(cursos.map((c) => c.anio_academico))].sort((a, b) => b - a);

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  return (
    <div>
      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Gestión de Alumnos</h1>
          <p style={S.subtitle}>Legajos, inscripciones e historial académico</p>
        </div>
        <Link to="/alumnos/nuevo" style={S.btnNuevo}>+ Agregar Alumno</Link>
      </div>

      {/* ── Grid de 4 tarjetas ── */}
      <div style={S.grid}>

        {/* ── Tarjeta 1: Ficha Completa ── */}
        <div style={S.card}>
          <div style={S.cardTop}>
            <div style={{ ...S.cardIcon, background: '#eff6ff', color: '#2563eb' }}>📋</div>
            <h2 style={S.cardTitle}>Ficha Completa</h2>
            <p style={S.cardDesc}>Legajo completo con documentación adjunta y datos personales</p>
          </div>
          <div style={S.cardBody}>
            <AlumnoAutocomplete onSelect={setFichaAlumno} />
          </div>
          <div style={S.cardFooter}>
            <button
              style={{ ...S.btnBuscar, opacity: fichaAlumno ? 1 : 0.45 }}
              disabled={!fichaAlumno}
              onClick={() => setShowFicha(true)}
            >
              Ver Ficha
            </button>
          </div>
        </div>

        {/* ── Tarjeta 2: Historial Académico ── */}
        <div style={S.card}>
          <div style={S.cardTop}>
            <div style={{ ...S.cardIcon, background: '#f0fdf4', color: '#16a34a' }}>📅</div>
            <h2 style={S.cardTitle}>Historial Académico</h2>
            <p style={S.cardDesc}>Años cursados, cursos y condición por ciclo lectivo</p>
          </div>
          <div style={S.cardBody}>
            <AlumnoAutocomplete onSelect={setHistorialAlumno} />
          </div>
          <div style={S.cardFooter}>
            <button
              style={{ ...S.btnBuscar, opacity: historialAlumno ? 1 : 0.45 }}
              disabled={!historialAlumno}
              onClick={() => navigate(`/alumnos/${historialAlumno!.id}/historial-academico`)}
            >
              Ver Historial
            </button>
          </div>
        </div>

        {/* ── Tarjeta 3: Seguimiento y Trayectoria ── */}
        <div style={S.card}>
          <div style={S.cardTop}>
            <div style={{ ...S.cardIcon, background: '#fdf4ff', color: '#9333ea' }}>📊</div>
            <h2 style={S.cardTitle}>Seguimiento y Trayectoria</h2>
            <p style={S.cardDesc}>Rendimiento por materia a lo largo de toda la trayectoria</p>
          </div>
          <div style={S.cardBody}>
            <AlumnoAutocomplete onSelect={setSeguimientoAlumno} />
          </div>
          <div style={S.cardFooter}>
            <button
              style={{ ...S.btnBuscar, opacity: seguimientoAlumno ? 1 : 0.45 }}
              disabled={!seguimientoAlumno}
              onClick={() => navigate(`/alumnos/${seguimientoAlumno!.id}/seguimiento`)}
            >
              Ver Seguimiento
            </button>
          </div>
        </div>

        {/* ── Tarjeta 4: Alertas de Riesgo ── */}
        <div style={S.card}>
          <div style={S.cardTop}>
            <div style={{ ...S.cardIcon, background: '#fef2f2', color: '#dc2626' }}>⚠️</div>
            <h2 style={S.cardTitle}>Alertas de Riesgo</h2>
            <p style={S.cardDesc}>Alumnos en riesgo académico por promedio bajo o condición libre</p>
          </div>
          <div style={{ ...S.cardBody, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Análisis por curso y período: identifica alumnos con riesgo alto, medio o sin datos cargados.
            </p>
          </div>
          <div style={S.cardFooter}>
            <Link to="/alertas" style={{ ...S.btnBuscar, display: 'block', textAlign: 'center', textDecoration: 'none', background: '#dc2626' }}>
              Ver Alertas
            </Link>
          </div>
        </div>

        {/* ── Tarjeta 5: Buscar Curso ── */}
        <div style={S.card}>
          <div style={S.cardTop}>
            <div style={{ ...S.cardIcon, background: '#fff7ed', color: '#ea580c' }}>🏫</div>
            <h2 style={S.cardTitle}>Buscar Curso</h2>
            <p style={S.cardDesc}>Listado de alumnos de un curso y ciclo lectivo</p>
          </div>
          <div style={S.cardBody}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select
                style={S.select}
                value={cursoId}
                onChange={(e) => setCursoId(e.target.value)}
              >
                <option value="">Seleccione un curso...</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.turno ? ` — ${c.turno}` : ''}
                  </option>
                ))}
              </select>
              <select
                style={S.select}
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              >
                <option value="">Seleccione el año...</option>
                {aniosDisponibles.map((a) => (
                  <option key={a} value={String(a)}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={S.cardFooter}>
            <button
              style={{ ...S.btnBuscar, opacity: cursoId && anio ? 1 : 0.45 }}
              disabled={!cursoId || !anio}
              onClick={() => navigate(`/alumnos/buscar-curso?cursoId=${cursoId}&anio=${anio}`)}
            >
              Ver Curso
            </button>
          </div>
        </div>

      </div>

      {/* ── Modal Ficha Completa ── */}
      {showFicha && fichaAlumno && (
        <FichaCompletaModal
          alumnoId={fichaAlumno.id}
          onClose={() => setShowFicha(false)}
        />
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 28,
  },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  btnNuevo: {
    padding: '10px 20px', background: '#2563eb', color: '#fff',
    borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
    display: 'flex', flexDirection: 'column', minHeight: 320,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardTop: { padding: '20px 20px 0' },
  cardIcon: { fontSize: 24, width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardTitle: { margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' },
  cardDesc: { margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 },
  cardBody: { flex: 1, padding: '16px 20px' },
  cardFooter: { padding: '0 20px 20px' },
  btnBuscar: {
    width: '100%', padding: '11px 0', background: '#0f172a', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  select: {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box',
  },
};
