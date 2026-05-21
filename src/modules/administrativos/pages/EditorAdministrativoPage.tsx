import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { administrativosApi } from '../../../api/administrativos.api';
import { validateEmail, validatePhone } from '../../../shared/utils/validators';

export function EditorAdministrativoPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const soloPuedeVer = !user?.roles?.some(r => ['admin', 'directivo'].includes(r));
  if (soloPuedeVer) return <Navigate to="/administrativos" replace />;

  const { data: existing } = useQuery({
    queryKey: ['administrativo', id],
    queryFn:  () => administrativosApi.getOne(id!),
    enabled:  isEdit,
  });

  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', email: '',
    telefono: '', cargo: '', fecha_ingreso: '',
    estado: 'activo' as 'activo' | 'inactivo',
    observaciones: '',
  });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; telefono?: string }>({});

  useEffect(() => {
    if (existing) {
      setForm({
        nombre:        existing.nombre,
        apellido:      existing.apellido,
        dni:           existing.dni ?? '',
        email:         existing.email ?? '',
        telefono:      existing.telefono ?? '',
        cargo:         existing.cargo ?? '',
        fecha_ingreso: existing.fecha_ingreso?.slice(0, 10) ?? '',
        estado:        existing.estado,
        observaciones: existing.observaciones ?? '',
      });
    }
  }, [existing]);

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  function validateFields(): boolean {
    const emailResult = validateEmail(form.email);
    const phoneResult = validatePhone(form.telefono);
    const errors: { email?: string; telefono?: string } = {};
    if (!emailResult.valid) errors.email = emailResult.error;
    if (!phoneResult.valid) errors.telefono = phoneResult.error;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const phoneResult = validatePhone(form.telefono);
      return administrativosApi.create({
        nombre:        form.nombre,
        apellido:      form.apellido,
        dni:           form.dni || undefined,
        email:         form.email ? form.email.toLowerCase().trim() : undefined,
        telefono:      phoneResult.normalized ?? (form.telefono || undefined),
        cargo:         form.cargo || undefined,
        fecha_ingreso: form.fecha_ingreso || undefined,
        observaciones: form.observaciones || undefined,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['administrativos'] }); navigate('/administrativos'); },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const phoneResult = validatePhone(form.telefono);
      return administrativosApi.update(id!, {
        nombre:        form.nombre,
        apellido:      form.apellido,
        dni:           form.dni || undefined,
        email:         form.email ? form.email.toLowerCase().trim() : undefined,
        telefono:      phoneResult.normalized ?? (form.telefono || undefined),
        cargo:         form.cargo || undefined,
        fecha_ingreso: form.fecha_ingreso || null,
        estado:        form.estado,
        observaciones: form.observaciones || undefined,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['administrativos'] }); navigate('/administrativos'); },
  });

  const mutation  = isEdit ? updateMutation : createMutation;
  const canSubmit = !!form.nombre.trim() && !!form.apellido.trim();

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/administrativos" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>
          ← Personal Administrativo
        </Link>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.title}>{isEdit ? 'Editar legajo' : 'Nuevo legajo administrativo'}</h1>
        {isEdit && existing && (
          <p style={S.subtitle}>{existing.apellido}, {existing.nombre}</p>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); if (validateFields()) mutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Datos personales */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Datos personales</h2>
          <div style={S.grid2}>
            <label style={S.label}>
              Apellido *
              <input style={S.input} value={form.apellido} onChange={set('apellido')} required placeholder="González" />
            </label>
            <label style={S.label}>
              Nombre *
              <input style={S.input} value={form.nombre} onChange={set('nombre')} required placeholder="Laura" />
            </label>
            <label style={S.label}>
              DNI
              <input style={S.input} value={form.dni} onChange={set('dni')} placeholder="30123456" />
            </label>
            <label style={S.label}>
              Email
              <input
                style={{ ...S.input, ...(fieldErrors.email ? S.inputError : {}) }}
                value={form.email}
                onChange={(e) => { set('email')(e); setFieldErrors(f => ({ ...f, email: undefined })); }}
                placeholder="laura@escuela.com"
              />
              {fieldErrors.email && <span style={S.fieldError}>{fieldErrors.email}</span>}
            </label>
            <label style={S.label}>
              Teléfono
              <input
                style={{ ...S.input, ...(fieldErrors.telefono ? S.inputError : {}) }}
                value={form.telefono}
                onChange={(e) => { set('telefono')(e); setFieldErrors(f => ({ ...f, telefono: undefined })); }}
                placeholder="+54 9 11 1234-5678"
              />
              {fieldErrors.telefono && <span style={S.fieldError}>{fieldErrors.telefono}</span>}
            </label>
            <label style={S.label}>
              Fecha de ingreso
              <input style={S.input} type="date" value={form.fecha_ingreso} onChange={set('fecha_ingreso')} />
            </label>
          </div>
        </div>

        {/* Datos del cargo */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Cargo y función</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={S.label}>
              Cargo / Función
              <input
                style={S.input}
                value={form.cargo}
                onChange={set('cargo')}
                placeholder="Ej: Secretaria académica, Auxiliar administrativo, Preceptor/a..."
              />
            </label>
          </div>
        </div>

        {/* Estado y observaciones */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>Estado y observaciones</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isEdit && (
              <label style={S.label}>
                Estado
                <select style={S.input} value={form.estado} onChange={set('estado') as any}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </label>
            )}
            <label style={S.label}>
              Observaciones
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
          <Link to="/administrativos" style={S.btnSecondary}>Cancelar</Link>
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
  page:         { maxWidth: 760 },
  title:        { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:     { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:         { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 },
  sectionTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
  grid2:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 },
  label:        { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:        { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  inputError:   { borderColor: '#ef4444' },
  fieldError:   { fontSize: 12, color: '#dc2626', marginTop: 2 },
  saveRow:      { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingBottom: 24 },
  btnPrimary:   { padding: '11px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '11px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-block' },
};
