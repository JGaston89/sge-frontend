import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { useCursos } from '../../calificaciones/hooks/useCalificaciones';
import { inscripcionesApi } from '../../../api/inscripciones.api';

interface AlumnoDisponible {
  id: string;
  nombre: string;
  apellido: string;
  numero_legajo: string;
}

export function NuevaInscripcionPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const { data: cursos = [] } = useCursos();

  const [form, setForm] = useState({
    curso_id:      '',
    ciclo_lectivo: new Date().getFullYear(),
    estado:        'regular' as 'regular' | 'libre',
    observaciones: '',
  });

  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [resultado, setResultado] = useState<{ inscriptos: number; errores: any[] } | null>(null);

  const { data: disponibles = [], isLoading: loadingDisponibles } = useQuery<AlumnoDisponible[]>({
    queryKey: ['alumnos-disponibles', form.ciclo_lectivo],
    queryFn:  () => inscripcionesApi.getAlumnosDisponibles(form.ciclo_lectivo),
    enabled:  !!form.ciclo_lectivo,
  });

  // Resetear selección cuando cambia el ciclo
  useEffect(() => {
    setSeleccionados(new Set());
  }, [form.ciclo_lectivo]);

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return disponibles;
    const q = busqueda.toLowerCase();
    return disponibles.filter(
      (a) =>
        a.apellido.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        a.numero_legajo.toLowerCase().includes(q),
    );
  }, [disponibles, busqueda]);

  const todosSeleccionados = filtrados.length > 0 && filtrados.every((a) => seleccionados.has(a.id));

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  function toggleAlumno(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (todosSeleccionados) {
      // Deseleccionar solo los filtrados
      setSeleccionados((prev) => {
        const next = new Set(prev);
        filtrados.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSeleccionados((prev) => {
        const next = new Set(prev);
        filtrados.forEach((a) => next.add(a.id));
        return next;
      });
    }
  }

  const asignarMut = useMutation({
    mutationFn: () =>
      inscripcionesApi.asignarMasivo({
        curso_id:      form.curso_id,
        ciclo_lectivo: form.ciclo_lectivo,
        alumno_ids:    Array.from(seleccionados),
        estado:        form.estado,
        observaciones: form.observaciones || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['inscripciones'] });
      qc.invalidateQueries({ queryKey: ['alumnos-disponibles'] });
      setResultado(data);
    },
  });

  if (resultado) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#15803d' }}>
            Inscripción completada
          </h2>
          <p style={{ margin: '0 0 4px', fontSize: 15, color: '#374151' }}>
            <strong>{resultado.inscriptos}</strong> alumnos inscriptos correctamente
          </p>
          {resultado.errores.length > 0 && (
            <div style={{ marginTop: 16, textAlign: 'left', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#b91c1c', fontSize: 13 }}>
                {resultado.errores.length} error{resultado.errores.length !== 1 ? 'es' : ''}:
              </p>
              {resultado.errores.map((e: any, i: number) => (
                <p key={i} style={{ margin: '2px 0', fontSize: 12, color: '#b91c1c' }}>{e.mensaje}</p>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
            <button style={S.btnSecondary} onClick={() => { setResultado(null); setSeleccionados(new Set()); }}>
              Nueva inscripción
            </button>
            <button style={S.btnPrimary} onClick={() => navigate('/inscripciones')}>
              Ir a Inscripciones
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <Link to="/inscripciones" style={S.back}>← Inscripciones</Link>
      </div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={S.title}>Nueva inscripción</h1>
        <p style={S.subtitle}>Seleccioná el curso y los alumnos a inscribir</p>
      </div>

      {/* Formulario de configuración */}
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <label style={{ ...S.label, gridColumn: '1 / 2' }}>
            Curso *
            <select style={S.input} value={form.curso_id}
              onChange={(e) => setForm((f) => ({ ...f, curso_id: e.target.value }))}>
              <option value="">Seleccionar curso...</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label style={S.label}>
            Ciclo lectivo *
            <input type="number" style={S.input} value={form.ciclo_lectivo}
              onChange={(e) => setForm((f) => ({ ...f, ciclo_lectivo: Number(e.target.value) }))} />
          </label>
          <label style={S.label}>
            Estado inicial
            <select style={S.input} value={form.estado}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as 'regular' | 'libre' }))}>
              <option value="regular">Regular</option>
              <option value="libre">Libre</option>
            </select>
          </label>
          <label style={S.label}>
            Observaciones
            <input style={S.input} value={form.observaciones} placeholder="Opcional"
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} />
          </label>
        </div>
      </div>

      {/* Tabla de alumnos disponibles */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              Alumnos sin curso en {form.ciclo_lectivo}
            </span>
            {!loadingDisponibles && (
              <span style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>
                ({disponibles.length} disponibles)
              </span>
            )}
          </div>
          {seleccionados.size > 0 && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb' }}>
              {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Barra de búsqueda */}
        <input
          style={{ ...S.input, width: '100%', marginBottom: 12, boxSizing: 'border-box' }}
          placeholder="Buscar por apellido, nombre o legajo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {loadingDisponibles && <p style={S.empty}>Cargando alumnos...</p>}

        {!loadingDisponibles && disponibles.length === 0 && (
          <p style={S.empty}>Todos los alumnos activos ya tienen inscripción en {form.ciclo_lectivo}.</p>
        )}

        {!loadingDisponibles && disponibles.length > 0 && filtrados.length === 0 && (
          <p style={S.empty}>No hay alumnos que coincidan con "{busqueda}".</p>
        )}

        {!loadingDisponibles && filtrados.length > 0 && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ ...S.th, width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      onChange={toggleTodos}
                      title={todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    />
                  </th>
                  <th style={S.th}>Alumno</th>
                  <th style={S.th}>Legajo</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{
                      background: seleccionados.has(a.id) ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#f8fafc',
                      cursor: 'pointer',
                      borderTop: '1px solid #f1f5f9',
                    }}
                    onClick={() => toggleAlumno(a.id)}
                  >
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={seleccionados.has(a.id)}
                        onChange={() => toggleAlumno(a.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td style={{ ...S.td, fontWeight: seleccionados.has(a.id) ? 600 : 400 }}>
                      {a.apellido}, {a.nombre}
                    </td>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>
                      {a.numero_legajo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer de acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <Link to="/inscripciones" style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Cancelar
        </Link>
        <button
          style={{
            ...S.btnPrimary,
            opacity: (!form.curso_id || seleccionados.size === 0 || asignarMut.isPending) ? 0.5 : 1,
          }}
          disabled={!form.curso_id || seleccionados.size === 0 || asignarMut.isPending}
          onClick={() => asignarMut.mutate()}
        >
          {asignarMut.isPending
            ? 'Inscribiendo...'
            : `Confirmar inscripción (${seleccionados.size})`}
        </button>
      </div>

      {asignarMut.isError && (
        <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginTop: 12 }}>
          Error al procesar la inscripción. Intentá nuevamente.
        </p>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 900 },
  back:        { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  title:       { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:    { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 },
  label:       { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:       { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  btnPrimary:  { padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '10px 18px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#374151' },
  th:          { padding: '10px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  td:          { padding: '11px 14px', fontSize: 14, color: '#0f172a' },
  empty:       { color: '#94a3b8', textAlign: 'center', padding: '32px 0', fontSize: 14, margin: 0 },
};
