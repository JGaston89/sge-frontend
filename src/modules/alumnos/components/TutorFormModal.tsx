import { useState, useEffect } from 'react';
import { alumnosApi } from '../../../api/alumnos.api';
import type { CreateTutorDto, LinkTutorDto, Tutor, RelacionTutor } from '../../../shared/types/alumnos.types';

interface Props {
  alumnoId: string;
  tutorEditar?: Tutor;          // si viene, modo edición
  onSave: () => void;
  onClose: () => void;
}

const RELACIONES: { value: RelacionTutor; label: string }[] = [
  { value: 'padre',       label: 'Padre' },
  { value: 'madre',       label: 'Madre' },
  { value: 'abuelo',      label: 'Abuelo' },
  { value: 'abuela',      label: 'Abuela' },
  { value: 'tio',         label: 'Tío' },
  { value: 'tia',         label: 'Tía' },
  { value: 'tutor_legal', label: 'Tutor legal' },
  { value: 'hermano',     label: 'Hermano' },
  { value: 'hermana',     label: 'Hermana' },
  { value: 'otro',        label: 'Otro' },
];

const TIPOS_DOC = ['DNI', 'CI', 'Pasaporte', 'Otro'];

const EMPTY_TUTOR: CreateTutorDto = {
  nombre: '', apellido: '', tipo_documento: 'DNI', numero_documento: '',
  email: '', telefono: '', telefono_laboral: '',
  domicilio_calle: '', domicilio_numero: '', domicilio_piso: '',
  domicilio_torre: '', domicilio_depto: '',
  localidad: '', provincia: '', codigo_postal: '',
  pais: 'Argentina', nacionalidad: 'Argentina', observaciones: '',
};

const EMPTY_RELACION: LinkTutorDto = {
  relacion: 'padre', es_contacto_emergencia: false,
  es_responsable_economico: false, vive_con_alumno: false, orden: 1,
};

