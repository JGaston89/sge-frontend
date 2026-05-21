import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { administrativosApi, type StaffAdministrativo, type AccesoEstado } from '../../../api/administrativos.api';
import { usuariosApi } from '../../../api/usuarios.api';
import { authApi } from '../../../api/auth.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function fmtRelative(v: string | null): string {
  if (!v) return '';
  const ms = Date.now() - new Date(v).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24) return `hace ${hs} h`;
  const days = Math.floor(hs / 24);
  return `hace ${days} día${days !== 1 ? 's' : ''}`;
}

function errMsg(err: unknown) {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error inesperado';
  return Array.isArray(msg) ? msg.join(', ') : String(msg);
}

// ─── Acceso ───────────────────────────────────────────────────────────────────

const ACCESO_BADGE: Record<AccesoEstado, { label: string; style: React.CSSProperties }> = {
  SIN_CUENTA: { label: 'Sin cuenta', style: { background: '#f1f5f9', color: '#64748b' } },
  PENDIENTE:  { label: 'Pendiente',  style: { background: '#fef3c7', color: '#92400e' } },
  ACTIVADO:   { label: 'Activado',   style: { background: '#dcfce7', color: '#15803d' } },
};

type FiltroAcceso = 'todos' | AccesoEstado;

const FILTROS_ACCESO: { id: FiltroAcceso; label: string }[] = [
  { id: 'todos',      label: 'Todos' },
  { id: 'ACTIVADO',   label: 'Con acceso' },
  { id: 'PENDIENTE',  label: 'Pendientes' },
  { id: 'SIN_CUENTA', label: 'Sin cuenta' },
];

// ─── Página ───────────────────────────────────────────────────────────────────

