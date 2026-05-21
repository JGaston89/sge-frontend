import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { examenesApi } from '../../../api/examenes.api';
import { useAlumnosByCurso } from '../../calificaciones/hooks/useCalificaciones';
import type { NotaItemDto, EstadoInscripcion } from '../../../shared/types/examenes.types';

function fmtDate(v: string | null | undefined) {
  if (!v) return '—';
  const d = new Date(v.includes('T') ? v : v + 'T00:00:00');
  return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function MesaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const { data: mesa, isLoading, isError } = useQuery({
    queryKey: ['examenes-mesa', id],
    queryFn: () => examenesApi.getMesa(id!),
    enabled: !!id,
  });

  const { data: alumnosCurso = [] } = useAlumnosByCurso(mesa?.curso_id ?? '');

  const [selectedAlumnos, setSelectedAlumnos] = useState<string[]>([]);
  const [notas, setNotas] = useState<Record<string, { nota: string; estado: EstadoInscripcion }>>({});
  const [confirmCerrar, setConfirmCerrar] = useState(false);

  const inscribirMutation = useMutation({
    mutationFn: (alumnoIds: string[]) =>
      Promise.all(alumnoIds.map((aid) => examenesApi.inscribir(id!, aid))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['examenes-mesa', id] });
      setSelectedAlumnos([]);
    },
  });

  const desinscribirMutation = useMutation({
    mutationFn: (inscId: string) => examenesApi.desinscribir(inscId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['examenes-mesa', id] }),
  });

  const notasMutation = useMutation({
    mutationFn: (items: NotaItemDto[]) => examenesApi.cargarNotas(id!, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['examenes-mesa', id] }),
  });

  const cerrarMutation = useMutation({
    mutationFn: () => examenesApi.cerrarMesa(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['examenes-mesa', id] });
      setConfirmCerrar(false);
    },
  });

  if (isLoading) return <p style={{ color: '#94a3b8', padding: 40 }}>Cargando mesa...</p>;
  if (isError || !mesa) return <p style={{ color: '#dc2626', padding: 40 }}>Mesa no encontrada.</p>;

  const esAbierta = mesa.estado === 'abierta';
  const esAlumno  = user?.roles?.includes('alumno') ?? false;
  const inscriptos = Array.isArray(mesa.inscriptos) ? mesa.inscriptos : [];

  const alumnosNoInscritos = alumnosCurso.filter(
    (a) => !inscriptos.some((i) => i.alumno_id === a.id),
  );

  function toggleAlumno(alumnoId: string) {
    setSelectedAlumnos((prev) =>
      prev.includes(alumnoId) ? prev.filter((x) => x !== alumnoId) : [...prev, alumnoId],
    );
  }

  function toggleTodos() {
    if (selectedAlumnos.length === alumnosNoInscritos.length) {
      setSelectedAlumnos([]);
    } else {
      setSelectedAlumnos(alumnosNoInscritos.map((a) => a.id));
    }
  }

  function handleCargarNotas(e: React.FormEvent) {
    e.preventDefault();
    const items: NotaItemDto[] = inscriptos.map((insc) => {
      const n = notas[insc.alumno_id];
      return {
        alumno_id:     insc.alumno_id,
        estado:        n?.estado ?? insc.estado as EstadoInscripcion,
        nota_numerica: n?.nota ? parseFloat(n.nota) : undefined,
      };
    });
    notasMutation.mutate(items);
  }

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/examenes" style={S.back}>← Mesas de examen</Link>
      </div>

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>{mesa.materia_nombre}</h1>
          <p style={S.subtitle}>
            Mesa de examen · {fmtDate(mesa.fecha)}
            {mesa.hora ? ` · ${mesa.hora}` : ''}
            {mesa.aula ? ` · ${mesa.aula}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={`${examenesApi.getActaUrl(id!)}?token=${localStorage.getItem('access_token')}`}
            target="_blank" rel="noopener noreferrer"
            style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            📄 Descargar acta PDF
          </a>
          {esAbierta && !esAlumno && (
            <button style={{ ...S.btnDanger, opacity: confirmCerrar ? 0.6 : 1 }}
              onClick={() => setConfirmCerrar(true)} disabled={cerrarMutation.isPending}>
              Cerrar acta
            </button>
          )}
        </div>
      </div>

      {/* Confirmar cierre */}
      {confirmCerrar && (
        <div style={S.warningBox}>
          <strong>¿Cerrar el acta de esta mesa?</strong> Esta acción es irreversible. Las notas quedarán registradas definitivamente.
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={S.btnSecondary} onClick={() => setConfirmCerrar(false)}>Cancelar</button>
            <button style={{ ...S.btnDanger, opacity: cerrarMutation.isPending ? 0.6 : 1 }}
              disabled={cerrarMutation.isPending} onClick={() => cerrarMutation.mutate()}>
              {cerrarMutation.isPending ? 'Cerrando...' : 'Confirmar cierre'}
            </button>
          </div>
        </div>
      )}

      {/* Info chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <InfoChip label="Estado" value={mesa.estado} />
        <InfoChip label="Inscriptos / Cupo" value={`${inscriptos.length} / ${mesa.cupo_maximo}`} />
        {mesa.curso_nombre && <InfoChip label="Curso" value={mesa.curso_nombre} />}
        {mesa.docente_nombre && <InfoChip label="Docente" value={mesa.docente_nombre} />}
        {mesa.ciclo_nombre && <InfoChip label="Período" value={mesa.ciclo_nombre} />}
        {mesa.fecha_limite_inscripcion && <InfoChip label="Límite inscripción" value={fmtDate(mesa.fecha_limite_inscripcion)} />}
      </div>

      {/* Panel de inscripción desde padrón del curso */}
      {esAbierta && !esAlumno && (
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Inscribir alumnos</h3>
          {!mesa.curso_id ? (
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Esta mesa no tiene un curso asignado. Las nuevas mesas creadas con un curso permiten inscripción directa desde el padrón.
            </p>
          ) : alumnosNoInscritos.length === 0 ? (
            <p style={{ color: '#15803d', fontSize: 14, margin: 0 }}>
              ✓ Todos los alumnos del curso ya están inscriptos.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
                {alumnosNoInscritos.length} alumno{alumnosNoInscritos.length !== 1 ? 's' : ''} del curso sin inscribir
              </p>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                {/* Fila "seleccionar todos" */}
                <div
                  style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  onClick={toggleTodos}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={selectedAlumnos.length === alumnosNoInscritos.length && alumnosNoInscritos.length > 0}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Seleccionar todos
                  </span>
                </div>
                {alumnosNoInscritos.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                      background: selectedAlumnos.includes(a.id) ? '#eff6ff' : '#fff',
                    }}
                    onClick={() => toggleAlumno(a.id)}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={selectedAlumnos.includes(a.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, color: '#64748b', minWidth: 100 }}>{a.numero_legajo}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{a.apellido}, {a.nombre}</span>
                  </div>
                ))}
              </div>
              {inscribirMutation.isError && (
                <div style={{ ...S.errorBox, marginBottom: 10 }}>Error al inscribir algunos alumnos.</div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  style={{ ...S.btnPrimary, opacity: (selectedAlumnos.length === 0 || inscribirMutation.isPending) ? 0.5 : 1 }}
                  disabled={selectedAlumnos.length === 0 || inscribirMutation.isPending}
                  onClick={() => inscribirMutation.mutate(selectedAlumnos)}
                >
                  {inscribirMutation.isPending
                    ? 'Inscribiendo...'
                    : `Inscribir seleccionados (${selectedAlumnos.length})`}
                </button>
                {selectedAlumnos.length > 0 && (
                  <button style={S.btnSecondary} onClick={() => setSelectedAlumnos([])}>
                    Limpiar selección
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tabla de inscriptos + carga de notas */}
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Inscriptos ({inscriptos.length})
          </h3>
        </div>

        {inscriptos.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>Sin inscriptos aún.</p>
        ) : (
          <form onSubmit={handleCargarNotas}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Legajo</th>
                  <th style={S.th}>Apellido y nombre</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Estado</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Nota (1-10)</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Resultado</th>
                  {esAbierta && !esAlumno && <th style={{ ...S.th, textAlign: 'center' }}>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {inscriptos.map((insc, i) => {
                  const nota = notas[insc.alumno_id];
                  return (
                    <tr key={insc.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ ...S.td, fontSize: 13, color: '#64748b' }}>{insc.alumno_legajo}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{insc.alumno_apellido}, {insc.alumno_nombre}</td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {esAbierta && !esAlumno ? (
                          <select
                            style={{ ...S.input, width: 110, fontSize: 12 }}
                            value={nota?.estado ?? insc.estado}
                            onChange={(e) => setNotas((n) => ({ ...n, [insc.alumno_id]: { ...n[insc.alumno_id], estado: e.target.value as EstadoInscripcion } }))}
                          >
                            <option value="inscripto">Inscripto</option>
                            <option value="presente">Presente</option>
                            <option value="ausente">Ausente</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: 13 }}>{insc.estado}</span>
                        )}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {esAbierta && !esAlumno ? (
                          <input
                            type="number" min={1} max={10} step={0.5}
                            style={{ ...S.input, width: 70, textAlign: 'center' }}
                            value={nota?.nota ?? (insc.nota_numerica !== null ? String(insc.nota_numerica) : '')}
                            onChange={(e) => setNotas((n) => ({ ...n, [insc.alumno_id]: { ...n[insc.alumno_id], nota: e.target.value } }))}
                          />
                        ) : (
                          <span style={{ fontWeight: 600 }}>{insc.nota_numerica ?? '—'}</span>
                        )}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {insc.nota_conceptual ? (
                          <span style={{
                            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: insc.nota_conceptual === 'aprobado' ? '#dcfce7' : '#fee2e2',
                            color: insc.nota_conceptual === 'aprobado' ? '#15803d' : '#b91c1c',
                          }}>
                            {insc.nota_conceptual}
                          </span>
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      {esAbierta && !esAlumno && (
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}
                            onClick={() => { if (window.confirm('¿Desinscribir a este alumno?')) desinscribirMutation.mutate(insc.id); }}
                          >
                            Quitar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {esAbierta && !esAlumno && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {notasMutation.isSuccess && <span style={{ fontSize: 13, color: '#15803d', alignSelf: 'center' }}>✓ Notas guardadas</span>}
                {notasMutation.isError && <span style={{ fontSize: 13, color: '#dc2626', alignSelf: 'center' }}>Error al guardar notas</span>}
                <button type="submit" style={{ ...S.btnPrimary, opacity: notasMutation.isPending ? 0.6 : 1 }} disabled={notasMutation.isPending}>
                  {notasMutation.isPending ? 'Guardando...' : 'Guardar notas'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px' }}>
      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, marginTop: 1 }}>{value}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:         { maxWidth: 1100 },
  back:         { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:        { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:     { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:         { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle: { margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' },
  label:        { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:        { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:     { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13 },
  warningBox:   { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: '#92400e' },
  btnPrimary:   { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' },
  btnDanger:    { padding: '9px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' },
  td:           { padding: '11px 16px', fontSize: 14, color: '#0f172a', borderBottom: '1px solid #f1f5f9' },
};
