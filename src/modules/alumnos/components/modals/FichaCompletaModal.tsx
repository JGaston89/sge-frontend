import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlumno } from '../../hooks/useAlumnos';
import { alumnosApi } from '../../../../api/alumnos.api';
import { documentosApi } from '../../../../api/documentos.api';
import { inscripcionesApi } from '../../../../api/inscripciones.api';
import { pdfApi } from '../../../../api/pdf.api';
import { tipoDocumentoLabel, formatBytes, TIPOS_DOCUMENTO } from '../../../../shared/types/documentos.types';
import { ESTADO_COLORS } from '../../../../shared/types/inscripciones.types';
import type { ContactoEmergencia } from '../../../../shared/types/alumnos.types';
import type { UpdateAlumnoDto } from '../../../../shared/types/alumnos.types';

interface Props {
  alumnoId: string;
  onClose: () => void;
}

const SECCIONES = ['Datos Personales', 'Contactos', 'Documentación', 'Inscripciones'];
const TOTAL = SECCIONES.length;
const EMPTY_CONTACT = { nombre: '', relacion: 'padre' as const, telefono: '', email: '' };

function fmtDate(val: string | null | undefined) {
  if (!val) return '—';
  const s = String(val);
  return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('es-AR');
}

export function FichaCompletaModal({ alumnoId, onClose }: Props) {
  const [pagina, setPagina] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const qc = useQueryClient();
  const { data: alumno, isLoading } = useAlumno(alumnoId);

  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos', alumnoId],
    queryFn: () => documentosApi.listar(alumnoId),
  });
  const { data: inscripciones = [] } = useQuery({
    queryKey: ['inscripciones-alumno', alumnoId],
    queryFn: () => inscripcionesApi.listarPorAlumno(alumnoId),
  });

  // ── Página 1: Edición datos personales ──────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<UpdateAlumnoDto>({});

  useEffect(() => {
    if (alumno && editMode) {
      setEditForm({
        nombre:           alumno.nombre,
        apellido:         alumno.apellido,
        email:            alumno.email ?? '',
        telefono:         alumno.telefono ?? '',
        fecha_nacimiento: alumno.fecha_nacimiento?.slice(0, 10) ?? '',
        genero:           alumno.genero ?? '',
        nacionalidad:     alumno.nacionalidad ?? '',
        domicilio:        alumno.domicilio ?? '',
      });
    }
  }, [editMode, alumno]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateAlumnoDto) => alumnosApi.update(alumnoId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId] });
      qc.invalidateQueries({ queryKey: ['alumnos-autocomplete'] });
      setEditMode(false);
    },
  });

  function handleSavePersonal() {
    const dto: UpdateAlumnoDto = {};
    if (editForm.nombre)           dto.nombre           = (editForm.nombre as string).trim();
    if (editForm.apellido)         dto.apellido         = (editForm.apellido as string).trim();
    if (editForm.email !== undefined)      dto.email      = (editForm.email as string).trim() || undefined;
    if (editForm.telefono !== undefined)   dto.telefono   = (editForm.telefono as string).trim() || undefined;
    if (editForm.fecha_nacimiento !== undefined) dto.fecha_nacimiento = (editForm.fecha_nacimiento as string) || undefined;
    if (editForm.genero !== undefined)     dto.genero     = (editForm.genero as string) || undefined;
    if (editForm.nacionalidad !== undefined) dto.nacionalidad = (editForm.nacionalidad as string).trim() || undefined;
    if (editForm.domicilio !== undefined)  dto.domicilio  = (editForm.domicilio as string).trim() || undefined;
    updateMutation.mutate(dto);
  }

  function setEF(k: keyof UpdateAlumnoDto) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEditForm((f) => ({ ...f, [k]: e.target.value }));
  }

  // ── Página 2: Contactos ──────────────────────────────────────
  const [addingContact, setAddingContact] = useState(false);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);

  const contactMut = useMutation({
    mutationFn: (contactos: ContactoEmergencia[]) => alumnosApi.update(alumnoId, { contactos }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumnos', alumnoId] });
      setAddingContact(false);
      setContactForm(EMPTY_CONTACT);
    },
  });

  function addContact() {
    const nuevo: ContactoEmergencia = {
      nombre: contactForm.nombre,
      relacion: contactForm.relacion,
      ...(contactForm.telefono ? { telefono: contactForm.telefono } : {}),
      ...(contactForm.email    ? { email: contactForm.email }       : {}),
    };
    contactMut.mutate([...(alumno?.contactos ?? []), nuevo]);
  }

  function removeContact(index: number) {
    contactMut.mutate((alumno?.contactos ?? []).filter((_, i) => i !== index));
  }

  // ── Página 3: Documentación ──────────────────────────────────
  const [uploadTipo, setUploadTipo] = useState('dni');
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const subirMutation = useMutation({
    mutationFn: (file: File) => documentosApi.subir(alumnoId, file, uploadTipo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documentos', alumnoId] });
      setUploadError('');
      if (fileRef.current) fileRef.current.value = '';
    },
    onError: () => setUploadError('Error al subir el archivo. Verificá el formato y tamaño (máx. 10 MB).'),
  });

  const eliminarMutation = useMutation({
    mutationFn: (docId: string) => documentosApi.eliminar(alumnoId, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos', alumnoId] }),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) subirMutation.mutate(file);
  }

  // ── Página 4: Inscripciones ──────────────────────────────────
  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'regular' | 'libre' | 'baja' }) =>
      inscripcionesApi.cambiarEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inscripciones-alumno', alumnoId] }),
  });

  // ── Misc ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleDownload() {
    setDownloadError('');
    setDownloading(true);
    try { await pdfApi.downloadFicha(alumnoId); }
    catch (e) { setDownloadError((e as Error).message ?? 'Error al generar el PDF'); }
    finally   { setDownloading(false); }
  }

  return (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.modal}>

        {/* ── Cabecera ── */}
        <div style={S.header}>
          <div>
            <h2 style={S.title}>
              {alumno ? `${alumno.apellido}, ${alumno.nombre}` : 'Ficha del Alumno'}
            </h2>
            {alumno && <span style={S.legajoBadge}>Legajo {alumno.legajo}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={{ ...S.btnPdf, opacity: downloading ? 0.6 : 1 }}
              onClick={handleDownload} disabled={downloading || isLoading}>
              {downloading ? 'Generando...' : '⬇ PDF'}
            </button>
            <button style={S.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {downloadError && <div style={S.errorBar}>{downloadError}</div>}

        {/* ── Tabs ── */}
        <div style={S.paginatorRow}>
          {SECCIONES.map((sec, i) => (
            <button key={sec}
              style={{ ...S.pageTab, ...(pagina === i + 1 ? S.pageTabActive : {}) }}
              onClick={() => { setPagina(i + 1); setEditMode(false); }}>
              {sec}
            </button>
          ))}
        </div>

        {/* ── Cuerpo ── */}
        <div style={S.body}>
          {isLoading && <p style={S.empty}>Cargando datos del alumno...</p>}

          {/* ═══ Página 1: Datos personales ═══ */}
          {!isLoading && alumno && pagina === 1 && (
            <div>
              {/* Cabecera de sección */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Información del alumno
                </span>
                {!editMode ? (
                  <button style={S.btnEdit} onClick={() => setEditMode(true)}>✏ Editar</button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={S.btnCancel} onClick={() => setEditMode(false)} disabled={updateMutation.isPending}>
                      Cancelar
                    </button>
                    <button
                      style={{ ...S.btnSave, opacity: updateMutation.isPending ? 0.6 : 1 }}
                      onClick={handleSavePersonal}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                )}
              </div>

              {updateMutation.isError && (
                <div style={{ ...S.errorBar, marginBottom: 12 }}>Error al guardar. Revisá los datos ingresados.</div>
              )}

              {/* Vista solo lectura */}
              {!editMode && (
                <dl style={S.dl}>
                  <DRow label="Legajo"             value={alumno.legajo} />
                  <DRow label="Estado"             value={<EstadoBadge estado={alumno.estado} />} />
                  <DRow label="DNI"                value={alumno.dni} />
                  <DRow label="Apellido"           value={alumno.apellido} />
                  <DRow label="Nombre"             value={alumno.nombre} />
                  <DRow label="Fecha de nacimiento" value={fmtDate(alumno.fecha_nacimiento)} />
                  <DRow label="Género"             value={generoLabel(alumno.genero)} />
                  <DRow label="Nacionalidad"       value={alumno.nacionalidad ?? '—'} />
                  <DRow label="Email"              value={alumno.email ?? '—'} />
                  <DRow label="Teléfono"           value={alumno.telefono ?? '—'} />
                  <DRow label="Domicilio"          value={alumno.domicilio ?? '—'} />
                  {alumno.estado === 'baja' && alumno.fecha_baja && (
                    <>
                      <DRow label="Fecha de baja"  value={fmtDate(alumno.fecha_baja)} />
                      <DRow label="Motivo de baja" value={alumno.motivo_baja ?? '—'} />
                    </>
                  )}
                </dl>
              )}

              {/* Formulario de edición */}
              {editMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={S.editGrid}>
                    <label style={S.label}>
                      Apellido *
                      <input style={S.input} value={String(editForm.apellido ?? '')} onChange={setEF('apellido')} />
                    </label>
                    <label style={S.label}>
                      Nombre *
                      <input style={S.input} value={String(editForm.nombre ?? '')} onChange={setEF('nombre')} />
                    </label>
                    <label style={S.label}>
                      DNI
                      <input style={{ ...S.input, background: '#f8fafc', color: '#94a3b8' }} value={alumno.dni} readOnly />
                    </label>
                    <label style={S.label}>
                      Fecha de nacimiento
                      <input type="date" style={S.input} value={String(editForm.fecha_nacimiento ?? '')} onChange={setEF('fecha_nacimiento')} />
                    </label>
                    <label style={S.label}>
                      Género
                      <select style={S.input} value={String(editForm.genero ?? '')} onChange={setEF('genero')}>
                        <option value="">Sin especificar</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                        <option value="otro">Otro</option>
                        <option value="no_especificado">Prefiero no decir</option>
                      </select>
                    </label>
                    <label style={S.label}>
                      Nacionalidad
                      <input style={S.input} value={String(editForm.nacionalidad ?? '')} onChange={setEF('nacionalidad')} placeholder="Argentina" />
                    </label>
                    <label style={S.label}>
                      Email
                      <input type="email" style={S.input} value={String(editForm.email ?? '')} onChange={setEF('email')} />
                    </label>
                    <label style={S.label}>
                      Teléfono
                      <input style={S.input} value={String(editForm.telefono ?? '')} onChange={setEF('telefono')} />
                    </label>
                  </div>
                  <label style={S.label}>
                    Domicilio
                    <input style={S.input} value={String(editForm.domicilio ?? '')} onChange={setEF('domicilio')} placeholder="Av. Corrientes 1234, CABA" />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ═══ Página 2: Contactos ═══ */}
          {pagina === 2 && (
            <div>
              {(!alumno || alumno.contactos.length === 0) && !addingContact && (
                <p style={S.empty}>Sin contactos de emergencia registrados.</p>
              )}

              {alumno?.contactos.map((c, i) => (
                <div key={i} style={S.contactCard}>
                  <div style={S.contactHeader}>
                    <span style={S.contactNombre}>{c.nombre}</span>
                    <span style={S.contactRelacion}>{c.relacion}</span>
                    <button style={S.contactRemoveBtn} onClick={() => removeContact(i)}
                      disabled={contactMut.isPending} title="Eliminar contacto">✕</button>
                  </div>
                  <dl style={S.dl}>
                    <DRow label="Teléfono" value={c.telefono ?? '—'} />
                    <DRow label="Email"    value={c.email ?? '—'} />
                  </dl>
                </div>
              ))}

              {addingContact && (
                <div style={S.addContactForm}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={S.label}>
                      Nombre *
                      <input style={S.input} value={contactForm.nombre}
                        onChange={(e) => setContactForm((f) => ({ ...f, nombre: e.target.value }))}
                        placeholder="Nombre completo" autoFocus />
                    </label>
                    <label style={S.label}>
                      Relación
                      <select style={S.input} value={contactForm.relacion}
                        onChange={(e) => setContactForm((f) => ({ ...f, relacion: e.target.value as ContactoEmergencia['relacion'] }))}>
                        <option value="padre">Padre</option>
                        <option value="madre">Madre</option>
                        <option value="tutor">Tutor/a</option>
                        <option value="otro">Otro</option>
                      </select>
                    </label>
                    <label style={S.label}>
                      Teléfono
                      <input style={S.input} value={contactForm.telefono}
                        onChange={(e) => setContactForm((f) => ({ ...f, telefono: e.target.value }))}
                        placeholder="11-5555-5555" />
                    </label>
                    <label style={S.label}>
                      Email
                      <input type="email" style={S.input} value={contactForm.email}
                        onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="email@ejemplo.com" />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                    <button style={S.btnCancel}
                      onClick={() => { setAddingContact(false); setContactForm(EMPTY_CONTACT); }}>
                      Cancelar
                    </button>
                    <button style={S.btnSave}
                      disabled={!contactForm.nombre || contactMut.isPending}
                      onClick={addContact}>
                      {contactMut.isPending ? 'Guardando...' : 'Guardar contacto'}
                    </button>
                  </div>
                </div>
              )}

              {!addingContact && (
                <button style={S.btnAddContact} onClick={() => setAddingContact(true)}>
                  + Agregar contacto de emergencia
                </button>
              )}
            </div>
          )}

          {/* ═══ Página 3: Documentación ═══ */}
          {pagina === 3 && (
            <div>
              {/* Upload area */}
              <div style={S.uploadCard}>
                <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Adjuntar documento
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <label style={{ ...S.label, flex: '0 0 auto' }}>
                    Tipo
                    <select style={{ ...S.input, minWidth: 180 }} value={uploadTipo}
                      onChange={(e) => setUploadTipo(e.target.value)}>
                      {TIPOS_DOCUMENTO.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ ...S.label, flex: 1, minWidth: 200 }}>
                    Archivo (PDF, imagen — máx. 10 MB)
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      style={{ ...S.input, padding: '6px 10px', cursor: 'pointer' }}
                      onChange={handleFileChange}
                      disabled={subirMutation.isPending}
                    />
                  </label>
                </div>
                {subirMutation.isPending && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#2563eb' }}>Subiendo archivo...</p>
                )}
                {subirMutation.isSuccess && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#15803d' }}>✓ Archivo subido correctamente</p>
                )}
                {uploadError && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#dc2626' }}>{uploadError}</p>
                )}
              </div>

              {/* Tabla de documentos */}
              {documentos.length === 0 && (
                <p style={S.empty}>Sin documentos adjuntos aún.</p>
              )}
              {documentos.length > 0 && (
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['Tipo', 'Archivo', 'Tamaño', 'Fecha', ''].map((h) => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {documentos.map((d) => (
                      <tr key={d.id} style={S.tr}>
                        <td style={S.td}>
                          <span style={S.tipoBadge}>{tipoDocumentoLabel(d.tipo_documento)}</span>
                        </td>
                        <td style={S.td}>
                          <a href={d.url} target="_blank" rel="noopener noreferrer" style={S.link}>
                            {d.nombre_archivo}
                          </a>
                        </td>
                        <td style={S.td}>{formatBytes(d.tamano_bytes)}</td>
                        <td style={S.td}>{new Date(d.created_at).toLocaleDateString('es-AR')}</td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <button
                            style={S.btnDanger}
                            onClick={() => eliminarMutation.mutate(d.id)}
                            disabled={eliminarMutation.isPending}
                            title="Eliminar documento"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ═══ Página 4: Inscripciones ═══ */}
          {pagina === 4 && (
            <div>
              {inscripciones.length === 0 && (
                <p style={S.empty}>Sin inscripciones registradas.</p>
              )}
              {inscripciones.length > 0 && (
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['Ciclo', 'Curso', 'Estado', 'Fecha', 'Observaciones'].map((h) => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inscripciones.map((ins) => (
                      <tr key={ins.id} style={S.tr}>
                        <td style={{ ...S.td, fontWeight: 700 }}>{ins.ciclo_lectivo}</td>
                        <td style={S.td}>{ins.curso_nombre}</td>
                        <td style={S.td}>
                          <select
                            style={S.estadoSelect}
                            value={ins.estado}
                            disabled={estadoMutation.isPending}
                            onChange={(e) =>
                              estadoMutation.mutate({
                                id: ins.id,
                                estado: e.target.value as 'regular' | 'libre' | 'baja',
                              })
                            }
                          >
                            <option value="regular">Regular</option>
                            <option value="libre">Libre</option>
                            <option value="baja">Baja</option>
                          </select>
                        </td>
                        <td style={S.td}>{fmtDate(ins.fecha_inscripcion)}</td>
                        <td style={{ ...S.td, color: '#64748b' }}>{ins.observaciones ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {estadoMutation.isError && (
                <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>
                  Error al actualizar el estado de la inscripción.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Navegación inferior ── */}
        <div style={S.footer}>
          <span style={S.pageIndicator}>{pagina} / {TOTAL}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...S.navBtn, opacity: pagina === 1 ? 0.4 : 1 }}
              disabled={pagina === 1} onClick={() => { setPagina((p) => p - 1); setEditMode(false); }}>
              ← Anterior
            </button>
            <button style={{ ...S.navBtn, opacity: pagina === TOTAL ? 0.4 : 1 }}
              disabled={pagina === TOTAL} onClick={() => { setPagina((p) => p + 1); setEditMode(false); }}>
              Siguiente →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────

function DRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
      <dt style={{ width: 180, color: '#64748b', fontSize: 13, flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>{value}</dd>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, React.CSSProperties> = {
    activo:   { background: '#dcfce7', color: '#15803d' },
    baja:     { background: '#fee2e2', color: '#b91c1c' },
    egresado: { background: '#e0f2fe', color: '#0369a1' },
  };
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, ...colors[estado] }}>
      {estado}
    </span>
  );
}

function generoLabel(g: string | null | undefined) {
  if (!g) return '—';
  const map: Record<string, string> = {
    masculino: 'Masculino', femenino: 'Femenino', otro: 'Otro', no_especificado: 'Prefiero no decir',
  };
  return map[g] ?? g;
}

// ── Estilos ───────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 14, width: '100%', maxWidth: 780,
    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0',
  },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  legajoBadge: {
    display: 'inline-block', marginTop: 4, padding: '2px 8px',
    background: '#f1f5f9', borderRadius: 4, fontSize: 12, color: '#475569',
  },
  btnPdf: {
    padding: '7px 14px', background: '#0f172a', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
    color: '#94a3b8', padding: '2px 6px',
  },
  errorBar: {
    background: '#fee2e2', color: '#b91c1c', padding: '8px 24px', fontSize: 13,
  },
  paginatorRow: {
    display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px',
  },
  pageTab: {
    padding: '10px 14px', border: 'none', background: 'transparent',
    cursor: 'pointer', fontSize: 13, color: '#64748b',
    borderBottom: '2px solid transparent', marginBottom: -1,
  },
  pageTabActive: {
    color: '#2563eb', borderBottomColor: '#2563eb', fontWeight: 600,
  },
  body: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', borderTop: '1px solid #e2e8f0',
  },
  pageIndicator: { fontSize: 13, color: '#94a3b8', fontWeight: 500 },
  navBtn: {
    padding: '8px 18px', background: '#fff', border: '1px solid #d1d5db',
    borderRadius: 8, cursor: 'pointer', fontSize: 13,
  },
  dl: { margin: 0 },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '32px 0', fontSize: 14 },

  // Edit controls
  btnEdit:   { padding: '6px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  btnSave:   { padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnCancel: { padding: '6px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  editGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 },
  label:     { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:     { padding: '8px 11px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', fontFamily: 'inherit' },

  // Contactos
  contactCard:      { border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 10 },
  contactHeader:    { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  contactNombre:    { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  contactRelacion:  { fontSize: 11, fontWeight: 600, padding: '2px 8px', background: '#f0f9ff', color: '#0369a1', borderRadius: 20 },
  contactRemoveBtn: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: '2px 6px', borderRadius: 4, flexShrink: 0 },
  addContactForm:   { border: '1px dashed #bfdbfe', borderRadius: 10, padding: '14px 16px', marginBottom: 10, background: '#f8fafc' },
  btnAddContact:    { display: 'block', width: '100%', padding: '10px', background: 'none', border: '1px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 } as React.CSSProperties,

  // Documentos
  uploadCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tr:         { borderBottom: '1px solid #f1f5f9' },
  td:         { padding: '10px 12px', fontSize: 13, color: '#0f172a' },
  tipoBadge:  { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#e0f2fe', color: '#0369a1' },
  link:       { color: '#2563eb', textDecoration: 'none', fontSize: 13 },
  btnDanger:  { fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid #fecaca', color: '#b91c1c', background: 'none', cursor: 'pointer', fontWeight: 500 },

  // Inscripciones
  estadoSelect: { padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#fff' },
};