export function AdministrativosPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [search, setSearch]           = useState('');
  const [estado, setEstado]           = useState('');
  const [filtroAcceso, setFiltroAcceso] = useState<FiltroAcceso>('todos');
  const [actionMsg, setActionMsg]     = useState('');

  const soloPuedeVer = !user?.roles?.some(r => ['admin', 'directivo'].includes(r));
  const esStaff      = user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (!esStaff) return <Navigate to="/calificaciones" replace />;

  const { data: administrativos = [], isLoading } = useQuery({
    queryKey: ['administrativos', { search, estado }],
    queryFn:  () => administrativosApi.getAll({ search: search || undefined, estado: estado || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => administrativosApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['administrativos'] }),
    onError:    (err: unknown) => notify(`Error: ${errMsg(err)}`),
  });

  const invitarMutation = useMutation({
    mutationFn: (a: StaffAdministrativo) =>
      usuariosApi.createFromPersona({ personaId: a.id, origen: 'administrativo', rol: 'administrativo' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['administrativos'] });
      notify('Invitación enviada correctamente.');
    },
    onError: (err) => notify(`Error: ${errMsg(err)}`),
  });

  const reenviarMutation = useMutation({
    mutationFn: (usuarioId: string) => authApi.resendActivation(usuarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['administrativos'] });
      notify('Invitación reenviada correctamente.');
    },
    onError: (err) => notify(`Error: ${errMsg(err)}`),
  });

  function notify(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  }

  function handleDelete(a: StaffAdministrativo) {
    if (!window.confirm(`¿Eliminar el legajo de ${a.apellido}, ${a.nombre}?`)) return;
    deleteMutation.mutate(a.id);
  }

  const counts: Record<FiltroAcceso, number> = {
    todos:      administrativos.length,
    ACTIVADO:   administrativos.filter(a => a.acceso_estado === 'ACTIVADO').length,
    PENDIENTE:  administrativos.filter(a => a.acceso_estado === 'PENDIENTE').length,
    SIN_CUENTA: administrativos.filter(a => a.acceso_estado === 'SIN_CUENTA').length,
  };

  const listado = filtroAcceso === 'todos'
    ? administrativos
    : administrativos.filter(a => a.acceso_estado === filtroAcceso);

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.title}>Personal Administrativo</h1>
        <p style={S.subtitle}>Legajos del personal no docente de la institución</p>
      </div>

      {/* Acciones rápidas */}
      {!soloPuedeVer && (
        <div style={S.hubGrid}>
          <Link to="/administrativos/nuevo" style={{ textDecoration: 'none' }}>
            <div style={S.hubCard}>
              <div style={{ ...S.hubIcon, background: '#dbeafe', color: '#1e40af' }}>👤</div>
              <strong style={S.hubLabel}>Nuevo legajo</strong>
              <span style={S.hubDesc}>Registrar personal administrativo</span>
            </div>
          </Link>
          <Link to="/usuarios" style={{ textDecoration: 'none' }}>
            <div style={S.hubCard}>
              <div style={{ ...S.hubIcon, background: '#f0fdf4', color: '#15803d' }}>🔑</div>
              <strong style={S.hubLabel}>Gestión de cuentas</strong>
              <span style={S.hubDesc}>Directivos y admins del sistema</span>
            </div>
          </Link>
        </div>
      )}

      {/* Filtros */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={S.label}>
            Buscar
            <input style={{ ...S.input, minWidth: 220 }} placeholder="Nombre, apellido, DNI o cargo..." value={search} onChange={e => setSearch(e.target.value)} />
          </label>
          <label style={S.label}>
            Estado
            <select style={S.input} value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>
          <span style={{ fontSize: 13, color: '#64748b', paddingBottom: 8 }}>
            {listado.length} registro{listado.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Filtros rápidos por acceso */}
      <div style={S.filtros}>
        {FILTROS_ACCESO.map(f => (
          <button key={f.id}
            style={{ ...S.filtroBtn, ...(filtroAcceso === f.id ? S.filtroBtnActive : {}) }}
            onClick={() => setFiltroAcceso(f.id)}
          >
            {f.label}
            <span style={S.filtroCount}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {actionMsg && (
        <div style={{ ...S.feedback, ...(actionMsg.startsWith('Error') ? S.feedbackError : S.feedbackOk) }}>
          {actionMsg}
        </div>
      )}

      {/* Tabla */}
      {isLoading && <p style={S.empty}>Cargando...</p>}

      {!isLoading && listado.length === 0 && (
        <p style={S.empty}>No hay personal para los filtros seleccionados.</p>
      )}

      {!isLoading && listado.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Nombre</th>
                <th style={S.th}>DNI</th>
                <th style={S.th}>Cargo</th>
                <th style={S.th}>Email / Teléfono</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Estado</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Acceso</th>
                {!soloPuedeVer && <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {listado.map((a, i) => {
                const accesoCfg = ACCESO_BADGE[a.acceso_estado] ?? ACCESO_BADGE.SIN_CUENTA;
                let accesoTooltip = '';
                if (a.acceso_estado === 'PENDIENTE' && a.ultimo_envio_activacion) {
                  accesoTooltip = `Email enviado el ${fmtDate(a.ultimo_envio_activacion) ?? '—'}`;
                } else if (a.acceso_estado === 'ACTIVADO' && a.ultimo_acceso) {
                  accesoTooltip = `Último acceso ${fmtRelative(a.ultimo_acceso)}`;
                }
                return (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{a.apellido}, {a.nombre}</div>
                      {a.fecha_ingreso && (
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          Ingreso: {new Date(a.fecha_ingreso).toLocaleDateString('es-AR')}
                        </div>
                      )}
                    </td>
                    <td style={S.td}>
                      {a.dni ? <code style={S.badge}>{a.dni}</code> : <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ ...S.td, fontSize: 13, color: a.cargo ? '#374151' : '#94a3b8' }}>{a.cargo ?? '—'}</td>
                    <td style={S.td}>
                      {a.email && <div style={{ fontSize: 13 }}>{a.email}</div>}
                      {a.telefono && <div style={{ fontSize: 12, color: '#64748b' }}>{a.telefono}</div>}
                      {!a.email && !a.telefono && <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ ...S.chip, background: a.estado === 'activo' ? '#dcfce7' : '#f1f5f9', color: a.estado === 'activo' ? '#15803d' : '#94a3b8' }}>
                        {a.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span
                        title={accesoTooltip || undefined}
                        style={{ ...accesoCfg.style, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: accesoTooltip ? 'help' : 'default', display: 'inline-block' }}
                      >
                        {accesoCfg.label}
                      </span>
                    </td>
                    {!soloPuedeVer && (
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Link to={`/administrativos/${a.id}/editar`} style={{ ...S.btnAction, color: '#0f172a', borderColor: '#e2e8f0' }}>
                            Editar
                          </Link>
                          {a.acceso_estado === 'SIN_CUENTA' && (
                            <button
                              style={{ ...S.btnAction, color: '#2563eb', borderColor: '#93c5fd', cursor: 'pointer', background: 'none' }}
                              disabled={!a.email || invitarMutation.isPending}
                              title={!a.email ? 'No tiene email registrado' : 'Invitar al sistema'}
                              onClick={() => invitarMutation.mutate(a)}
                            >
                              Invitar
                            </button>
                          )}
                          {a.acceso_estado === 'PENDIENTE' && a.usuario_id && (
                            <button
                              style={{ ...S.btnAction, color: '#d97706', borderColor: '#fde68a', cursor: 'pointer', background: 'none' }}
                              disabled={reenviarMutation.isPending}
                              onClick={() => reenviarMutation.mutate(a.usuario_id!)}
                            >
                              Reenviar
                            </button>
                          )}
                          <button
                            style={{ ...S.btnAction, color: '#b91c1c', borderColor: '#fecaca', cursor: 'pointer', background: 'none' }}
                            onClick={() => handleDelete(a)}
                            disabled={!!a.usuario_id}
                            title={a.usuario_id ? 'Tiene cuenta de usuario — desactivalo primero' : ''}
                          >
                            Eliminar
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
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:     { maxWidth: 1100 },
  title:    { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  hubGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  hubCard:  { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' },
  hubIcon:  { width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  hubLabel: { fontSize: 15, fontWeight: 700, color: '#0f172a' },
  hubDesc:  { fontSize: 13, color: '#64748b' },
  card:     { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 },
  label:    { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:    { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' },
  empty:    { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  table:    { width: '100%', borderCollapse: 'collapse' },
  th:       { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td:       { padding: '10px 14px', fontSize: 14, color: '#0f172a', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' },
  badge:    { fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, color: '#475569', fontFamily: 'monospace' },
  chip:     { padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btnAction:{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid', textDecoration: 'none', fontWeight: 500, display: 'inline-block' },

  filtros:         { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  filtroBtn:       { padding: '5px 14px', border: '1px solid #e2e8f0', borderRadius: 20, background: '#f8fafc', fontSize: 13, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' },
  filtroBtnActive: { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8', fontWeight: 600 },
  filtroCount:     { fontSize: 11, background: '#e2e8f0', padding: '1px 6px', borderRadius: 10, color: '#475569', fontWeight: 700 },
  feedback:        { marginBottom: 10, padding: '8px 14px', borderRadius: 8, fontSize: 13 },
  feedbackOk:      { background: '#dcfce7', color: '#15803d' },
  feedbackError:   { background: '#fee2e2', color: '#b91c1c' },
};