export function TutorFormModal({ alumnoId, tutorEditar, onSave, onClose }: Props) {
  const isEditing = !!tutorEditar;

  // ── Estado del buscador de DNI ───────────────────────────────────
  const [dniSearch, setDniSearch]       = useState('');
  const [tipoSearch, setTipoSearch]     = useState('DNI');
  const [buscando, setBuscando]         = useState(false);
  const [existente, setExistente]       = useState<Tutor | null>(null);
  const [modoVinculo, setModoVinculo]   = useState(false); // tutor ya existe → solo elegir relación
  const [paso, setPaso]                 = useState<'buscar' | 'form'>(isEditing ? 'form' : 'buscar');

  // ── Formulario del tutor ─────────────────────────────────────────
  const [tutor, setTutor]       = useState<CreateTutorDto>(EMPTY_TUTOR);
  const [relacion, setRelacion] = useState<LinkTutorDto>(
    tutorEditar
      ? {
          relacion:                tutorEditar.relacion,
          es_contacto_emergencia:  tutorEditar.es_contacto_emergencia,
          es_responsable_economico:tutorEditar.es_responsable_economico,
          vive_con_alumno:         tutorEditar.vive_con_alumno,
          orden:                   tutorEditar.orden,
        }
      : EMPTY_RELACION,
  );

  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (tutorEditar) {
      setTutor({
        nombre: tutorEditar.nombre, apellido: tutorEditar.apellido,
        tipo_documento: tutorEditar.tipo_documento as any,
        numero_documento: tutorEditar.numero_documento,
        email: tutorEditar.email ?? '', telefono: tutorEditar.telefono ?? '',
        telefono_laboral: tutorEditar.telefono_laboral ?? '',
        domicilio_calle: tutorEditar.domicilio_calle ?? '',
        domicilio_numero: tutorEditar.domicilio_numero ?? '',
        domicilio_piso: tutorEditar.domicilio_piso ?? '',
        domicilio_torre: tutorEditar.domicilio_torre ?? '',
        domicilio_depto: tutorEditar.domicilio_depto ?? '',
        localidad: tutorEditar.localidad ?? '',
        provincia: tutorEditar.provincia ?? '',
        codigo_postal: tutorEditar.codigo_postal ?? '',
        pais: tutorEditar.pais ?? 'Argentina',
        nacionalidad: tutorEditar.nacionalidad ?? '',
        observaciones: tutorEditar.observaciones ?? '',
      });
    }
  }, [tutorEditar]);

  // ── Búsqueda por DNI ─────────────────────────────────────────────
  async function buscarTutor() {
    if (!dniSearch.trim()) return;
    setBuscando(true);
    const found = await alumnosApi.buscarTutor(tipoSearch, dniSearch.trim());
    setBuscando(false);
    if (found) {
      setExistente(found);
      setModoVinculo(true);
      setRelacion(EMPTY_RELACION);
      setPaso('form');
    } else {
      setExistente(null);
      setModoVinculo(false);
      setTutor(prev => ({ ...prev, tipo_documento: tipoSearch as any, numero_documento: dniSearch.trim() }));
      setPaso('form');
    }
  }

  // ── Guardar ─────────────────────────────────────────────────────
  async function handleSave() {
    if (!relacion.relacion) { setSaveErr('Seleccioná una relación.'); return; }
    setSaving(true);
    setSaveErr('');
    try {
      if (isEditing && tutorEditar) {
        // Modo edición: actualizar datos + relación
        await alumnosApi.updateTutorDatos(alumnoId, tutorEditar.id, cleanTutor(tutor));
        await alumnosApi.updateRelacion(alumnoId, tutorEditar.id, relacion);
      } else if (modoVinculo && existente) {
        // Vincular tutor existente
        await alumnosApi.addTutor(alumnoId, { tutor_id: existente.id, relacion });
      } else {
        // Crear nuevo y vincular
        await alumnosApi.addTutor(alumnoId, { tutor: cleanTutor(tutor), relacion });
      }
      onSave();
    } catch (e: any) {
      setSaveErr(e?.response?.data?.message ?? e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function cleanTutor(t: CreateTutorDto): CreateTutorDto {
    return Object.fromEntries(
      Object.entries(t).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? undefined : v])
    ) as CreateTutorDto;
  }

  const setT = (f: keyof CreateTutorDto) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setTutor(prev => ({ ...prev, [f]: e.target.value }));

  const setR = (f: keyof LinkTutorDto) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setRelacion(prev => ({ ...prev, [f]: val }));
    };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <h2 style={S.title}>
            {isEditing ? 'Editar tutor' : modoVinculo ? 'Vincular tutor existente' : 'Agregar tutor / responsable'}
          </h2>
          <button style={S.btnClose} onClick={onClose}>✕</button>
        </div>

        <div style={S.body}>

          {/* ── Paso 1: búsqueda por DNI ── */}
          {paso === 'buscar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>
                Primero buscá por documento para evitar cargar duplicados.
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <label style={S.label}>Tipo
                  <select style={{ ...S.input, width: 110 }} value={tipoSearch} onChange={e => setTipoSearch(e.target.value)}>
                    {TIPOS_DOC.map(t => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label style={{ ...S.label, flex: 1, minWidth: 160 }}>Número de documento *
                  <input
                    style={S.input}
                    value={dniSearch}
                    onChange={e => setDniSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buscarTutor()}
                    placeholder="38123456"
                    autoFocus
                  />
                </label>
                <button style={S.btnPrimary} onClick={buscarTutor} disabled={buscando || !dniSearch.trim()}>
                  {buscando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              <button style={S.btnLink} onClick={() => { setPaso('form'); setModoVinculo(false); }}>
                Omitir búsqueda y cargar manualmente →
              </button>
            </div>
          )}

          {/* ── Paso 2: formulario ── */}
          {paso === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Banner tutor existente */}
              {modoVinculo && existente && (
                <div style={S.existenteBanner}>
                  <span>✅</span>
                  <div>
                    <strong>{existente.apellido}, {existente.nombre}</strong>
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
                      {existente.tipo_documento} {existente.numero_documento}
                    </span>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Ya está registrado. Se vinculará sin duplicar datos.
                    </div>
                  </div>
                  <button style={S.btnLink} onClick={() => { setModoVinculo(false); setExistente(null); }}>
                    Usar otro
                  </button>
                </div>
              )}

              {/* Datos del tutor (solo si es nuevo o edición) */}
              {!modoVinculo && (
                <>
                  <Section title="Datos personales">
                    <div style={S.grid2}>
                      <label style={S.label}>Apellido *
                        <input required style={S.input} value={tutor.apellido} onChange={setT('apellido')} />
                      </label>
                      <label style={S.label}>Nombre *
                        <input required style={S.input} value={tutor.nombre} onChange={setT('nombre')} />
                      </label>
                      <label style={S.label}>Tipo documento
                        <select style={S.input} value={tutor.tipo_documento} onChange={setT('tipo_documento')}>
                          {TIPOS_DOC.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </label>
                      <label style={S.label}>Nro. documento *
                        <input required style={S.input} value={tutor.numero_documento} onChange={setT('numero_documento')} />
                      </label>
                      <label style={S.label}>Nacionalidad
                        <input style={S.input} value={tutor.nacionalidad} onChange={setT('nacionalidad')} placeholder="Argentina" />
                      </label>
                    </div>
                  </Section>

                  <Section title="Contacto">
                    <div style={S.grid2}>
                      <label style={S.label}>Email
                        <input type="email" style={S.input} value={tutor.email} onChange={setT('email')} />
                      </label>
                      <label style={S.label}>Teléfono
                        <input style={S.input} value={tutor.telefono} onChange={setT('telefono')} placeholder="+54 9 11..." />
                      </label>
                      <label style={S.label}>Teléfono laboral
                        <input style={S.input} value={tutor.telefono_laboral} onChange={setT('telefono_laboral')} />
                      </label>
                    </div>
                  </Section>

                  <Section title="Domicilio">
                    <div style={{ ...S.grid2, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                      <label style={{ ...S.label, gridColumn: 'span 2' }}>Calle
                        <input style={S.input} value={tutor.domicilio_calle} onChange={setT('domicilio_calle')} />
                      </label>
                      <label style={S.label}>Número
                        <input style={S.input} value={tutor.domicilio_numero} onChange={setT('domicilio_numero')} />
                      </label>
                      <label style={S.label}>Piso
                        <input style={S.input} value={tutor.domicilio_piso} onChange={setT('domicilio_piso')} />
                      </label>
                      <label style={S.label}>Torre
                        <input style={S.input} value={tutor.domicilio_torre} onChange={setT('domicilio_torre')} />
                      </label>
                      <label style={S.label}>Depto
                        <input style={S.input} value={tutor.domicilio_depto} onChange={setT('domicilio_depto')} />
                      </label>
                      <label style={S.label}>Localidad
                        <input style={S.input} value={tutor.localidad} onChange={setT('localidad')} />
                      </label>
                      <label style={S.label}>Provincia
                        <input style={S.input} value={tutor.provincia} onChange={setT('provincia')} />
                      </label>
                      <label style={S.label}>Cód. postal
                        <input style={S.input} value={tutor.codigo_postal} onChange={setT('codigo_postal')} />
                      </label>
                      <label style={S.label}>País
                        <input style={S.input} value={tutor.pais} onChange={setT('pais')} />
                      </label>
                    </div>
                  </Section>

                  <Section title="Observaciones">
                    <textarea
                      style={{ ...S.input, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                      rows={2}
                      value={tutor.observaciones}
                      onChange={setT('observaciones')}
                      placeholder="Información adicional..."
                    />
                  </Section>
                </>
              )}

              {/* Relación con el alumno */}
              <Section title="Relación con el alumno">
                <div style={S.grid2}>
                  <label style={S.label}>Relación *
                    <select style={S.input} value={relacion.relacion} onChange={setR('relacion')}>
                      {RELACIONES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </label>
                  <label style={S.label}>Orden de contacto
                    <input
                      type="number" min={1} max={10}
                      style={{ ...S.input, width: 80 }}
                      value={relacion.orden ?? 1}
                      onChange={e => setRelacion(prev => ({ ...prev, orden: Number(e.target.value) }))}
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
                  {([
                    ['es_contacto_emergencia',    'Contacto de emergencia'],
                    ['es_responsable_economico',  'Responsable económico'],
                    ['vive_con_alumno',            'Vive con el alumno'],
                  ] as const).map(([field, label]) => (
                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!relacion[field]}
                        onChange={setR(field)}
                        style={{ width: 16, height: 16 }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {saveErr && <div style={S.errMsg}>{saveErr}</div>}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
          {paso === 'form' && (
            <button style={S.btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay:         { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '40px 16px' },
  modal:           { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' },
  title:           { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  btnClose:        { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', lineHeight: 1, padding: 4 },
  body:            { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  footer:          { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #f1f5f9' },
  grid2:           { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  label:           { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:           { padding: '8px 11px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  btnPrimary:      { padding: '9px 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:    { padding: '9px 18px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  btnLink:         { background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' },
  existenteBanner: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 14 },
  errMsg:          { padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: 13, marginTop: 8 },
};
