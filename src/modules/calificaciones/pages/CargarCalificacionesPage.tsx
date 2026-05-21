import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import {
  useAlumnosByCurso,
  useActa,
  useCargarBulk,
  useCursos,
  useMaterias,
} from '../hooks/useCalificaciones';
import { useAuthContext } from '../../../store/AuthContext';
import type { TipoCalificacion } from '../../../shared/types/calificaciones.types';

const TIPOS: TipoCalificacion[] = ['nota', 'parcial', 'final', 'recuperatorio', 'concepto'];
const TIPO_LABELS: Record<TipoCalificacion, string> = {
  nota: 'Nota',
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recuperatorio',
  concepto: 'Concepto',
};

interface FilaCalificacion {
  alumno_id: string;
  nota_valor: string;
  observaciones: string;
}

export function CargarCalificacionesPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (user?.roles?.includes('alumno')) return <Navigate to="/calificaciones" replace />;
  const curso_id = searchParams.get('curso_id') ?? '';
  const materia_id = searchParams.get('materia_id') ?? '';
  const periodo = searchParams.get('periodo') ?? '';
  const anio_academico = Number(searchParams.get('anio_academico') ?? new Date().getFullYear());

  const [tipo, setTipo] = useState<TipoCalificacion>('nota');
  const [filas, setFilas] = useState<FilaCalificacion[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: cursos = [] } = useCursos();
  const { data: materias = [] } = useMaterias();
  const { data: alumnos = [], isLoading: loadingAlumnos } = useAlumnosByCurso(curso_id);
  const { data: acta } = useActa(
    curso_id && materia_id && periodo
      ? { curso_id, materia_id, periodo, anio_academico }
      : null,
  );
  const bulkMutation = useCargarBulk();

  const cursoNombre = cursos.find((c) => c.id === curso_id)?.nombre ?? curso_id;
  const materiaNombre = materias.find((m) => m.id === materia_id)?.nombre ?? materia_id;

  // Inicializa filas cuando carguen los alumnos
  useEffect(() => {
    if (alumnos.length > 0) {
      setFilas(
        alumnos.map((a) => ({ alumno_id: a.id, nota_valor: '', observaciones: '' })),
      );
    }
  }, [alumnos]);

  // Pre-rellena notas existentes cuando cambia el tipo o carga el acta
  useEffect(() => {
    if (!acta || alumnos.length === 0) return;
    const existentes = acta.calificaciones.filter((c) => c.tipo === tipo);
    setFilas(
      alumnos.map((a) => {
        const cal = existentes.find((c) => c.alumno_id === a.id);
        return {
          alumno_id: a.id,
          nota_valor: cal?.nota_valor ?? '',
          observaciones: cal?.observaciones ?? '',
        };
      }),
    );
  }, [tipo, acta, alumnos]);

  function updateFila(alumnoId: string, field: 'nota_valor' | 'observaciones', value: string) {
    setFilas((prev) =>
      prev.map((f) => (f.alumno_id === alumnoId ? { ...f, [field]: value } : f)),
    );
  }

  function handleGuardar() {
    setErrorMsg('');
    setSuccessMsg('');
    const calificaciones = filas
      .filter((f) => f.nota_valor.trim() !== '')
      .map((f) => ({
        alumno_id: f.alumno_id,
        tipo,
        nota_valor: f.nota_valor.trim(),
        observaciones: f.observaciones.trim() || undefined,
      }));

    if (calificaciones.length === 0) {
      setErrorMsg('Ingresá al menos una nota para guardar.');
      return;
    }

    bulkMutation.mutate(
      { curso_id, materia_id, periodo, anio_academico, calificaciones },
      {
        onSuccess: (result) => {
          setSuccessMsg(`${result.total} calificación/es guardada/s correctamente.`);
          setTimeout(() => {
            const q = new URLSearchParams({ curso_id, materia_id, periodo, anio_academico: String(anio_academico) });
            navigate(`/calificaciones?${q}`);
          }, 1500);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Error al guardar las calificaciones.';
          setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      },
    );
  }

  if (!curso_id || !materia_id || !periodo) {
    return (
      <div style={styles.page}>
        <Link to="/calificaciones" style={styles.backLink}>← Calificaciones</Link>
        <p style={{ color: '#dc2626', marginTop: 16 }}>Parámetros incompletos. Volvé a buscar el acta.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>
        <Link to="/calificaciones" style={styles.backLink}>← Calificaciones</Link>
      </div>

      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Cargar calificaciones</h1>
          <div style={styles.subtitle}>
            {materiaNombre} · {cursoNombre} · {periodo} {anio_academico}
          </div>
        </div>
      </div>

      {/* Selector de tipo */}
      <div style={styles.card}>
        <label style={styles.label}>
          Tipo de calificación
          <select
            style={styles.select}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCalificacion)}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>{TIPO_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <p style={styles.hint}>
          El tipo aplica a todas las notas de esta carga. Para cargar distintos tipos, repetí la operación.
        </p>
      </div>

      {/* Tabla de alumnos */}
      <div style={{ ...styles.card, marginTop: 16, padding: 0, overflow: 'hidden' }}>
        {loadingAlumnos ? (
          <div style={styles.loading}>Cargando alumnos del curso...</div>
        ) : alumnos.length === 0 ? (
          <div style={styles.emptyAlumnos}>
            No hay alumnos activos inscriptos en este curso.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {['Alumno', 'Legajo', 'Nota / Concepto', 'Observaciones (opcional)'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alumnos.map((alumno) => {
                const fila = filas.find((f) => f.alumno_id === alumno.id);
                return (
                  <tr key={alumno.id} style={styles.tr}>
                    <td style={styles.td}>
                      {alumno.apellido}, {alumno.nombre}
                    </td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 13, color: '#475569' }}>
                      {alumno.numero_legajo}
                    </td>
                    <td style={styles.td}>
                      <input
                        style={styles.inputNota}
                        value={fila?.nota_valor ?? ''}
                        onChange={(e) => updateFila(alumno.id, 'nota_valor', e.target.value)}
                        placeholder="Ej: 8 · 7.5 · MB · B"
                        maxLength={10}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        style={{ ...styles.inputNota, width: '100%' }}
                        value={fila?.observaciones ?? ''}
                        onChange={(e) => updateFila(alumno.id, 'observaciones', e.target.value)}
                        placeholder="Opcional"
                        maxLength={200}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mensajes */}
      {errorMsg && <div style={styles.errorMsg}>{errorMsg}</div>}
      {successMsg && <div style={styles.successMsg}>{successMsg}</div>}

      {/* Acciones */}
      <div style={styles.footerActions}>
        <Link to="/calificaciones" style={styles.btnSecondary}>Cancelar</Link>
        <button
          style={styles.btnPrimary}
          onClick={handleGuardar}
          disabled={bulkMutation.isPending || alumnos.length === 0}
        >
          {bulkMutation.isPending ? 'Guardando...' : 'Guardar calificaciones'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900 },
  breadcrumb: { marginBottom: 12 },
  backLink: { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  headerRow: { marginBottom: 20 },
  title: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b' },
  card: { background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#374151', fontWeight: 500, maxWidth: 280 },
  select: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' },
  hint: { margin: '12px 0 0', fontSize: 13, color: '#94a3b8' },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  emptyAlumnos: { padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 },
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
  td: { padding: '10px 16px', fontSize: 14, color: '#0f172a' },
  inputNota: {
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    width: 140,
  },
  errorMsg: { marginTop: 16, padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: 14 },
  successMsg: { marginTop: 16, padding: '12px 16px', background: '#dcfce7', color: '#15803d', borderRadius: 8, fontSize: 14 },
  footerActions: { marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' },
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
    padding: '10px 18px',
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    textDecoration: 'none',
    color: '#374151',
    display: 'inline-flex',
    alignItems: 'center',
  },
};
