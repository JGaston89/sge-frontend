import { useState, type FormEvent } from 'react';
import type { CreateAlumnoDto, ContactoEmergencia } from '../../../shared/types/alumnos.types';
import { validateEmail, validatePhone } from '../../../shared/utils/validators';

interface Props {
  initial?: Partial<CreateAlumnoDto>;
  onSubmit: (dto: CreateAlumnoDto) => void;
  error: string | null;
  isLoading: boolean;
  submitLabel?: string;
}

const EMPTY_CONTACTO: ContactoEmergencia = { nombre: '', relacion: 'padre', telefono: '', email: '' };

export function AlumnoForm({ initial = {}, onSubmit, error, isLoading, submitLabel = 'Guardar' }: Props) {
  const [form, setForm] = useState({
    nombre:          initial.nombre          ?? '',
    apellido:        initial.apellido        ?? '',
    dni:             initial.dni             ?? '',
    fecha_nacimiento:initial.fecha_nacimiento ?? '',
    genero:          initial.genero          ?? '',
    nacionalidad:    initial.nacionalidad    ?? '',
    email:           initial.email           ?? '',
    telefono:        initial.telefono        ?? '',
    domicilio:       initial.domicilio       ?? '',
  });
  const [contactos, setContactos] = useState<ContactoEmergencia[]>(initial.contactos ?? []);
  const [addingContacto, setAddingContacto] = useState(false);
  const [nuevoContacto, setNuevoContacto] = useState<ContactoEmergencia>(EMPTY_CONTACTO);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; telefono?: string }>({});

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function agregarContacto() {
    if (!nuevoContacto.nombre) return;
    const c: ContactoEmergencia = {
      nombre:   nuevoContacto.nombre,
      relacion: nuevoContacto.relacion,
      ...(nuevoContacto.telefono ? { telefono: nuevoContacto.telefono } : {}),
      ...(nuevoContacto.email    ? { email: nuevoContacto.email }       : {}),
    };
    setContactos((prev) => [...prev, c]);
    setNuevoContacto(EMPTY_CONTACTO);
    setAddingContacto(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const emailResult = validateEmail(form.email);
    const phoneResult = validatePhone(form.telefono);
    const errors: { email?: string; telefono?: string } = {};
    if (!emailResult.valid) errors.email = emailResult.error;
    if (!phoneResult.valid) errors.telefono = phoneResult.error;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const dto: CreateAlumnoDto = {
      nombre:   form.nombre.trim(),
      apellido: form.apellido.trim(),
      dni:      form.dni.trim(),
    };
    if (form.fecha_nacimiento) dto.fecha_nacimiento = form.fecha_nacimiento;
    if (form.genero)           dto.genero           = form.genero as CreateAlumnoDto['genero'];
    if (form.nacionalidad)     dto.nacionalidad     = form.nacionalidad.trim();
    if (form.email)            dto.email            = form.email.toLowerCase().trim();
    if (phoneResult.normalized) dto.telefono        = phoneResult.normalized;
    else if (form.telefono)     dto.telefono        = form.telefono.trim();
    if (form.domicilio)        dto.domicilio        = form.domicilio.trim();
    if (contactos.length > 0)  dto.contactos        = contactos;
    onSubmit(dto);
  }

  return (
    <form onSubmit={handleSubmit} style={S.form}>
      {error && <div style={S.error}>{error}</div>}

      {/* ── Datos obligatorios ── */}
      <section style={S.section}>
        <h3 style={S.sectionTitle}>Datos personales</h3>
        <div style={S.grid2}>
          <label style={S.label}>
            Apellido *
            <input required style={S.input} value={form.apellido} onChange={setField('apellido')} placeholder="García" />
          </label>
          <label style={S.label}>
            Nombre *
            <input required style={S.input} value={form.nombre} onChange={setField('nombre')} placeholder="Juan" />
          </label>
          <label style={S.label}>
            DNI *
            <input required style={S.input} value={form.dni} onChange={setField('dni')} placeholder="38123456" inputMode="numeric" />
          </label>
          <label style={S.label}>
            Fecha de nacimiento
            <input type="date" style={S.input} value={form.fecha_nacimiento} onChange={setField('fecha_nacimiento')} />
          </label>
          <label style={S.label}>
            Género
            <select style={S.input} value={form.genero} onChange={setField('genero')}>
              <option value="">Sin especificar</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="no_especificado">Prefiero no decir</option>
            </select>
          </label>
          <label style={S.label}>
            Nacionalidad
            <input style={S.input} value={form.nacionalidad} onChange={setField('nacionalidad')} placeholder="Argentina" />
          </label>
        </div>
      </section>

      {/* ── Contacto ── */}
      <section style={S.section}>
        <h3 style={S.sectionTitle}>Contacto</h3>
        <div style={S.grid2}>
          <label style={S.label}>
            Email
            <input
              style={{ ...S.input, ...(fieldErrors.email ? S.inputError : {}) }}
              value={form.email}
              onChange={(e) => { setField('email')(e); setFieldErrors(f => ({ ...f, email: undefined })); }}
              placeholder="alumno@ejemplo.com"
            />
            {fieldErrors.email && <span style={S.fieldError}>{fieldErrors.email}</span>}
          </label>
          <label style={S.label}>
            Teléfono
            <input
              style={{ ...S.input, ...(fieldErrors.telefono ? S.inputError : {}) }}
              value={form.telefono}
              onChange={(e) => { setField('telefono')(e); setFieldErrors(f => ({ ...f, telefono: undefined })); }}
              placeholder="+54 9 11 1234-5678"
            />
            {fieldErrors.telefono && <span style={S.fieldError}>{fieldErrors.telefono}</span>}
          </label>
        </div>
        <label style={{ ...S.label, marginTop: 14 }}>
          Domicilio
          <input style={S.input} value={form.domicilio} onChange={setField('domicilio')} placeholder="Av. Corrientes 1234, piso 2, CABA" />
        </label>
      </section>

      {/* ── Contactos de emergencia ── */}
      <section style={S.section}>
        <h3 style={S.sectionTitle}>Contactos de emergencia</h3>

        {contactos.length === 0 && !addingContacto && (
          <p style={S.emptyNote}>Sin contactos aún.</p>
        )}

        {contactos.map((c, i) => (
          <div key={i} style={S.contactoCard}>
            <div style={{ flex: 1 }}>
              <span style={S.contactoNombre}>{c.nombre}</span>
              <span style={S.contactoRelacion}>{c.relacion}</span>
              {c.telefono && <span style={S.contactoMeta}> · {c.telefono}</span>}
              {c.email    && <span style={S.contactoMeta}> · {c.email}</span>}
            </div>
            <button
              type="button"
              style={S.contactoRemove}
              onClick={() => setContactos((prev) => prev.filter((_, j) => j !== i))}
            >✕</button>
          </div>
        ))}

        {addingContacto && (
          <div style={S.contactoForm}>
            <div style={S.grid2}>
              <label style={S.label}>
                Nombre *
                <input
                  style={S.input}
                  value={nuevoContacto.nombre}
                  onChange={(e) => setNuevoContacto((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="María García"
                  autoFocus
                />
              </label>
              <label style={S.label}>
                Relación
                <select
                  style={S.input}
                  value={nuevoContacto.relacion}
                  onChange={(e) => setNuevoContacto((f) => ({ ...f, relacion: e.target.value as ContactoEmergencia['relacion'] }))}
                >
                  <option value="padre">Padre</option>
                  <option value="madre">Madre</option>
                  <option value="tutor">Tutor/a</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label style={S.label}>
                Teléfono
                <input
                  style={S.input}
                  value={nuevoContacto.telefono}
                  onChange={(e) => setNuevoContacto((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="11-5555-5555"
                />
              </label>
              <label style={S.label}>
                Email
                <input
                  type="email"
                  style={S.input}
                  value={nuevoContacto.email}
                  onChange={(e) => setNuevoContacto((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contacto@ejemplo.com"
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button type="button" style={S.btnSecondary} onClick={() => { setAddingContacto(false); setNuevoContacto(EMPTY_CONTACTO); }}>
                Cancelar
              </button>
              <button type="button" style={S.btnMini} disabled={!nuevoContacto.nombre} onClick={agregarContacto}>
                Agregar
              </button>
            </div>
          </div>
        )}

        {!addingContacto && (
          <button type="button" style={S.btnAddContacto} onClick={() => setAddingContacto(true)}>
            + Agregar contacto de emergencia
          </button>
        )}
      </section>

      {/* ── Documentación ── */}
      <section style={S.section}>
        <h3 style={S.sectionTitle}>Documentación</h3>
        <div style={S.docNote}>
          <span style={S.docNoteIcon}>📎</span>
          <span>
            Podés adjuntar foto carnet, DNI y otros documentos desde la{' '}
            <strong>Ficha Completa</strong> una vez creado el alumno.
          </span>
        </div>
      </section>

      {/* ── Footer ── */}
      <div style={S.footer}>
        <button type="submit" style={{ ...S.btnPrimary, opacity: isLoading ? 0.6 : 1 }} disabled={isLoading}>
          {isLoading ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

const S: Record<string, React.CSSProperties> = {
  form:           { display: 'flex', flexDirection: 'column', gap: 0 },
  error:          { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 20 },
  section:        { borderBottom: '1px solid #f1f5f9', paddingBottom: 24, marginBottom: 24 },
  sectionTitle:   { margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid2:          { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 },
  label:          { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:          { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  inputError:     { borderColor: '#ef4444' },
  fieldError:     { fontSize: 12, color: '#dc2626', marginTop: 2 },
  emptyNote:      { margin: '0 0 12px', fontSize: 13, color: '#94a3b8' },
  contactoCard:   { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 8 },
  contactoNombre: { fontSize: 14, fontWeight: 600, color: '#0f172a', marginRight: 8 },
  contactoRelacion:{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  contactoMeta:   { fontSize: 12, color: '#64748b' },
  contactoRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: '2px 6px', flexShrink: 0 },
  contactoForm:   { border: '1px dashed #bfdbfe', borderRadius: 10, padding: '16px', marginBottom: 12, background: '#f8fafc' },
  btnAddContacto: { width: '100%', padding: '9px', background: 'none', border: '1px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 } as React.CSSProperties,
  docNote:        { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af', lineHeight: 1.5 },
  docNoteIcon:    { fontSize: 18, flexShrink: 0 },
  footer:         { display: 'flex', justifyContent: 'flex-end', paddingTop: 8 },
  btnPrimary:     { padding: '11px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:   { padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  btnMini:        { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};
