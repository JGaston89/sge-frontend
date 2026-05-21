import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { useCursos } from '../../calificaciones/hooks/useCalificaciones';
import { inscripcionesApi } from '../../../api/inscripciones.api';
import { pdfApi } from '../../../api/pdf.api';
import type { Inscripcion, PreviewMasiva } from '../../../shared/types/inscripciones.types';
import { ESTADO_COLORS } from '../../../shared/types/inscripciones.types';

// ─── Modal reinscripción masiva ──────────────────────────────────

function ModalMasiva({
  cursos,
  onClose,
  onSuccess,
}: {
  cursos: Array<{ id: string; nombre: string; anio_academico: number }>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [form, setForm] = useState({
    curso_id_origen: '', curso_id_destino: '',
    ciclo_origen: new Date().getFullYear() - 1,
    ciclo_destino: new Date().getFullYear(),
  });
  const [preview, setPreview] = useState<PreviewMasiva | null>(null);
  // Alumnos seleccionados para inscribir (excluye ya_inscripto y desseleccionados por el usuario)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const previewMut = useMutation({
    mutationFn: () => inscripcionesApi.previewMasiva(form),
    onSuccess: (data) => {
      setPreview(data);
      // Por defecto, marcar todos los que NO están ya inscriptos
      setSeleccionados(new Set(data.alumnos.filter((a) => !a.ya_inscripto).map((a) => a.alumno_id)));
      setStep('preview');
    },
    onError: (e: Error) => setError(e.message),
  });

  const ejecutarMut = useMutation({
    mutationFn: () => inscripcionesApi.ejecutarMasiva({
      ...form,
      alumno_ids: Array.from(seleccionados),
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  function toggleAlumno(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 580 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Reinscripción masiva</h2>

        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={S.label}>
                Curso origen *
                <select style={S.input} value={form.curso_id_origen}
                  onChange={(e) => setForm((f) => ({ ...f, curso_id_origen: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label style={S.label}>
                Ciclo origen
                <input type="number" style={S.input} value={form.ciclo_origen}
                  onChange={(e) => setForm((f) => ({ ...f, ciclo_origen: Number(e.target.value) }))} />
              </label>
              <label style={S.label}>
                Curso destino *
                <select style={S.input} value={form.curso_id_destino}
                  onChange={(e) => setForm((f) => ({ ...f, curso_id_destino: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label style={S.label}>
                Ciclo destino
                <input type="number" style={S.input} value={form.ciclo_destino}
                  onChange={(e) => setForm((f) => ({ ...f, ciclo_destino: Number(e.target.value) }))} />
              </label>
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
              <button style={S.btnPrimary}
                disabled={!form.curso_id_origen || !form.curso_id_destino || previewMut.isPending}
                onClick={() => previewMut.mutate()}>
                {previewMut.isPending ? 'Calculando...' : 'Ver alumnos'}
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Destildá los alumnos que <strong>no</strong> deben continuar (repitentes, bajas, traslados).
            </p>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'center', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', width: 36 }}>
                      <input type="checkbox"
                        checked={seleccionados.size === preview.alumnos.filter((a) => !a.ya_inscripto).length && seleccionados.size > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSeleccionados(new Set(preview.alumnos.filter((a) => !a.ya_inscripto).map((a) => a.alumno_id)));
                          } else {
                            setSeleccionados(new Set());
                          }
                        }}
                      />
                    </th>
                    {['Alumno', 'Legajo', 'Estado'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.alumnos.map((a) => (
                    <tr key={a.alumno_id} style={{ borderTop: '1px solid #f1f5f9', opacity: a.ya_inscripto ? 0.5 : 1 }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={seleccionados.has(a.alumno_id)}
                          disabled={a.ya_inscripto}
                          onChange={() => !a.ya_inscripto && toggleAlumno(a.alumno_id)}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>{a.alumno_nombre}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{a.alumno_legajo}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: a.ya_inscripto ? '#fef9c3' : '#dcfce7',
                          color: a.ya_inscripto ? '#854d0e' : '#15803d',
                        }}>
                          {a.ya_inscripto ? 'Ya inscripto' : 'Disponible'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>
              <strong>{seleccionados.size}</strong> alumnos seleccionados para inscribir
              {preview.ya_inscriptos > 0 && ` · ${preview.ya_inscriptos} ya inscriptos (se omiten)`}
            </p>
            {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btnSecondary} onClick={() => setStep('form')}>Volver</button>
              <button style={S.btnPrimary}
                disabled={seleccionados.size === 0 || ejecutarMut.isPending}
                onClick={() => ejecutarMut.mutate()}>
                {ejecutarMut.isPending ? 'Procesando...' : `Confirmar (${seleccionados.size})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────

export function InscripcionesPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const { data: cursos = [] } = useCursos();

  const [filtro, setFiltro] = useState({ curso_id: '', ciclo_lectivo: new Date().getFullYear() });
  const [buscado, setBuscado] = useState<{ curso_id: string; ciclo_lectivo: number } | null>(null);
  const [showMasiva, setShowMasiva] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: inscripciones = [], isLoading } = useQuery({
    queryKey: ['inscripciones', buscado],
    queryFn: () => inscripcionesApi.listar(buscado!.curso_id, buscado!.ciclo_lectivo),
    enabled: !!buscado,
  });

  const estadoMut = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'regular' | 'libre' | 'baja' }) =>
      inscripcionesApi.cambiarEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inscripciones'] }),
  });

  function refetch() {
    qc.invalidateQueries({ queryKey: ['inscripciones'] });
  }

  async function handleExportPdf() {
    if (!buscado) return;
    setPdfLoading(true);
    try {
      await pdfApi.downloadInscripciones(buscado.curso_id, buscado.ciclo_lectivo);
    } finally {
      setPdfLoading(false);
    }
  }

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  const regularCount = inscripciones.filter((i) => i.estado === 'regular').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Inscripciones</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>Gestión de inscripciones por curso y ciclo lectivo</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btnSecondary} onClick={() => setShowMasiva(true)}>
            Reinscripción masiva
          </button>
          <Link to="/inscripciones/nueva" style={{ ...S.btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            + Nueva inscripción
          </Link>
        </div>
      </div>

      {/* Filtro */}
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'flex-end' }}>
          <label style={S.label}>
            Curso
            <select style={S.input} value={filtro.curso_id}
              onChange={(e) => setFiltro((f) => ({ ...f, curso_id: e.target.value }))}>
              <option value="">Seleccionar curso...</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.anio_academico})</option>
              ))}
            </select>
          </label>
          <label style={S.label}>
            Ciclo lectivo
            <input type="number" style={{ ...S.input, width: 100 }}
              value={filtro.ciclo_lectivo}
              onChange={(e) => setFiltro((f) => ({ ...f, ciclo_lectivo: Number(e.target.value) }))} />
          </label>
          <button style={{ ...S.btnPrimary, opacity: !filtro.curso_id ? 0.5 : 1 }}
            disabled={!filtro.curso_id}
            onClick={() => setBuscado({ ...filtro })}>
            Buscar
          </button>
        </div>
      </div>

      {/* Resultados */}
      {buscado && (
        <div style={{ marginTop: 20 }}>
          {isLoading && <div style={S.loading}>Cargando inscripciones...</div>}

          {!isLoading && inscripciones.length === 0 && (
            <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#94a3b8', margin: 0 }}>Sin inscripciones para este curso y ciclo.</p>
            </div>
          )}

          {!isLoading && inscripciones.length > 0 && (
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, color: '#64748b' }}>
                  {inscripciones.length} inscriptos · {regularCount} regulares
                </span>
                <button
                  style={S.btnExport}
                  onClick={handleExportPdf}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? 'Generando...' : '⬇ Exportar PDF'}
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Alumno', 'Legajo', 'Estado', 'Fecha', 'Observaciones'].map((h) => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inscripciones.map((ins) => (
                      <InscripcionRow
                        key={ins.id}
                        inscripcion={ins}
                        onCambiarEstado={(estado) => estadoMut.mutate({ id: ins.id, estado })}
                        loading={estadoMut.isPending}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showMasiva && (
        <ModalMasiva
          cursos={cursos}
          onClose={() => setShowMasiva(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}

// ─── Fila de inscripción con selector de estado ──────────────────

function InscripcionRow({
  inscripcion: i,
  onCambiarEstado,
  loading,
}: {
  inscripcion: Inscripcion;
  onCambiarEstado: (estado: 'regular' | 'libre' | 'baja') => void;
  loading: boolean;
}) {
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={S.td}>{i.alumno_apellido}, {i.alumno_nombre}</td>
      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{i.alumno_legajo}</td>
      <td style={S.td}>
        <select
          style={{
            padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: '1px solid',
            ...ESTADO_COLORS[i.estado],
            fontWeight: 600,
          }}
          value={i.estado}
          disabled={loading}
          onChange={(e) => onCambiarEstado(e.target.value as 'regular' | 'libre' | 'baja')}
        >
          <option value="regular">Regular</option>
          <option value="libre">Libre</option>
          <option value="baja">Baja</option>
        </select>
      </td>
      <td style={S.td}>{i.fecha_inscripcion ? new Date(i.fecha_inscripcion.includes('T') ? i.fecha_inscripcion : i.fecha_inscripcion + 'T00:00:00').toLocaleDateString('es-AR') : '—'}</td>
      <td style={{ ...S.td, color: '#64748b', maxWidth: 200 }}>{i.observaciones ?? '—'}</td>
    </tr>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' },
  label: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input: { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff' },
  btnPrimary: {
    padding: '9px 20px', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  btnSecondary: {
    padding: '9px 18px', background: '#fff', border: '1px solid #d1d5db',
    borderRadius: 8, cursor: 'pointer', fontSize: 13,
  },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  th: {
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
  },
  td: { padding: '12px 14px', fontSize: 13, color: '#0f172a' },
  btnExport: {
    padding: '6px 14px', background: '#0f172a', color: '#fff',
    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 12, padding: 32, width: '100%',
    maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  summaryCard: {
    background: '#f8fafc', borderRadius: 8, padding: '12px 16px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14 },
};
