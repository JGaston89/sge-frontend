import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { espaciosApi } from '../../../api/espacios.api';
import { TIPO_ESPACIO_LABEL } from '../../../shared/types/espacios.types';

function fmtDate(v: string) {
  const d = new Date(v.slice(0, 10) + 'T00:00:00');
  return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function EspaciosMisReservasPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  if (user?.roles?.includes('alumno')) return <Navigate to="/espacios" replace />;

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['espacios-mis-reservas'],
    queryFn:  espaciosApi.getMisReservas,
  });

  const cancelarMutation = useMutation({
    mutationFn: (id: string) => espaciosApi.cancelarReserva(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['espacios-mis-reservas'] }),
  });

  const activas   = reservas.filter((r) => r.estado === 'confirmada');
  const canceladas = reservas.filter((r) => r.estado === 'cancelada');

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/espacios" style={S.back}>← Espacios</Link>
      </div>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Mis reservas</h1>
          <p style={S.subtitle}>Reservas de espacios realizadas por vos</p>
        </div>
        <Link to="/espacios/nueva-reserva" style={{ ...S.btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          + Nueva reserva
        </Link>
      </div>

      {isLoading && <p style={S.empty}>Cargando reservas...</p>}

      {!isLoading && reservas.length === 0 && (
        <p style={S.empty}>No tenés reservas. <Link to="/espacios/nueva-reserva" style={{ color: '#2563eb' }}>Crear una reserva</Link></p>
      )}

      {!isLoading && activas.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            Reservas activas ({activas.length})
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Espacio</th>
                <th style={S.th}>Fecha</th>
                <th style={S.th}>Horario</th>
                <th style={S.th}>Evento</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {activas.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ ...S.td, fontWeight: 600 }}>
                    {r.espacio_nombre}
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>
                      {TIPO_ESPACIO_LABEL[r.espacio_tipo]}
                    </span>
                  </td>
                  <td style={S.td}>{fmtDate(r.fecha)}</td>
                  <td style={S.td}>{r.hora_inicio.slice(0, 5)} – {r.hora_fin.slice(0, 5)}</td>
                  <td style={{ ...S.td, color: r.nombre_evento ? '#0f172a' : '#94a3b8' }}>
                    {r.nombre_evento ?? '—'}
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <button
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}
                      disabled={cancelarMutation.isPending}
                      onClick={() => { if (window.confirm('¿Cancelar esta reserva?')) cancelarMutation.mutate(r.id); }}
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && canceladas.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#94a3b8' }}>
            Canceladas ({canceladas.length})
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Espacio</th>
                <th style={S.th}>Fecha</th>
                <th style={S.th}>Horario</th>
                <th style={S.th}>Evento</th>
              </tr>
            </thead>
            <tbody>
              {canceladas.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', opacity: 0.7 }}>
                  <td style={{ ...S.td, fontWeight: 600, color: '#94a3b8' }}>{r.espacio_nombre}</td>
                  <td style={{ ...S.td, color: '#94a3b8' }}>{fmtDate(r.fecha)}</td>
                  <td style={{ ...S.td, color: '#94a3b8' }}>{r.hora_inicio.slice(0, 5)} – {r.hora_fin.slice(0, 5)}</td>
                  <td style={{ ...S.td, color: '#94a3b8' }}>{r.nombre_evento ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 1000 },
  back:        { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:       { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:    { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16 },
  btnPrimary:  { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  empty:       { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  td:          { padding: '11px 14px', fontSize: 13, color: '#0f172a', borderBottom: '1px solid #f1f5f9' },
};
