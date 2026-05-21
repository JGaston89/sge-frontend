import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { espaciosApi } from '../../../api/espacios.api';
import type { CreateEspacioDto, TipoEspacio, EstadoEspacio } from '../../../shared/types/espacios.types';
import { TIPO_ESPACIO_LABEL } from '../../../shared/types/espacios.types';

const ESTADO_COLOR: Record<EstadoEspacio, React.CSSProperties> = {
  disponible:    { background: '#dcfce7', color: '#15803d' },
  mantenimiento: { background: '#fef9c3', color: '#854d0e' },
  inhabilitado:  { background: '#fee2e2', color: '#b91c1c' },
};

function getLunes(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7;
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function fmtWeekDay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

const EMPTY_FORM: CreateEspacioDto = { nombre: '', tipo: 'aula' };

export function EspaciosPage() {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  const esAlumno = user?.roles?.includes('alumno') ?? false;
  const [tab, setTab] = useState<'espacios' | 'ocupacion'>('espacios');
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateEspacioDto>(EMPTY_FORM);
  const [equipStr, setEquipStr] = useState('');

  const semana = getLunes(semanaOffset);
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const { data: espacios = [], isLoading: loadEsp } = useQuery({
    queryKey: ['espacios'],
    queryFn:  () => espaciosApi.getEspacios(),
  });

  const { data: ocupacion = [], isLoading: loadOcup } = useQuery({
    queryKey: ['espacios-ocupacion', semana],
    queryFn:  () => espaciosApi.getOcupacion(semana),
    enabled:  tab === 'ocupacion' || esAlumno,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateEspacioDto) => espaciosApi.createEspacio(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['espacios'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEquipStr('');
    },
  });

  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) => espaciosApi.updateEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['espacios'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const equipamiento = equipStr.split(',').map((s) => s.trim()).filter(Boolean);
    createMutation.mutate({ ...form, equipamiento });
  }

  // Agrupar ocupación por día y espacio para la grilla
  const reservasByDay = diasSemana.reduce<Record<string, typeof ocupacion>>((acc, d) => {
    acc[d] = ocupacion.filter((r) => r.fecha.slice(0, 10) === d);
    return acc;
  }, {});

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Espacios físicos</h1>
          <p style={S.subtitle}>Aulas, laboratorios, SUM y equipamiento</p>
        </div>
        {!esAlumno && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/espacios/mis-reservas" style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Mis reservas
            </Link>
            <Link to="/espacios/mantenimiento" style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Mantenimiento
            </Link>
            {tab === 'espacios' && (
              <button style={S.btnPrimary} onClick={() => setShowForm((v) => !v)}>
                {showForm ? 'Cancelar' : '+ Nuevo espacio'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Formulario nuevo espacio */}
      {!esAlumno && showForm && tab === 'espacios' && (
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Nuevo espacio</h3>
          <form onSubmit={handleSubmit}>
            {createMutation.isError && <div style={S.errorBox}>Error al crear el espacio.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <label style={S.label}>
                Nombre *
                <input required style={S.input} value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
              </label>
              <label style={S.label}>
                Tipo *
                <select required style={S.input} value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoEspacio }))}>
                  {Object.entries(TIPO_ESPACIO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label style={S.label}>
                Capacidad
                <input type="number" min={1} style={S.input} value={form.capacidad ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, capacidad: e.target.value ? Number(e.target.value) : undefined }))} />
              </label>
              <label style={S.label}>
                Piso
                <input style={S.input} value={form.piso ?? ''} placeholder="Ej: PB, 1°, 2°"
                  onChange={(e) => setForm((f) => ({ ...f, piso: e.target.value || undefined }))} />
              </label>
              <label style={{ ...S.label, gridColumn: '2 / -1' }}>
                Equipamiento (separado por comas)
                <input style={S.input} value={equipStr} placeholder="Proyector, Pizarrón, PC..."
                  onChange={(e) => setEquipStr(e.target.value)} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" style={S.btnSecondary} onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancelar</button>
              <button type="submit" style={{ ...S.btnPrimary, opacity: createMutation.isPending ? 0.6 : 1 }}
                disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Crear espacio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs — solo para usuarios autorizados */}
      {!esAlumno && (
        <div style={S.tabs}>
          <button style={{ ...S.tab, ...(tab === 'espacios' ? S.tabActive : {}) }} onClick={() => setTab('espacios')}>
            Listado de espacios
          </button>
          <button style={{ ...S.tab, ...(tab === 'ocupacion' ? S.tabActive : {}) }} onClick={() => setTab('ocupacion')}>
            Grilla de ocupación semanal
          </button>
        </div>
      )}

      {/* Tab: listado — solo para usuarios autorizados */}
      {!esAlumno && tab === 'espacios' && (
        <>
          {loadEsp && <p style={S.empty}>Cargando espacios...</p>}
          {!loadEsp && espacios.length === 0 && <p style={S.empty}>No hay espacios registrados.</p>}
          {!loadEsp && espacios.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {espacios.map((esp) => (
                <div key={esp.id} style={S.espCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{esp.nombre}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                        {TIPO_ESPACIO_LABEL[esp.tipo]}{esp.piso ? ` · ${esp.piso}` : ''}
                      </div>
                    </div>
                    <span style={{ ...ESTADO_COLOR[esp.estado], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {esp.estado}
                    </span>
                  </div>
                  {esp.capacidad && (
                    <div style={{ fontSize: 13, color: '#64748b' }}>👥 {esp.capacidad} personas</div>
                  )}
                  {Array.isArray(esp.equipamiento) && esp.equipamiento.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {esp.equipamiento.map((eq, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '2px 7px', background: '#f1f5f9', borderRadius: 10, color: '#475569' }}>{eq}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {!esAlumno && (
                      <Link
                        to={`/espacios/nueva-reserva?espacio_id=${esp.id}`}
                        style={{ ...S.btnSmall, textDecoration: 'none', color: '#2563eb', borderColor: '#bfdbfe' }}
                      >
                        Reservar
                      </Link>
                    )}
                    {!esAlumno && esp.estado === 'disponible' && (
                      <button style={{ ...S.btnSmall, color: '#b45309', borderColor: '#fde68a', cursor: 'pointer', background: 'none' }}
                        onClick={() => estadoMutation.mutate({ id: esp.id, estado: 'mantenimiento' })}>
                        Mantenimiento
                      </button>
                    )}
                    {!esAlumno && esp.estado === 'mantenimiento' && (
                      <button style={{ ...S.btnSmall, color: '#15803d', borderColor: '#bbf7d0', cursor: 'pointer', background: 'none' }}
                        onClick={() => estadoMutation.mutate({ id: esp.id, estado: 'disponible' })}>
                        Disponible
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: grilla semanal — visible siempre para alumnos, condicional para el resto */}
      {(esAlumno || tab === 'ocupacion') && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <button style={S.btnSecondary} onClick={() => setSemanaOffset((n) => n - 1)}>← Semana anterior</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              Semana del {fmtWeekDay(diasSemana[0])} al {fmtWeekDay(diasSemana[6])}
            </span>
            <button style={S.btnSecondary} onClick={() => setSemanaOffset((n) => n + 1)}>Semana siguiente →</button>
            <button style={{ ...S.btnSecondary, fontSize: 12 }} onClick={() => setSemanaOffset(0)}>Hoy</button>
          </div>

          {loadOcup && <p style={S.empty}>Cargando ocupación...</p>}
          {!loadOcup && (
            <div style={{ ...S.card, padding: 0, overflow: 'auto' }}>
              <table style={{ ...S.table, minWidth: 900 }}>
                <thead>
                  <tr>
                    {diasSemana.map((d) => (
                      <th key={d} style={{ ...S.th, textAlign: 'center', minWidth: 130 }}>
                        {fmtWeekDay(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {diasSemana.map((d) => {
                      const reservas = reservasByDay[d];
                      return (
                        <td key={d} style={{ ...S.tdGrid, verticalAlign: 'top' }}>
                          {reservas.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: 12, padding: '6px 0' }}>Sin reservas</div>
                          ) : (
                            reservas.map((r) => (
                              <div key={r.id} style={S.reservaChip}>
                                <div style={{ fontWeight: 700, fontSize: 12 }}>{r.espacio_nombre}</div>
                                <div style={{ fontSize: 11, color: '#475569' }}>
                                  {r.hora_inicio.slice(0, 5)} – {r.hora_fin.slice(0, 5)}
                                </div>
                                {r.nombre_evento && (
                                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.nombre_evento}</div>
                                )}
                              </div>
                            ))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 1200 },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:       { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:    { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle:{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' },
  label:       { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:       { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:    { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
  btnPrimary:  { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '9px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' },
  btnSmall:    { fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid', display: 'inline-block' },
  empty:       { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  tabs:        { display: 'flex', gap: 4, marginBottom: 16, background: '#f8fafc', borderRadius: 10, padding: 4, border: '1px solid #e2e8f0' },
  tab:         { flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent', color: '#475569' },
  tabActive:   { background: '#fff', color: '#0f172a', fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  espCard:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tdGrid:      { padding: '8px 10px', borderRight: '1px solid #f1f5f9', minHeight: 80 },
  reservaChip: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '5px 8px', marginBottom: 6 },
};
