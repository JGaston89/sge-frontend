import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import {
  usuariosApi,
  type UsuarioSistema,
  type PendienteActivacion,
  type CreateUsuarioDto,
} from '../../../api/usuarios.api';
import { authApi } from '../../../api/auth.api';
import { validateEmail } from '../../../shared/utils/validators';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(v: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function fmtRelative(v: string | null): string {
  if (!v) return '—';
  const ms = Date.now() - new Date(v).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24) return `hace ${hs} h`;
  const days = Math.floor(hs / 24);
  return `hace ${days} día${days !== 1 ? 's' : ''}`;
}

function normalizeRoles(roles: unknown): string[] {
  if (Array.isArray(roles)) return roles as string[];
  if (typeof roles === 'string' && roles.startsWith('{')) {
    const inner = roles.slice(1, -1);
    return inner === '' ? [] : inner.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  }
  return [];
}

function errMsg(err: unknown) {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error inesperado';
  return Array.isArray(msg) ? msg.join(', ') : String(msg);
}

const ROL_CHIP: Record<string, React.CSSProperties> = {
  admin:          { background: '#fef3c7', color: '#92400e' },
  directivo:      { background: '#ede9fe', color: '#5b21b6' },
  administrativo: { background: '#dbeafe', color: '#1e40af' },
};

const TIPO_CHIP: Record<string, { label: string; style: React.CSSProperties }> = {
  alumno:          { label: 'Alumno',          style: { background: '#faf5ff', color: '#7c3aed' } },
  docente:         { label: 'Docente',          style: { background: '#eff6ff', color: '#2563eb' } },
  administrativo:  { label: 'Administrativo',   style: { background: '#fef3c7', color: '#92400e' } },
  sistema:         { label: 'Sistema',          style: { background: '#f0fdf4', color: '#15803d' } },
};

// ─── Modal "Nuevo usuario del sistema" ────────────────────────────────────────

interface NuevoUsuarioModalProps {
  onClose: () => void;
  onSave: (dto: CreateUsuarioDto) => void;
  isPending: boolean;
  error: string;
  esAdmin: boolean;
}

