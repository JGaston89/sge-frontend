import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Alumno, AccesoEstado } from '../../../shared/types/alumnos.types';
import { usuariosApi } from '../../../api/usuarios.api';
import { authApi } from '../../../api/auth.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtDate(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function errMsg(err: unknown) {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error inesperado';
  return Array.isArray(msg) ? msg.join(', ') : String(msg);
}

// ─── Badge + tooltip de acceso ────────────────────────────────────────────────

const ACCESO_BADGE: Record<AccesoEstado, { label: string; style: React.CSSProperties }> = {
  SIN_CUENTA: { label: 'Sin cuenta',  style: { background: '#f1f5f9', color: '#64748b' } },
  PENDIENTE:  { label: 'Pendiente',   style: { background: '#fef3c7', color: '#92400e' } },
  ACTIVADO:   { label: 'Activado',    style: { background: '#dcfce7', color: '#15803d' } },
};

function AccesoBadge({ alumno }: { alumno: Alumno }) {
  const cfg = ACCESO_BADGE[alumno.acceso_estado] ?? ACCESO_BADGE.SIN_CUENTA;

  let tooltip = '';
  if (alumno.acceso_estado === 'PENDIENTE' && alumno.ultimo_envio_activacion) {
    tooltip = `Email enviado el ${fmtDate(alumno.ultimo_envio_activacion) ?? '—'}`;
  } else if (alumno.acceso_estado === 'ACTIVADO' && alumno.ultimo_acceso) {
    tooltip = `Último acceso ${fmtRelative(alumno.ultimo_acceso)}`;
  }

  return (
    <span
      title={tooltip || undefined}
      style={{ ...styles.badge, ...cfg.style, cursor: tooltip ? 'help' : 'default' }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Filtro rápido por acceso ─────────────────────────────────────────────────

type FiltroAcceso = 'todos' | 'SIN_CUENTA' | 'PENDIENTE' | 'ACTIVADO';

const FILTROS: { id: FiltroAcceso; label: string }[] = [
  { id: 'todos',      label: 'Todos' },
  { id: 'ACTIVADO',   label: 'Con acceso' },
  { id: 'PENDIENTE',  label: 'Pendientes' },
  { id: 'SIN_CUENTA', label: 'Sin cuenta' },
];

// ─── Tabla principal ──────────────────────────────────────────────────────────

interface Props {
  alumnos: Alumno[];
  isLoading: boolean;
}

const ESTADO_BADGE: Record<string, React.CSSProperties> = {
  activo:   { background: '#dcfce7', color: '#15803d' },
  baja:     { background: '#fee2e2', color: '#b91c1c' },
  egresado: { background: '#e0f2fe', color: '#0369a1' },
};

export function AlumnoTable({ alumnos, isLoading }: Props) {
  const qc = useQueryClient();
  const [filtroAcceso, setFiltroAcceso] = useState<FiltroAcceso>('todos');
  const [actionMsg, setActionMsg] = useState('');

  function notify(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  }

  const invitarMutation = useMutation({
    mutationFn: (alumno: Alumno) =>
      usuariosApi.createFromPersona({ personaId: alumno.id, origen: 'alumno', rol: 'alumno' }),
    onSuccess: (_, alumno) => {
      qc.invalidateQueries({ queryKey: ['alumnos'] });
      notify(`Invitación enviada a ${alumno.email ?? alumno.nombre}`);
    },
    onError: (err) => notify(`Error: ${errMsg(err)}`),
  });

  const reenviarMutation = useMutation({
    mutationFn: (usuarioId: string) => authApi.resendActivation(usuarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumnos'] });
      notify('Invitación reenviada correctamente.');
    },
    onError: (err) => notify(`Error: ${errMsg(err)}`),
  });

  const alumnosFiltrados = filtroAcceso === 'todos'
    ? alumnos
    : alumnos.filter(a => a.acceso_estado === filtroAcceso);

  const counts: Record<FiltroAcceso, number> = {
    todos:      alumnos.length,
    ACTIVADO:   alumnos.filter(a => a.acceso_estado === 'ACTIVADO').length,
    PENDIENTE:  alumnos.filter(a => a.acceso_estado === 'PENDIENTE').length,
    SIN_CUENTA: alumnos.filter(a => a.acceso_estado === 'SIN_CUENTA').length,
  };

  if (isLoading) return <div style={styles.empty}>Cargando alumnos...</div>;
  if (!alumnos.length) return <div style={styles.empty}>No se encontraron alumnos.</div>;

  return (
    <div>
      {/* Filtros rápidos por acceso */}
      <div style={styles.filtros}>
        {FILTROS.map(f => (
          <button
            key={f.id}
            style={{ ...styles.filtroBtn, ...(filtroAcceso === f.id ? styles.filtroBtnActive : {}) }}
            onClick={() => setFiltroAcceso(f.id)}
          >
            {f.label}
            <span style={styles.filtroCount}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {/* Feedback de acciones */}
      {actionMsg && (
        <div style={{ ...styles.feedback, ...(actionMsg.startsWith('Error') ? styles.feedbackError : styles.feedbackOk) }}>
          {actionMsg}
        </div>
      )}

      <div style={styles.wrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Legajo</th>
              <th style={styles.th}>Apellido y nombre</th>
              <th style={styles.th}>DNI</th>
              <th style={styles.th}>Estado</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Acceso</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Acción</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {alumnosFiltrados.map((a) => (
              <tr key={a.id} style={styles.tr}>
                <td style={styles.td}><code>{a.legajo}</code></td>
                <td style={styles.td}>{a.apellido}, {a.nombre}</td>
                <td style={styles.td}>{a.dni}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...ESTADO_BADGE[a.estado] }}>
                    {a.estado}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <AccesoBadge alumno={a} />
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {a.acceso_estado === 'SIN_CUENTA' && (
                    <button
                      style={styles.accionBtn}
                      disabled={!a.email || invitarMutation.isPending}
                      title={!a.email ? 'El alumno no tiene email registrado' : 'Enviar invitación al sistema'}
                      onClick={() => invitarMutation.mutate(a)}
                    >
                      Invitar al sistema
                    </button>
                  )}
                  {a.acceso_estado === 'PENDIENTE' && a.usuario_id && (
                    <button
                      style={{ ...styles.accionBtn, color: '#d97706', borderColor: '#d97706' }}
                      disabled={reenviarMutation.isPending}
                      title={a.ultimo_envio_activacion ? `Último envío: ${fmtDate(a.ultimo_envio_activacion)}` : undefined}
                      onClick={() => reenviarMutation.mutate(a.usuario_id!)}
                    >
                      Reenviar invitación
                    </button>
                  )}
                </td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  <Link to={`/alumnos/${a.id}`} style={styles.link}>Ver legajo</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {alumnosFiltrados.length === 0 && (
          <p style={styles.empty}>No hay alumnos para el filtro seleccionado.</p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:  { overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' },
  table:    { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
  },
  tr:    { borderBottom: '1px solid #f1f5f9' },
  td:    { padding: '13px 16px', fontSize: 14, color: '#1e293b' },
  badge: { display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' },
  link:  { color: '#2563eb', textDecoration: 'none', fontWeight: 500, fontSize: 13 },
  empty: { padding: 32, textAlign: 'center', color: '#94a3b8' },

  filtros:         { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  filtroBtn:       { padding: '5px 14px', border: '1px solid #e2e8f0', borderRadius: 20, background: '#f8fafc', fontSize: 13, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' },
  filtroBtnActive: { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8', fontWeight: 600 },
  filtroCount:     { fontSize: 11, background: '#e2e8f0', padding: '1px 6px', borderRadius: 10, color: '#475569', fontWeight: 700 },

  accionBtn: { padding: '4px 12px', border: '1px solid #2563eb', borderRadius: 6, background: '#fff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },

  feedback:      { marginBottom: 10, padding: '8px 14px', borderRadius: 8, fontSize: 13 },
  feedbackOk:    { background: '#dcfce7', color: '#15803d' },
  feedbackError: { background: '#fee2e2', color: '#b91c1c' },
};
