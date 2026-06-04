import { useState, useRef } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useAuthContext } from '../../../store/AuthContext';
import { useAlumno, useAlumnoHistorial, useBajaAlumno, useUpdateAlumno, useTutores, useRemoveTutor } from '../hooks/useAlumnos';
import { TutorFormModal } from '../components/TutorFormModal';
import type { Tutor } from '../../../shared/types/alumnos.types';
import { useCalificacionesAlumno } from '../../calificaciones/hooks/useCalificaciones';
import { pdfApi } from '../../../api/pdf.api';
import { documentosApi } from '../../../api/documentos.api';
import { inscripcionesApi } from '../../../api/inscripciones.api';
import { AlumnoForm } from '../components/AlumnoForm';
import type { BajaAlumnoDto } from '../../../shared/types/alumnos.types';
import { TIPOS_DOCUMENTO, tipoDocumentoLabel, formatBytes } from '../../../shared/types/documentos.types';
import { ESTADO_COLORS } from '../../../shared/types/inscripciones.types';

type Tab = 'datos' | 'tutores' | 'historial' | 'calificaciones' | 'documentos' | 'inscripciones';

const RELACION_LABEL: Record<string, string> = {
  padre: 'Padre', madre: 'Madre', abuelo: 'Abuelo', abuela: 'Abuela',
  tio: 'Tío', tia: 'Tía', tutor_legal: 'Tutor legal',
  hermano: 'Hermano', hermana: 'Hermana', otro: 'Otro',
};

