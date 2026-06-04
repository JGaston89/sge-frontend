import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { docentesApi } from '../../../api/docentes.api';
import type { EstadoDocente } from '../../../shared/types/docentes.types';
import { validateEmail, validatePhone } from '../../../shared/utils/validators';

function EspecialidadesEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {tags.map((t) => (
          <span key={t} style={S.tag}>
            {t}
            <button type="button" style={S.tagX} onClick={() => onChange(tags.filter((x) => x !== t))}>✕</button>
          </span>
        ))}
        {tags.length === 0 && <span style={{ fontSize: 13, color: '#94a3b8' }}>Sin especialidades aún</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...S.input, flex: 1 }}
          placeholder="Ej: Matemática, Historia..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" style={S.btnMini} onClick={add}>Agregar</button>
      </div>
    </div>
  );
}

export function EditorDocentePage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['docente', id],
    queryFn: () => docentesApi.getOne(id!),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', email: '',
    telefono: '', fecha_nacimiento: '', genero: '', nacionalidad: '',
    domicilio_calle: '', domicilio_numero: '', domicilio_piso: '',
    domicilio_torre: '', domicilio_depto: '',
    localidad: '', provincia: '', codigo_postal: '',
    titulo: '', fecha_ingreso: '',
    estado: 'activo' as EstadoDocente, observaciones: '',
  });
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; telefono?: string }>({});

  useEffect(() => {
    if (existing) {
      setForm({
        nombre:           existing.nombre,
        apellido:         existing.apellido,
        dni:              existing.dni          ?? '',
        email:            existing.email        ?? '',
        telefono:         existing.telefono     ?? '',
        fecha_nacimiento: (existing as any).fecha_nacimiento?.slice(0, 10) ?? '',
        genero:           (existing as any).genero          ?? '',
        nacionalidad:     (existing as any).nacionalidad    ?? '',
        domicilio_calle:  (existing as any).domicilio_calle  ?? '',
        domicilio_numero: (existing as any).domicilio_numero ?? '',
        domicilio_piso:   (existing as any).domicilio_piso   ?? '',
        domicilio_torre:  (existing as any).domicilio_torre  ?? '',
        domicilio_depto:  (existing as any).domicilio_depto  ?? '',
        localidad:        (existing as any).localidad        ?? '',
        provincia:        (existing as any).provincia        ?? '',
        codigo_postal:    (existing as any).codigo_postal    ?? '',
        titulo:           existing.titulo        ?? '',
        fecha_ingreso:    existing.fecha_ingreso?.slice(0, 10) ?? '',
        estado:           existing.estado,
        observaciones:    existing.observaciones ?? '',
      });
      setEspecialidades(existing.especialidades ?? []);
    }
  }, [existing]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function validateFields(): boolean {
    const emailResult = validateEmail(form.email);
    const phoneResult = validatePhone(form.telefono);
    const errors: { email?: string; telefono?: string } = {};
    if (!emailResult.valid) errors.email = emailResult.error;
    if (!phoneResult.valid) errors.telefono = phoneResult.error;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildDto() {
    const phoneResult = validatePhone(form.telefono);
    return {
      nombre:           form.nombre,
      apellido:         form.apellido,
      dni:              form.dni              || undefined,
      email:            form.email ? form.email.toLowerCase().trim() : undefined,
      telefono:         phoneResult.normalized ?? (form.telefono || undefined),
      fecha_nacimiento: form.fecha_nacimiento  || undefined,
      genero:           form.genero            || undefined,
      nacionalidad:     form.nacionalidad      || undefined,
      domicilio_calle:  form.domicilio_calle   || undefined,
      domicilio_numero: form.domicilio_numero  || undefined,
      domicilio_piso:   form.domicilio_piso    || undefined,
      domicilio_torre:  form.domicilio_torre   || undefined,
      domicilio_depto:  form.domicilio_depto   || undefined,
      localidad:        form.localidad         || undefined,
      provincia:        form.provincia         || undefined,
      codigo_postal:    form.codigo_postal     || undefined,
      titulo:           form.titulo            || undefined,
      fecha_ingreso:    form.fecha_ingreso      || (isEdit ? null : undefined),
      especialidades,
      observaciones:    form.observaciones     || undefined,
    };
  }

  const createMutation = useMutation({
    mutationFn: () => docentesApi.create(buildDto()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['docentes'] }); navigate('/docentes'); },
  });

  const updateMutation = useMutation({
    mutationFn: () => docentesApi.update(id!, { ...buildDto(), estado: form.estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['docentes'] }); navigate('/docentes'); },
  });

  const mutation  = isEdit ? updateMutation : createMutation;
  const canSubmit = !!form.nombre.trim() && !!form.apellido.trim();

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/docentes" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>
          ← Gestión Docente
        </Link>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.title}>{isEdit ? 'Editar legajo docente' : 'Nuevo legajo docente'}</h1>
        {isEdit && existing && <p style={S.subtitle}>{existing.apellido}, {existing.nombre}</p>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (validateFields()) mutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Datos personales */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Datos personales</h2>
          <div style={S.grid2}>
            <label style={S.label}>Apellido *
              <input style={S.input} value={form.apellido} onChange={set('apellido')} required placeholder="García" />
            </label>
            <label style={S.label}>Nombre *
              <input style={S.input} value={form.nombre} onChange={set('nombre')} required placeholder="Juan" />
            </label>
            <label style={S.label}>DNI
              <input style={S.input} value={form.dni} onChange={set('dni')} placeholder="12345678" />
            </label>
            <label style={S.label}>Fecha de nacimiento
              <input style={S.input} type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} />
            </label>
            <label style={S.label}>Género
              <select style={S.input} value={form.genero} onChange={set('genero')}>
                <option value="">Sin especificar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
                <option value="no_especificado">Prefiero no decir</option>
              </select>
            </label>
            <label style={S.label}>Nacionalidad
              <input style={S.input} value={form.nacionalidad} onChange={set('nacionalidad')} placeholder="Argentina" />
            </label>
            <label style={S.label}>Email
              <input
                style={{ ...S.input, ...(fieldErrors.email ? S.inputError : {}) }}
                value={form.email}
                onChange={(e) => { set('email')(e); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                placeholder="docente@escuela.edu"
              />
              {fieldErrors.email && <span style={S.fieldError}>{fieldErrors.email}</span>}
            </label>
            <label style={S.label}>Teléfono
              <input
                style={{ ...S.input, ...(fieldErrors.telefono ? S.inputError : {}) }}
                value={form.telefono}
                onChange={(e) => { set('telefono')(e); setFieldErrors(prev => ({ ...prev, telefono: undefined })); }}
                placeholder="+54 9 11 1234-5678"
              />
              {fieldErrors.telefono && <span style={S.fieldError}>{fieldErrors.telefono}</span>}
            </label>
            <label style={S.label}>Fecha de ingreso
              <input style={S.input} type="date" value={form.fecha_ingreso} onChange={set('fecha_ingreso')} />
            </label>
          </div>
        </div>

        {/* Domicilio */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Domicilio</h2>
          <div style={{ ...S.grid2, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            <label style={{ ...S.label, gridColumn: 'span 2' }}>Calle
              <input style={S.input} value={form.domicilio_calle} onChange={set('domicilio_calle')} placeholder="Av. Corrientes" />
            </label>
            <label style={S.label}>Número
              <input style={S.input} value={form.domicilio_numero} onChange={set('domicilio_numero')} placeholder="1234" />
            </label>
            <label style={S.label}>Piso
              <input style={S.input} value={form.domicilio_piso} onChange={set('domicilio_piso')} placeholder="3" />
            </label>
            <label style={S.label}>Torre
              <input style={S.input} value={form.domicilio_torre} onChange={set('domicilio_torre')} placeholder="B" />
            </label>
            <label style={S.label}>Depto
              <input style={S.input} value={form.domicilio_depto} onChange={set('domicilio_depto')} placeholder="4B" />
            </label>
            <label style={S.label}>Localidad
              <input style={S.input} value={form.localidad} onChange={set('localidad')} placeholder="CABA" />
            </label>
            <label style={S.label}>Provincia
              <input style={S.input} value={form.provincia} onChange={set('provincia')} placeholder="Buenos Aires" />
            </label>
            <label style={S.label}>Código postal
              <input style={S.input} value={form.codigo_postal} onChange={set('codigo_postal')} placeholder="1043" />
            </label>
          </div>
        </div>

        {/* Datos profesionales */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Datos profesionales</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={S.label}>Título docente
              <input style={S.input} value={form.titulo} onChange={set('titulo')} placeholder="Ej: Profesor en Matemática, Licenciado en Historia..." />
            </label>
            <div>
              <div style={{ fontSize: 13, color: '#374151', fontWeight: 500, marginBottom: 6 }}>Especialidades / materias que dicta</div>
              <EspecialidadesEditor tags={especialidades} onChange={setEspecialidades} />
            </div>
          </div>
        </div>

        {/* Estado y observaciones */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Estado y observaciones</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isEdit && (
              <label style={S.label}>Estado
                <select style={S.input} value={form.estado} onChange={set('estado') as any}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="licencia">Licencia</option>
                </select>
              </label>
            )}
            <label style={S.label}>Observaciones
              <textarea
                style={{ ...S.input, resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
                value={form.observaciones}
                onChange={set('observaciones')}
                placeholder="Información adicional (opcional)..."
                rows={3}
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={S.saveRow}>
          {mutation.isError && (
            <span style={{ color: '#dc2626', fontSize: 14 }}>
              {(() => {
                const resp = (mutation.error as { response?: { data?: { message?: string; details?: { message: string }[] } } })?.response?.data;
                if (resp?.details?.length) return resp.details.map(d => d.message).join(' · ');
                return resp?.message ?? 'Error al guardar. Verificá los datos ingresados.';
              })()}
            </span>
          )}
          <Link to="/docentes" style={S.btnSecondary}>Cancelar</Link>
          <button
            type="submit"
            style={{ ...S.btnPrimary, opacity: !canSubmit || mutation.isPending ? 0.6 : 1 }}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear legajo'}
          </button>
        </div>
      </form>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 760 },
  title:       { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:    { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:        { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 },
  sectionTitle:{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
  grid2:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 },
  label:       { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:       { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  tag:         { display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600, padding: '3px 8px 3px 10px', borderRadius: 20 },
  tagX:        { background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', fontSize: 11, padding: 0, lineHeight: 1 },
  inputError:  { borderColor: '#ef4444' },
  fieldError:  { fontSize: 12, color: '#dc2626', marginTop: 2 },
  btnMini:     { padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' },
  saveRow:     { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingBottom: 24 },
  btnPrimary:  { padding: '11px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '11px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-block' },
};