function NuevoUsuarioModal({ onClose, onSave, isPending, error, esAdmin }: NuevoUsuarioModalProps) {
  const [form, setForm] = useState<CreateUsuarioDto>({ nombre: '', apellido: '', email: '', rol: 'directivo' });
  const [emailError, setEmailError] = useState('');
  const set = (k: keyof CreateUsuarioDto) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (k === 'email') setEmailError('');
  };

  const roles = esAdmin
    ? ['admin', 'directivo', 'administrativo']
    : ['directivo', 'administrativo'];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateEmail(form.email);
    if (!result.valid) { setEmailError(result.error ?? ''); return; }
    onSave({ ...form, email: form.email.toLowerCase().trim() });
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Nuevo usuario del sistema</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
          Se enviará una invitación por email para que el usuario active su cuenta.
        </p>
        {error && <div style={S.errorBox}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ ...S.label, flex: 1 }}>
                Nombre
                <input required style={S.input} value={form.nombre} onChange={set('nombre')} />
              </label>
              <label style={{ ...S.label, flex: 1 }}>
                Apellido
                <input required style={S.input} value={form.apellido} onChange={set('apellido')} />
              </label>
            </div>
            <label style={S.label}>
              Email
              <input
                required
                style={{ ...S.input, ...(emailError ? S.inputError : {}) }}
                value={form.email}
                onChange={set('email')}
                placeholder="usuario@escuela.edu.ar"
              />
              {emailError && <span style={S.fieldError}>{emailError}</span>}
            </label>
            <label style={S.label}>
              Rol
              <select required style={S.input} value={form.rol} onChange={set('rol')}>
                {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" style={S.btnSecondary} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{ ...S.btnPrimary, opacity: isPending ? 0.6 : 1 }} disabled={isPending}>
              {isPending ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Directivos y Admins ─────────────────────────────────────────────────

function TabSistema({ puedeCrear, esAdmin }: { puedeCrear: boolean; esAdmin: boolean }) {
  const qc = useQueryClient();
  const [busqueda, setBusqueda]   = useState('');
  const [filterRol, setFilterRol] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Edición inline
  const [editId, setEditId]         = useState<string | null>(null);
  const [editActivo, setEditActivo] = useState(true);
  const [editRol, setEditRol]       = useState('');
  const [editError, setEditError]   = useState('');

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios', 'sistema'],
    queryFn: usuariosApi.getSistema,
  });

  const createMutation = useMutation({
    mutationFn: usuariosApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios', 'sistema'] });
      setShowModal(false);
      setModalError('');
      notify('Invitación enviada correctamente.');
    },
    onError: (err) => setModalError(errMsg(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, activo, rol }: { id: string; activo: boolean; rol: string }) =>
      usuariosApi.update(id, { activo, rol }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios', 'sistema'] });
      setEditId(null);
      setEditError('');
    },
    onError: (err) => setEditError(errMsg(err)),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => authApi.adminReset(id),
    onSuccess: () => notify('Enlace de restablecimiento enviado.'),
    onError: (err) => notify(`Error: ${errMsg(err)}`),
  });

  function notify(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  }

  const filtrados = usuarios.filter(u => {
    const roles = normalizeRoles(u.roles);
    if (filterRol && !roles.includes(filterRol)) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      if (!u.nombre.toLowerCase().includes(q) && !u.apellido.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function startEdit(u: UsuarioSistema) {
    const roles = normalizeRoles(u.roles);
    setEditId(u.id);
    setEditActivo(u.activo);
    setEditRol(roles[0] ?? 'directivo');
    setEditError('');
  }

  const roles = esAdmin ? ['admin', 'directivo', 'administrativo'] : ['directivo', 'administrativo'];

  return (
    <>
      {actionMsg && (
        <div style={{ ...S.feedback, ...(actionMsg.startsWith('Error') ? S.feedbackError : S.feedbackOk) }}>
          {actionMsg}
        </div>
      )}

      <div style={{ ...S.card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <label style={{ ...S.label, flex: '1 1 200px' }}>
          Buscar
          <input style={S.input} placeholder="Nombre, apellido o email..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </label>
        <label style={S.label}>
          Rol
          <select style={{ ...S.input, width: 160 }} value={filterRol} onChange={e => setFilterRol(e.target.value)}>
            <option value="">Todos</option>
            {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </label>
        <span style={{ fontSize: 13, color: '#64748b', alignSelf: 'flex-end', paddingBottom: 8 }}>
          {filtrados.length} usuario{filtrados.length !== 1 ? 's' : ''}
        </span>
        {puedeCrear && (
          <button style={{ ...S.btnPrimary, alignSelf: 'flex-end', marginLeft: 'auto' }}
            onClick={() => { setShowModal(true); setModalError(''); }}>
            + Nuevo usuario
          </button>
        )}
      </div>

      {isLoading && <p style={S.empty}>Cargando...</p>}
      {!isLoading && filtrados.length === 0 && <p style={S.empty}>No hay usuarios para los filtros seleccionados.</p>}
      {!isLoading && filtrados.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Nombre</th>
                <th style={S.th}>Email</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Rol</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Estado</th>
                <th style={S.th}>Último acceso</th>
                {puedeCrear && <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u, i) => {
                const isEditing = editId === u.id;
                const roles = normalizeRoles(u.roles);
                const tooltip = u.ultimo_acceso
                  ? `Último acceso ${fmtRelative(u.ultimo_acceso)}`
                  : 'Nunca accedió';
                return (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{u.apellido}, {u.nombre}</td>
                    <td style={{ ...S.td, fontSize: 13, color: '#475569' }}>{u.email}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {isEditing ? (
                        <select style={{ ...S.input, fontSize: 12, padding: '4px 8px' }}
                          value={editRol} onChange={e => setEditRol(e.target.value)}>
                          {(esAdmin ? ['admin', 'directivo', 'administrativo'] : ['directivo', 'administrativo']).map(r =>
                            <option key={r} value={r}>{r}</option>
                          )}
                        </select>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
                          {roles.map(r => (
                            <span key={r} style={{ ...ROL_CHIP[r] ?? { background: '#f1f5f9', color: '#475569' }, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                              {r}
                            </span>
                          ))}
                          {!u.cuenta_activada && (
                            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
                              Pendiente activación
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {isEditing ? (
                        <select style={{ ...S.input, fontSize: 12, padding: '4px 8px', width: 100 }}
                          value={String(editActivo)} onChange={e => setEditActivo(e.target.value === 'true')}>
                          <option value="true">Activo</option>
                          <option value="false">Inactivo</option>
                        </select>
                      ) : (
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: u.activo ? '#dcfce7' : '#f1f5f9', color: u.activo ? '#15803d' : '#94a3b8' }}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    <td style={{ ...S.td, fontSize: 13, color: '#64748b' }} title={tooltip}>
                      {fmtDate(u.ultimo_acceso)}
                    </td>
                    {puedeCrear && (
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button style={S.linkBtn} onClick={() => updateMutation.mutate({ id: editId!, activo: editActivo, rol: editRol })} disabled={updateMutation.isPending}>
                              {updateMutation.isPending ? '...' : 'Guardar'}
                            </button>
                            <button style={{ ...S.linkBtn, color: '#94a3b8' }} onClick={() => { setEditId(null); setEditError(''); }}>Cancelar</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button style={S.linkBtn} onClick={() => startEdit(u)}>Editar</button>
                            {u.cuenta_activada && (
                              <button style={{ ...S.linkBtn, color: '#dc2626' }} onClick={() => resetMutation.mutate(u.id)}>
                                Reset pwd
                              </button>
                            )}
                          </div>
                        )}
                        {isEditing && editError && (
                          <p style={{ color: '#b91c1c', fontSize: 11, margin: '4px 0 0' }}>{editError}</p>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <NuevoUsuarioModal
          onClose={() => setShowModal(false)}
          onSave={dto => createMutation.mutate(dto)}
          isPending={createMutation.isPending}
          error={modalError}
          esAdmin={esAdmin}
        />
      )}
    </>
  );
}

// ─── Tab: Pendientes de activación ────────────────────────────────────────────

function TabPendientes({ puedeGestionar }: { puedeGestionar: boolean }) {
  const qc = useQueryClient();
  const [actionMsg, setActionMsg] = useState('');

  const { data: pendientes = [], isLoading } = useQuery({
    queryKey: ['usuarios', 'pendientes'],
    queryFn: usuariosApi.getPendientes,
  });

  function notify(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 5000);
  }

  const resendMutation = useMutation({
    mutationFn: (id: string) => authApi.resendActivation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios', 'pendientes'] });
      notify('Invitación reenviada correctamente.');
    },
    onError: (err) => notify(`Error: ${errMsg(err)}`),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => usuariosApi.cancelarPendiente(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios', 'pendientes'] });
      notify('Cuenta cancelada. La persona puede ser invitada nuevamente.');
    },
    onError: (err) => notify(`Error: ${errMsg(err)}`),
  });

  function tokenExpirado(p: PendienteActivacion) {
    if (!p.activation_token_expires_at) return true;
    return new Date(p.activation_token_expires_at) < new Date();
  }

  return (
    <>
      {actionMsg && (
        <div style={{ ...S.feedback, ...(actionMsg.startsWith('Error') ? S.feedbackError : S.feedbackOk) }}>
          {actionMsg}
        </div>
      )}

      <div style={{ ...S.card, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#64748b' }}>
        Usuarios que recibieron una invitación pero aún no activaron su cuenta.
        Podés reenviar la invitación o cancelar la cuenta para que la persona sea invitada desde cero.
      </div>

      {isLoading && <p style={S.empty}>Cargando...</p>}
      {!isLoading && pendientes.length === 0 && (
        <p style={S.empty}>No hay cuentas pendientes de activación. ¡Todo en orden!</p>
      )}
      {!isLoading && pendientes.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Nombre</th>
                <th style={S.th}>Email</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Tipo</th>
                <th style={S.th}>Invitado</th>
                <th style={S.th} title="Fecha en que se envió la última invitación">Último envío</th>
                <th style={S.th}>Expira el token</th>
                {puedeGestionar && <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {pendientes.map((p, i) => {
                const expirado = tokenExpirado(p);
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{p.apellido}, {p.nombre}</td>
                    <td style={{ ...S.td, fontSize: 13, color: '#475569' }}>{p.email}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ ...TIPO_CHIP[p.tipo_entidad]?.style, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {TIPO_CHIP[p.tipo_entidad]?.label ?? p.tipo_entidad}
                      </span>
                    </td>
                    <td style={{ ...S.td, fontSize: 13, color: '#64748b' }}>
                      {fmtDate(p.created_at)}
                    </td>
                    <td style={{ ...S.td, fontSize: 13, color: '#64748b' }}
                      title={p.ultimo_envio_activacion ? `Enviado ${fmtRelative(p.ultimo_envio_activacion)}` : undefined}>
                      {fmtDate(p.ultimo_envio_activacion)}
                    </td>
                    <td style={{ ...S.td, fontSize: 13 }}>
                      {expirado ? (
                        <span style={{ color: '#b91c1c', fontWeight: 600 }}>Expirado</span>
                      ) : (
                        <span style={{ color: '#15803d' }}>{fmtDate(p.activation_token_expires_at)}</span>
                      )}
                    </td>
                    {puedeGestionar && (
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button
                            style={{ ...S.linkBtn, color: '#d97706' }}
                            onClick={() => resendMutation.mutate(p.id)}
                            disabled={resendMutation.isPending}
                            title="Generar nuevo token y reenviar el email de activación"
                          >
                            Reenviar invitación
                          </button>
                          <button
                            style={{ ...S.linkBtn, color: '#dc2626' }}
                            onClick={() => cancelMutation.mutate(p.id)}
                            disabled={cancelMutation.isPending}
                            title="Cancelar esta cuenta (soft delete). La persona puede ser invitada nuevamente."
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = 'sistema' | 'pendientes';

export function UsuariosPage() {
  const { user } = useAuthContext();
  const esAdmin     = user?.roles?.includes('admin') ?? false;
  const puedeCrear  = user?.roles?.some(r => ['admin', 'directivo'].includes(r)) ?? false;

  const [tab, setTab] = useState<Tab>('sistema');

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Usuarios del sistema</h1>
          <p style={S.subtitle}>Administradores, directivos y cuentas con acceso de gestión</p>
        </div>
      </div>

      <div style={S.tabs}>
        <button style={{ ...S.tab, ...(tab === 'sistema' ? S.tabActive : {}) }} onClick={() => setTab('sistema')}>
          Directivos y Admins
        </button>
        <button style={{ ...S.tab, ...(tab === 'pendientes' ? S.tabActive : {}) }} onClick={() => setTab('pendientes')}>
          Pendientes de activación
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === 'sistema' && <TabSistema puedeCrear={puedeCrear} esAdmin={esAdmin} />}
        {tab === 'pendientes' && <TabPendientes puedeGestionar={puedeCrear} />}
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page:     { maxWidth: 1100 },
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:    { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },

  tabs:      { display: 'flex', gap: 4, borderBottom: '2px solid #f1f5f9' },
  tab:       { padding: '10px 24px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -2, cursor: 'pointer', fontSize: 14, color: '#64748b', fontWeight: 500 },
  tabActive: { color: '#2563eb', borderBottomColor: '#2563eb', fontWeight: 700 },

  card:         { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 },
  label:        { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:        { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:     { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  inputError:   { borderColor: '#ef4444' },
  fieldError:   { fontSize: 12, color: '#dc2626', marginTop: 2 },
  btnPrimary:   { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' },
  empty:        { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },

  table:  { width: '100%', borderCollapse: 'collapse' },
  th:     { padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' },
  td:     { padding: '12px 16px', fontSize: 14, color: '#0f172a', borderBottom: '1px solid #f1f5f9' },
  linkBtn:{ color: '#2563eb', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },

  feedback:      { marginBottom: 12, padding: '10px 16px', borderRadius: 8, fontSize: 13 },
  feedbackOk:    { background: '#dcfce7', color: '#15803d' },
  feedbackError: { background: '#fee2e2', color: '#b91c1c' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:   { background: '#fff', borderRadius: 14, padding: 32, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column' },
};