export function AlumnoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const [tab, setTab] = useState<Tab>('datos');
  const [editing, setEditing] = useState(false);
  const [showBaja, setShowBaja] = useState(false);
  const [tutorModal, setTutorModal] = useState<{ open: boolean; tutor?: Tutor }>({ open: false });
  const [bajaMotivo, setBajaMotivo] = useState('');
  const [bajaFecha, setBajaFecha] = useState(new Date().toISOString().slice(0, 10));
  const [uploadTipo, setUploadTipo] = useState(TIPOS_DOCUMENTO[0].value);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { data: documentos = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documentos', id],
    queryFn: () => documentosApi.listar(id!),
    enabled: tab === 'documentos',
  });
  const subirMutation = useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: string }) =>
      documentosApi.subir(id!, file, tipo),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documentos', id] }); setUploadError(''); },
    onError: (e: Error) => setUploadError(e.message),
  });
  const eliminarMutation = useMutation({
    mutationFn: (docId: string) => documentosApi.eliminar(id!, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos', id] }),
  });

  const { data: inscripciones = [], isLoading: loadingInscripciones } = useQuery({
    queryKey: ['inscripciones-alumno', id],
    queryFn: () => inscripcionesApi.listarPorAlumno(id!),
    enabled: tab === 'inscripciones',
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    subirMutation.mutate({ file, tipo: uploadTipo });
    e.target.value = '';
  }

  const { data: alumno, isLoading } = useAlumno(id!);
  const { data: historial } = useAlumnoHistorial(id!);
  const { data: calificaciones } = useCalificacionesAlumno(id!);
  const { data: tutores = [], refetch: refetchTutores } = useTutores(id!);
  const removeTutorMutation = useRemoveTutor(id!);
  const updateMutation = useUpdateAlumno(id!);
  const bajaMutation = useBajaAlumno(id!);

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  if (isLoading) return <div style={styles.loading}>Cargando legajo...</div>;
  if (!alumno) return <div style={styles.loading}>Alumno no encontrado.</div>;

  function handleBaja() {
    const dto: BajaAlumnoDto = { motivo: bajaMotivo, fecha_baja: bajaFecha };
    bajaMutation.mutate(dto, { onSuccess: () => setShowBaja(false) });
  }

  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>
        <Link to="/alumnos" style={styles.backLink}>← Alumnos</Link>
      </div>

      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>{alumno.apellido}, {alumno.nombre}</h1>
          <div style={styles.meta}>
            <code style={styles.legajo}>{alumno.legajo}</code>
            <span style={{ ...styles.badge, ...badgeColor(alumno.estado) }}>{alumno.estado}</span>
          </div>
        </div>
        <div style={styles.actions}>
          {alumno.estado === 'activo' && (
            <>
              <button style={styles.btnSecondary} onClick={() => setEditing(!editing)}>
                {editing ? 'Cancelar' : 'Editar'}
              </button>
              <button style={styles.btnDanger} onClick={() => setShowBaja(true)}>Dar de baja</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['datos', 'tutores', 'calificaciones', 'documentos', 'inscripciones', 'historial'] as Tab[]).map((t) => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t === 'tutores' ? `Tutores (${tutores.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        {tab === 'datos' && !editing && (
          <dl style={styles.dl}>
            <Row label="DNI"               value={alumno.dni ?? '—'} />
            <Row label="Fecha nacimiento"  value={alumno.fecha_nacimiento ? new Date(alumno.fecha_nacimiento).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '—'} />
            <Row label="Género"            value={alumno.genero ?? '—'} />
            <Row label="Nacionalidad"      value={alumno.nacionalidad ?? '—'} />
            <Row label="Email"             value={alumno.email ?? '—'} />
            <Row label="Teléfono"          value={alumno.telefono ?? '—'} />
            {(alumno.domicilio_calle || alumno.localidad) && <>
              <Row label="Domicilio" value={[alumno.domicilio_calle, alumno.domicilio_numero, alumno.domicilio_piso && `Piso ${alumno.domicilio_piso}`, alumno.domicilio_depto && `Depto ${alumno.domicilio_depto}`].filter(Boolean).join(' ')} />
              <Row label="Localidad / Prov." value={[alumno.localidad, alumno.provincia, alumno.codigo_postal].filter(Boolean).join(', ')} />
            </>}
            <Row label="Alta"              value={new Date(alumno.created_at).toLocaleDateString('es-AR')} />
          </dl>
        )}

        {tab === 'datos' && editing && (
          <AlumnoForm
            initial={{
              ...alumno,
              email:            alumno.email            ?? undefined,
              telefono:         alumno.telefono         ?? undefined,
              genero:           (alumno.genero ?? undefined) as 'masculino' | 'femenino' | 'otro' | 'no_especificado' | undefined,
              nacionalidad:     alumno.nacionalidad     ?? undefined,
              domicilio_calle:  alumno.domicilio_calle  ?? undefined,
              domicilio_numero: alumno.domicilio_numero ?? undefined,
              domicilio_piso:   alumno.domicilio_piso   ?? undefined,
              domicilio_torre:  alumno.domicilio_torre  ?? undefined,
              domicilio_depto:  alumno.domicilio_depto  ?? undefined,
              localidad:        alumno.localidad        ?? undefined,
              provincia:        alumno.provincia        ?? undefined,
              codigo_postal:    alumno.codigo_postal    ?? undefined,
            }}
            onSubmit={(dto) => updateMutation.mutate(dto, { onSuccess: () => setEditing(false) })}
            error={updateMutation.isError ? (() => {
              const data = (updateMutation.error as AxiosError<{ message: string; details?: { message: string }[] }>).response?.data;
              if (data?.details?.length) return data.details.map(d => d.message).join(' · ');
              return data?.message ?? 'Error al actualizar el alumno';
            })() : null}
            isLoading={updateMutation.isPending}
            submitLabel="Actualizar"
          />
        )}

        {/* ── Tutores ─────────────────────────────────────── */}
        {tab === 'tutores' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              {alumno.estado === 'activo' && (
                <button
                  style={styles.btnPrimary}
                  onClick={() => setTutorModal({ open: true })}
                >
                  + Agregar tutor / responsable
                </button>
              )}
            </div>

            {tutores.length === 0 && (
              <p style={styles.empty}>Sin tutores registrados.</p>
            )}

            {tutores.map((t) => (
              <div key={t.alumno_tutor_id} style={styles.tutorCard}>
                <div style={styles.tutorHeader}>
                  <div>
                    <span style={styles.tutorNombre}>{t.apellido}, {t.nombre}</span>
                    <span style={styles.tutorRelacion}>{RELACION_LABEL[t.relacion] ?? t.relacion}</span>
                    {t.es_contacto_emergencia  && <span style={styles.badge}>Emergencia</span>}
                    {t.es_responsable_economico && <span style={{ ...styles.badge, background: '#fef9c3', color: '#854d0e' }}>Resp. económico</span>}
                    {t.vive_con_alumno          && <span style={{ ...styles.badge, background: '#f0fdf4', color: '#166534' }}>Convive</span>}
                  </div>
                  {alumno.estado === 'activo' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={styles.btnMiniSecondary} onClick={() => setTutorModal({ open: true, tutor: t })}>
                        Editar
                      </button>
                      <button
                        style={styles.btnMiniDanger}
                        onClick={() => { if (confirm(`¿Desvincular a ${t.nombre} ${t.apellido}?`)) removeTutorMutation.mutate(t.id); }}
                      >
                        Desvincular
                      </button>
                    </div>
                  )}
                </div>
                <div style={styles.tutorMeta}>
                  {t.tipo_documento} {t.numero_documento}
                  {t.telefono && <span> · {t.telefono}</span>}
                  {t.email && <span> · {t.email}</span>}
                  {t.localidad && <span> · {t.localidad}{t.provincia ? `, ${t.provincia}` : ''}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'historial' && (
          <div>
            {!historial?.length && <p style={styles.empty}>Sin cambios registrados.</p>}
            {historial?.map((h) => (
              <div key={h.id} style={styles.historialItem}>
                <span style={styles.historialCampo}>{h.campo}</span>
                <span style={styles.historialValor}>{h.valor_anterior ?? '—'} → {h.valor_nuevo}</span>
                <span style={styles.historialFecha}>
                  {h.usuario} · {new Date(h.created_at).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'calificaciones' && (
          <div>
            {calificaciones && calificaciones.length > 0 && (() => {
              const periodos = [...new Set(calificaciones.map((c) => `${c.periodo}|${c.anio_academico}`))];
              return (
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {periodos.map((p) => {
                    const [periodo, anio] = p.split('|');
                    return (
                      <button
                        key={p}
                        style={{
                          padding: '6px 14px',
                          background: '#0f172a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        onClick={() => pdfApi.downloadBoletin(id!, periodo, Number(anio)).catch((e) => alert(e.message))}
                      >
                        ⬇ Boletín {periodo} {anio}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            {!calificaciones?.length && (
              <p style={styles.empty}>Sin calificaciones registradas.</p>
            )}
            {calificaciones && calificaciones.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Materia', 'Período', 'Año', 'Tipo', 'Nota', 'Equivalencia', 'Estado'].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calificaciones.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={styles.tdCal}>{c.materia_nombre}</td>
                        <td style={styles.tdCal}>{c.periodo}</td>
                        <td style={styles.tdCal}>{c.anio_academico}</td>
                        <td style={styles.tdCal}>{c.tipo}</td>
                        <td style={{ ...styles.tdCal, fontWeight: 600 }}>{c.nota_valor}</td>
                        <td style={styles.tdCal}>
                          {c.nota_numerica ? Number(c.nota_numerica).toFixed(2) : '—'}
                        </td>
                        <td style={styles.tdCal}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: c.estado_acta === 'cerrada' ? '#dcfce7' : '#fef9c3',
                            color: c.estado_acta === 'cerrada' ? '#15803d' : '#854d0e',
                          }}>
                            {c.estado_acta}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {tab === 'documentos' && (
          <div>
            {/* Upload area */}
            <div style={styles.uploadArea}>
              <div style={styles.uploadRow}>
                <label style={styles.label}>
                  Tipo de documento
                  <select
                    style={styles.selectDoc}
                    value={uploadTipo}
                    onChange={(e) => setUploadTipo(e.target.value)}
                  >
                    {TIPOS_DOCUMENTO.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.btnUpload}>
                  {subirMutation.isPending ? 'Subiendo...' : '↑ Subir archivo'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    disabled={subirMutation.isPending}
                  />
                </label>
              </div>
              <p style={styles.uploadHint}>PDF, JPG o PNG · máx. 10 MB</p>
              {uploadError && <p style={styles.uploadError}>{uploadError}</p>}
            </div>

            {/* Lista de documentos */}
            {loadingDocs && <p style={styles.empty}>Cargando documentos...</p>}
            {!loadingDocs && documentos.length === 0 && (
              <p style={styles.empty}>Sin documentos adjuntos.</p>
            )}
            {documentos.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Tipo', 'Archivo', 'Tamaño', 'Versión', 'Subido por', 'Fecha', ''].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {documentos.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={styles.tdCal}>
                          <span style={styles.tipoBadge}>{tipoDocumentoLabel(d.tipo_documento)}</span>
                        </td>
                        <td style={styles.tdCal}>
                          <a href={d.url} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>
                            {d.nombre_archivo}
                          </a>
                        </td>
                        <td style={styles.tdCal}>{formatBytes(d.tamano_bytes)}</td>
                        <td style={{ ...styles.tdCal, textAlign: 'center' }}>v{d.version}</td>
                        <td style={styles.tdCal}>{d.subido_por_nombre}</td>
                        <td style={styles.tdCal}>{new Date(d.created_at).toLocaleDateString('es-AR')}</td>
                        <td style={styles.tdCal}>
                          <button
                            style={styles.btnDeleteDoc}
                            onClick={() => {
                              if (confirm('¿Eliminar este documento?')) eliminarMutation.mutate(d.id);
                            }}
                            disabled={eliminarMutation.isPending}
                            title="Eliminar documento"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'inscripciones' && (
          <div>
            {loadingInscripciones && <p style={styles.empty}>Cargando inscripciones...</p>}
            {!loadingInscripciones && inscripciones.length === 0 && (
              <p style={styles.empty}>Sin inscripciones registradas.</p>
            )}
            {inscripciones.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Ciclo', 'Curso', 'Estado', 'Fecha', 'Observaciones'].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inscripciones.map((ins) => (
                      <tr key={ins.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ ...styles.tdCal, fontWeight: 700, fontSize: 15 }}>{ins.ciclo_lectivo}</td>
                        <td style={styles.tdCal}>{ins.curso_nombre}</td>
                        <td style={styles.tdCal}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                            fontSize: 11, fontWeight: 600, ...ESTADO_COLORS[ins.estado],
                          }}>
                            {ins.estado}
                          </span>
                        </td>
                        <td style={styles.tdCal}>{new Date(ins.fecha_inscripcion).toLocaleDateString('es-AR')}</td>
                        <td style={{ ...styles.tdCal, color: '#64748b' }}>{ins.observaciones ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal tutor */}
      {tutorModal.open && (
        <TutorFormModal
          alumnoId={id!}
          tutorEditar={tutorModal.tutor}
          onSave={() => { setTutorModal({ open: false }); refetchTutores(); }}
          onClose={() => setTutorModal({ open: false })}
        />
      )}

      {/* Modal baja */}
      {showBaja && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ margin: '0 0 16px' }}>Dar de baja</h2>
            <label style={styles.modalLabel}>
              Motivo *
              <textarea
                value={bajaMotivo}
                onChange={(e) => setBajaMotivo(e.target.value)}
                rows={3}
                style={styles.textarea}
                required
              />
            </label>
            <label style={styles.modalLabel}>
              Fecha de baja *
              <input
                type="date"
                value={bajaFecha}
                onChange={(e) => setBajaFecha(e.target.value)}
                style={styles.input}
              />
            </label>
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setShowBaja(false)}>Cancelar</button>
              <button
                style={styles.btnDanger}
                disabled={!bajaMotivo || bajaMutation.isPending}
                onClick={handleBaja}
              >
                {bajaMutation.isPending ? 'Procesando...' : 'Confirmar baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
      <dt style={{ width: 180, color: '#64748b', fontSize: 14, flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>{value}</dd>
    </div>
  );
}

function badgeColor(estado: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    activo: { background: '#dcfce7', color: '#15803d' },
    baja: { background: '#fee2e2', color: '#b91c1c' },
    egresado: { background: '#e0f2fe', color: '#0369a1' },
  };
  return map[estado] ?? {};
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 860 },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  breadcrumb: { marginBottom: 12 },
  backLink: { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  meta: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 },
  legajo: { fontSize: 13, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 },
  badge: { display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions: { display: 'flex', gap: 8 },
  tabs: { display: 'flex', gap: 0, marginBottom: 0, borderBottom: '2px solid #e2e8f0' },
  tab: {
    padding: '10px 20px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 14,
    color: '#64748b',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
  },
  tabActive:        { color: '#2563eb', borderBottomColor: '#2563eb', fontWeight: 600 },
  card:             { background: '#fff', borderRadius: '0 0 12px 12px', padding: 28, border: '1px solid #e2e8f0', borderTop: 'none' },
  dl:               { margin: 0 },
  empty:            { color: '#94a3b8', textAlign: 'center' as const, padding: 24 },
  btnPrimary:       { padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnMiniSecondary: { padding: '5px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  btnMiniDanger:    { padding: '5px 12px', background: '#fff', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626' },
  tutorCard:        { border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 10, background: '#fafafa' },
  tutorHeader:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6, flexWrap: 'wrap' as const },
  tutorNombre:      { fontSize: 15, fontWeight: 700, color: '#0f172a', marginRight: 8 },
  tutorRelacion:    { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', marginRight: 6 },
  tutorMeta:        { fontSize: 12, color: '#64748b' },
  historialItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left' as const,
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  tdCal: { padding: '10px 14px', fontSize: 13, color: '#0f172a' },
  historialCampo: { fontWeight: 600, fontSize: 13, color: '#475569' },
  historialValor: { fontSize: 14, color: '#0f172a' },
  historialFecha: { fontSize: 12, color: '#94a3b8' },
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
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  btnSecondary: {
    padding: '9px 18px', background: '#fff', border: '1px solid #d1d5db',
    borderRadius: 8, cursor: 'pointer', fontSize: 14,
  },
  btnDanger: {
    padding: '9px 18px', background: '#dc2626', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  uploadArea: {
    background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10,
    padding: '16px 20px', marginBottom: 20,
  },
  uploadRow: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
  label: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  selectDoc: {
    padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7,
    fontSize: 13, background: '#fff', minWidth: 200,
  },
  btnUpload: {
    padding: '8px 18px', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    display: 'inline-block',
  },
  uploadHint: { margin: '8px 0 0', fontSize: 12, color: '#94a3b8' },
  uploadError: { margin: '6px 0 0', fontSize: 12, color: '#dc2626' },
  tipoBadge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 12,
    fontSize: 11, fontWeight: 600, background: '#e0f2fe', color: '#0369a1',
  },
  fileLink: { color: '#2563eb', textDecoration: 'none', fontSize: 13 },
  btnDeleteDoc: {
    background: 'transparent', border: 'none', color: '#ef4444',
    cursor: 'pointer', fontSize: 14, padding: '2px 6px', borderRadius: 4,
  },
};
