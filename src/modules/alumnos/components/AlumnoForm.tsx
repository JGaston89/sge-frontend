import { useState, type FormEvent } from 'react';
import type { CreateAlumnoDto } from '../../../shared/types/alumnos.types';
import { validateEmail, validatePhone } from '../../../shared/utils/validators';

interface Props {
  initial?: Partial<CreateAlumnoDto>;
  onSubmit: (dto: CreateAlumnoDto) => void;
  error: string | null;
  isLoading: boolean;
  submitLabel?: string;
}

type FormState = Required<{ [K in keyof CreateAlumnoDto]: string }>;

const EMPTY: FormState = {
  nombre: '', apellido: '', dni: '', fecha_nacimiento: '',
  genero: '', nacionalidad: '', email: '', telefono: '',
  domicilio_calle: '', domicilio_numero: '', domicilio_piso: '',
  domicilio_torre: '', domicilio_depto: '',
  localidad: '', provincia: '', codigo_postal: '',
};

export function AlumnoForm({ initial = {}, onSubmit, error, isLoading, submitLabel = 'Guardar' }: Props) {
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    nombre:           initial.nombre           ?? '',
    apellido:         initial.apellido         ?? '',
    dni:              initial.dni              ?? '',
    fecha_nacimiento: initial.fecha_nacimiento ?? '',
    genero:           initial.genero           ?? '',
    nacionalidad:     initial.nacionalidad     ?? '',
    email:            initial.email            ?? '',
    telefono:         initial.telefono         ?? '',
    domicilio_calle:  initial.domicilio_calle  ?? '',
    domicilio_numero: initial.domicilio_numero ?? '',
    domicilio_piso:   initial.domicilio_piso   ?? '',
    domicilio_torre:  initial.domicilio_torre  ?? '',
    domicilio_depto:  initial.domicilio_depto  ?? '',
    localidad:        initial.localidad        ?? '',
    provincia:        initial.provincia        ?? '',
    codigo_postal:    initial.codigo_postal    ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; telefono?: string }>({});

  const setField = (f: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [f]: e.target.value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const emailResult = validateEmail(form.email);
    const phoneResult = validatePhone(form.telefono);
    const errors: { email?: string; telefono?: string } = {};
    if (!emailResult.valid)  errors.email   = emailResult.error;
    if (!phoneResult.valid)  errors.telefono = phoneResult.error;
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
    if (form.domicilio_calle)  dto.domicilio_calle  = form.domicilio_calle.trim();
    if (form.domicilio_numero) dto.domicilio_numero = form.domicilio_numero.trim();
    if (form.domicilio_piso)   dto.domicilio_piso   = form.domicilio_piso.trim();
    if (form.domicilio_torre)  dto.domicilio_torre  = form.domicilio_torre.trim();
    if (form.domicilio_depto)  dto.domicilio_depto  = form.domicilio_depto.trim();
    if (form.localidad)        dto.localidad        = form.localidad.trim();
    if (form.provincia)        dto.provincia        = form.provincia.trim();
    if (form.codigo_postal)    dto.codigo_postal    = form.codigo_postal.trim();
    onSubmit(dto);
  }

  return (
    <form onSubmit={handleSubmit} style={S.form}>
      {error && <div style={S.error}>{error}</div>}

      {/* ── Datos personales ── */}
      <section style={S.section}>
        <h3 style={S.sectionTitle}>Datos personales</h3>
        <div style={S.grid2}>
          <label style={S.label}>Apellido *
            <input required style={S.input} value={form.apellido} onChange={setField('apellido')} placeholder="García" />
          </label>
          <label style={S.label}>Nombre *
            <input required style={S.input} value={form.nombre} onChange={setField('nombre')} placeholder="Juan" />
          </label>
          <label style={S.label}>DNI *
            <input required style={S.input} value={form.dni} onChange={setField('dni')} placeholder="38123456" inputMode="numeric" />
          </label>
          <label style={S.label}>Fecha de nacimiento
            <input type="date" style={S.input} value={form.fecha_nacimiento} onChange={setField('fecha_nacimiento')} />
          </label>
          <label style={S.label}>Género
            <select style={S.input} value={form.genero} onChange={setField('genero')}>
              <option value="">Sin especificar</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="no_especificado">Prefiero no decir</option>
            </select>
          </label>
          <label style={S.label}>Nacionalidad
            <input style={S.input} value={form.nacionalidad} onChange={setField('nacionalidad')} placeholder="Argentina" />
          </label>
        </div>
      </section>

      {/* ── Contacto ── */}
      <section style={S.section}>
        <h3 style={S.sectionTitle}>Contacto</h3>
        <div style={S.grid2}>
          <label style={S.label}>Email
            <input
              style={{ ...S.input, ...(fieldErrors.email ? S.inputError : {}) }}
              value={form.email}
              onChange={e => { setField('email')(e); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
              placeholder="alumno@ejemplo.com"
            />
            {fieldErrors.email && <span style={S.fieldError}>{fieldErrors.email}</span>}
          </label>
          <label style={S.label}>Teléfono
            <input
              style={{ ...S.input, ...(fieldErrors.telefono ? S.inputError : {}) }}
              value={form.telefono}
              onChange={e => { setField('telefono')(e); setFieldErrors(f => ({ ...f, telefono: undefined })); }}
              placeholder="+54 9 11 1234-5678"
            />
            {fieldErrors.telefono && <span style={S.fieldError}>{fieldErrors.telefono}</span>}
          </label>
        </div>
      </section>

      {/* ── Domicilio ── */}
      <section style={S.section}>
        <h3 style={S.sectionTitle}>Domicilio</h3>
        <div style={{ ...S.grid2, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          <label style={{ ...S.label, gridColumn: 'span 2' }}>Calle
            <input style={S.input} value={form.domicilio_calle} onChange={setField('domicilio_calle')} placeholder="Av. Corrientes" />
          </label>
          <label style={S.label}>Número
            <input style={S.input} value={form.domicilio_numero} onChange={setField('domicilio_numero')} placeholder="1234" />
          </label>
          <label style={S.label}>Piso
            <input style={S.input} value={form.domicilio_piso} onChange={setField('domicilio_piso')} placeholder="3" />
          </label>
          <label style={S.label}>Torre
            <input style={S.input} value={form.domicilio_torre} onChange={setField('domicilio_torre')} placeholder="B" />
          </label>
          <label style={S.label}>Depto
            <input style={S.input} value={form.domicilio_depto} onChange={setField('domicilio_depto')} placeholder="4B" />
          </label>
          <label style={S.label}>Localidad
            <input style={S.input} value={form.localidad} onChange={setField('localidad')} placeholder="CABA" />
          </label>
          <label style={S.label}>Provincia
            <input style={S.input} value={form.provincia} onChange={setField('provincia')} placeholder="Buenos Aires" />
          </label>
          <label style={S.label}>Código postal
            <input style={S.input} value={form.codigo_postal} onChange={setField('codigo_postal')} placeholder="1043" />
          </label>
        </div>
      </section>

      {/* ── Tutores ── */}
      <section style={S.section}>
        <h3 style={S.sectionTitle}>Tutores / responsables</h3>
        <div style={S.infoBox}>
          <span style={{ fontSize: 18 }}>👥</span>
          <span>
            Los tutores y responsables se cargan desde la <strong>Ficha del alumno</strong> una vez creado el registro.
            El sistema permite buscar tutores ya registrados (p.ej. hermanos en la institución) para evitar duplicar datos.
          </span>
        </div>
      </section>

      {/* ── Documentación ── */}
      <section style={S.section}>
        <h3 style={S.sectionTitle}>Documentación</h3>
        <div style={S.infoBox}>
          <span style={{ fontSize: 18 }}>📎</span>
          <span>Podés adjuntar foto carnet, DNI y otros documentos desde la <strong>Ficha Completa</strong> una vez creado el alumno.</span>
        </div>
      </section>

      <div style={S.footer}>
        <button type="submit" style={{ ...S.btnPrimary, opacity: isLoading ? 0.6 : 1 }} disabled={isLoading}>
          {isLoading ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

const S: Record<string, React.CSSProperties> = {
  form:        { display: 'flex', flexDirection: 'column', gap: 0 },
  error:       { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 20 },
  section:     { borderBottom: '1px solid #f1f5f9', paddingBottom: 24, marginBottom: 24 },
  sectionTitle:{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid2:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 },
  label:       { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:       { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  inputError:  { borderColor: '#ef4444' },
  fieldError:  { fontSize: 12, color: '#dc2626', marginTop: 2 },
  infoBox:     { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af', lineHeight: 1.5 },
  footer:      { display: 'flex', justifyContent: 'flex-end', paddingTop: 8 },
  btnPrimary:  { padding: '11px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
