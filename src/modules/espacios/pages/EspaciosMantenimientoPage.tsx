import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { espaciosApi } from '../../../api/espacios.api';
import type { CreateMantenimientoDto, PrioridadMant, EstadoMant } from '../../../shared/types/espacios.types';
import { PRIORIDAD_COLOR, ESTADO_MANT_COLOR, TIPO_ESPACIO_LABEL } from '../../../shared/types/espacios.types';

const EMPTY_FORM: CreateMantenimientoDto = { descripcion_problema: '', prioridad: 'media' };

function fmtDate(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function EspaciosMantenimientoPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [estadoFilter, setEstadoFilter] = useState('pendiente');

  if (user?.roles?.includes('alumno')) return <Navigate to="/espacios" replace />;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateMantenimientoDto>(EMPTY_FORM);

  const { data: espacios = [] } = useQuery({
    queryKey: ['espacios'],
    queryFn:  () => espaciosApi.getEspacios(),
  });

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['espacios-mantenimiento', estadoFilter],
    queryFn:  () => espaciosApi.getMantenimiento({ estado: estadoFilter || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateMantenimientoDto) => espaciosApi.createMantenimiento(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['espacios-mantenimiento'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      espaciosApi.updateMantenimiento(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['espacios-mantenimiento'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descripcion_problema) return;
    const dto: CreateMantenimientoDto = { ...form };
    if (!dto.espacio_id)       delete dto.espacio_id;
    if (!dto.descripcion_equipo) delete dto.descripcion_equipo;
    createMutation.mutate(dto);
  }

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/espacios" style={S.back}>← Espacios</Link>
      </div>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Mantenimiento</h1>
          <p style={S.subtitle}>Solicitudes de mantenimiento de espacios y equipamiento</p>
        </div>
        <button style={S.btnPrimary} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Reportar problema'}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Reportar problema</h3>
          <form onSubmit={handleSubmit}>
            {createMutation.isError && <div style={S.errorBox}>Error al crear la solicitud.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <label style={S.label}>
                Espacio (opcional)
                <select style={S.input} value={form.espacio_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, espacio_id: e.target.value || undefined }))}>
                  <option value="">Sin espacio específico</option>
                  {espacios.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} ({TIPO_ESPACIO_LABEL[e.tipo]})
                    </option>
                  ))}
                </select>
              </label>
              <label style={S.label}>
                Equipo afectado
                <input style={S.input} value={form.descripcion_equipo ?? ''} placeholder="Ej: Proyector"
                  onChange={(e) => setForm((f) => ({ ...f, descripcion_equipo: e.target.value || undefined }))} />
              </label>
              <label style={S.label}>
                Prioridad
                <select style={S.input} value={form.prioridad}
                  onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value as PrioridadMant }))}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </label>
              <label style={{ ...S.label, gridColumn: '1 / -1' }}>
                Descripción del problema *
                <textarea required style={{ ...S.input, minHeight: 70, resize: 'vertical' }}
                  value={form.descripcion_problema}
                  placeholder="Describí el problema con detalle..."
                  onChange={(e) => setForm((f) => ({ ...f, descripcion_problema: e.target.value }))} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" style={S.btnSecondary} onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancelar</button>
              <button type="submit" style={{ ...S.btnPrimary, opacity: createMutation.isPending ? 0.6 : 1 }}
                disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Enviando...' : 'Reportar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtro de estado */}
      <div style={{ ...S.card, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Estado:</span>
        {(['', 'pendiente', 'en_proceso', 'resuelto'] as const).map((s) => (
          <button
            key={s}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              border: '1px solid',
              background: estadoFilter === s ? '#2563eb' : '#fff',
              color:      estadoFilter === s ? '#fff'    : '#475569',
              borderColor: estadoFilter === s ? '#2563eb' : '#d1d5db',
              fontWeight: estadoFilter === s ? 600 : 400,
            }}
            onClick={() => setEstadoFilter(s)}
          >
            {s === '' ? 'Todos' : s === 'en_proceso' ? 'En proceso' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading && <p style={S.empty}>Cargando solicitudes...</p>}
      {!isLoading && solicitudes.length === 0 && <p style={S.empty}>No hay solicitudes para este filtro.</p>}

      {!isLoading && solicitudes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {solicitudes.map((sol) => (
            <div key={sol.id} style={S.solCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {sol.espacio_nombre && (
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{sol.espacio_nombre}</span>
                    )}
                    {sol.descripcion_equipo && (
                      <span style={{ fontSize: 13, color: '#475569' }}>· {sol.descripcion_equipo}</span>
                    )}
                    <span style={{ ...PRIORIDAD_COLOR[sol.prioridad], padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {sol.prioridad}
                    </span>
                    <span style={{ ...ESTADO_MANT_COLOR[sol.estado], padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {sol.estado === 'en_proceso' ? 'En proceso' : sol.estado.charAt(0).toUpperCase() + sol.estado.slice(1)}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{sol.descripcion_problema}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>Reportado el {fmtDate(sol.created_at)}{sol.resolved_at ? ` · Resuelto el ${fmtDate(sol.resolved_at)}` : ''}</p>
                </div>
                {/* Botones de avance de estado */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 16 }}>
                  {sol.estado === 'pendiente' && (
                    <button style={S.btnSmall}
                      onClick={() => updateMutation.mutate({ id: sol.id, estado: 'en_proceso' })}>
                      En proceso
                    </button>
                  )}
                  {(sol.estado === 'pendiente' || sol.estado === 'en_proceso') && (
                    <button style={{ ...S.btnSmall, color: '#15803d', borderColor: '#bbf7d0' }}
                      onClick={() => updateMutation.mutate({ id: sol.id, estado: 'resuelto' })}>
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:         { maxWidth: 1000 },
  back:         { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:        { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:     { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:         { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle: { margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' },
  label:        { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:        { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:     { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
  btnPrimary:   { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' },
  btnSmall:     { padding: '5px 12px', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#374151' },
  empty:        { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  solCard:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px' },
};
