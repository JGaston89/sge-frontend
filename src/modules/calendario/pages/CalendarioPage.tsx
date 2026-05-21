import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { calendarioApi } from '../../../api/calendario.api';
import {
  TIPO_EVENTO_LABEL, TIPO_EVENTO_COLOR,
  type TipoEvento, type CreateEventoDto,
} from '../../../shared/types/calendario.types';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const TIPOS: TipoEvento[] = [
  'feriado_nacional','feriado_provincial','feriado_institucional',
  'inicio_clases','fin_clases','receso_invernal','receso_primavera',
  'reunion_padres','acto_escolar','jornada_institucional',
  'periodo_examenes','entrega_boletines','otro',
];

const EMPTY_FORM: CreateEventoDto = {
  titulo: '', tipo: 'otro', fecha_inicio: '', fecha_fin: '', todo_el_dia: true,
};

function padZ(n: number) { return String(n).padStart(2, '0'); }
function toISO(y: number, m: number, d: number) { return `${y}-${padZ(m+1)}-${padZ(d)}`; }

export function CalendarioPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const today = new Date();
  const esAlumno = user?.roles?.includes('alumno') ?? false;
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [filterTipo, setFilterTipo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateEventoDto>(EMPTY_FORM);
  const [showImport, setShowImport] = useState(false);
  const [importAnio, setImportAnio] = useState(today.getFullYear());
  const [importMsg, setImportMsg] = useState('');

  // Rango del mes completo
  const desde = toISO(view.year, view.month, 1);
  const lastDay = new Date(view.year, view.month + 1, 0).getDate();
  const hasta   = toISO(view.year, view.month, lastDay);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['calendario-eventos', desde, hasta, filterTipo],
    queryFn:  () => calendarioApi.getEventos({ desde, hasta, tipo: filterTipo || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateEventoDto) => calendarioApi.createEvento(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendario-eventos'] });
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
  });

  const importMutation = useMutation({
    mutationFn: () => calendarioApi.importarFeriados({ anio: importAnio }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['calendario-eventos'] });
      setImportMsg(`✓ ${res.insertados} feriados importados de ${res.total} disponibles para ${importAnio}`);
    },
    onError: () => setImportMsg('Error al importar feriados'),
  });

  // Construir grilla del mes
  const firstWeekDay = new Date(view.year, view.month, 1).getDay();
  const totalDays    = new Date(view.year, view.month + 1, 0).getDate();

  const eventsByDay = new Map<string, typeof eventos>();
  for (const ev of eventos) {
    const key = ev.fecha_inicio.slice(0, 10);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(ev);
    // Si tiene fecha_fin distinta, registrar en cada día intermedio
    if (ev.fecha_fin && ev.fecha_fin !== ev.fecha_inicio) {
      const start = new Date(ev.fecha_inicio + 'T00:00:00');
      const end   = new Date(ev.fecha_fin   + 'T00:00:00');
      const cur   = new Date(start);
      cur.setDate(cur.getDate() + 1);
      while (cur <= end) {
        const k = toISO(cur.getFullYear(), cur.getMonth(), cur.getDate());
        if (!eventsByDay.has(k)) eventsByDay.set(k, []);
        eventsByDay.get(k)!.push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  function prevMonth() {
    setView(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  }
  function nextMonth() {
    setView(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo || !form.tipo || !form.fecha_inicio) return;
    const dto: CreateEventoDto = { ...form };
    if (!dto.fecha_fin) delete dto.fecha_fin;
    createMutation.mutate(dto);
  }

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Calendario Académico</h1>
          <p style={S.subtitle}>Eventos institucionales, feriados y ciclos lectivos</p>
        </div>
        {!esAlumno && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btnSecondary} onClick={() => { setShowImport((v) => !v); setImportMsg(''); }}>
              📥 Importar feriados
            </button>
            <button style={S.btnPrimary} onClick={() => setShowForm((v) => !v)}>
              + Nuevo evento
            </button>
          </div>
        )}
      </div>

      {/* Panel importar feriados */}
      {!esAlumno && showImport && (
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Importar feriados nacionales (Nager.Date)</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={S.label}>
              Año
              <input
                type="number" style={{ ...S.input, width: 100 }}
                value={importAnio}
                onChange={(e) => setImportAnio(Number(e.target.value))}
                min={2020} max={2100}
              />
            </label>
            <button
              style={{ ...S.btnPrimary, marginTop: 18, opacity: importMutation.isPending ? 0.6 : 1 }}
              disabled={importMutation.isPending}
              onClick={() => { setImportMsg(''); importMutation.mutate(); }}
            >
              {importMutation.isPending ? 'Importando...' : 'Importar'}
            </button>
            {importMsg && <span style={{ marginTop: 18, fontSize: 13, color: importMsg.startsWith('✓') ? '#15803d' : '#dc2626' }}>{importMsg}</span>}
          </div>
        </div>
      )}

      {/* Panel nuevo evento */}
      {!esAlumno && showForm && (
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Nuevo evento</h3>
          <form onSubmit={handleSubmit}>
            {createMutation.isError && (
              <div style={S.errorBox}>Error al crear el evento. Revisá los datos.</div>
            )}
            <div style={S.grid3}>
              <label style={{ ...S.label, gridColumn: '1 / -1' }}>
                Título *
                <input required style={S.input} value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              </label>
              <label style={S.label}>
                Tipo *
                <select required style={S.input} value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoEvento }))}>
                  {TIPOS.map((t) => <option key={t} value={t}>{TIPO_EVENTO_LABEL[t]}</option>)}
                </select>
              </label>
              <label style={S.label}>
                Fecha inicio *
                <input required type="date" style={S.input} value={form.fecha_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))} />
              </label>
              <label style={S.label}>
                Fecha fin
                <input type="date" style={S.input} value={form.fecha_fin ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value || undefined }))} />
              </label>
              <label style={{ ...S.label, gridColumn: '1 / -1' }}>
                Descripción
                <input style={S.input} value={form.descripcion ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value || undefined }))} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" style={S.btnSecondary} onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancelar</button>
              <button type="submit" style={{ ...S.btnPrimary, opacity: createMutation.isPending ? 0.6 : 1 }} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Guardar evento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtro tipo */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <select style={{ ...S.input, width: 220 }} value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{TIPO_EVENTO_LABEL[t]}</option>)}
        </select>
        {isLoading && <span style={{ fontSize: 13, color: '#94a3b8' }}>Cargando...</span>}
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>
          {eventos.length} evento{eventos.length !== 1 ? 's' : ''} en {MESES[view.month]} {view.year}
        </span>
      </div>

      {/* Calendario */}
      <div style={S.calCard}>
        {/* Navegación */}
        <div style={S.calNav}>
          <button style={S.navBtn} onClick={prevMonth}>‹</button>
          <span style={S.calTitle}>{MESES[view.month]} {view.year}</span>
          <button style={S.navBtn} onClick={nextMonth}>›</button>
        </div>

        {/* Cabecera días */}
        <div style={S.calGrid}>
          {DIAS.map((d) => (
            <div key={d} style={S.dayHeader}>{d}</div>
          ))}

          {/* Celdas vacías al inicio */}
          {Array.from({ length: firstWeekDay }).map((_, i) => (
            <div key={`empty-${i}`} style={S.dayCell} />
          ))}

          {/* Días del mes */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day  = i + 1;
            const iso  = toISO(view.year, view.month, day);
            const evs  = eventsByDay.get(iso) ?? [];
            const isToday = iso === todayISO;
            return (
              <div key={iso} style={{ ...S.dayCell, background: isToday ? '#eff6ff' : '#fff', borderColor: isToday ? '#bfdbfe' : '#f1f5f9' }}>
                <span style={{ ...S.dayNum, color: isToday ? '#2563eb' : '#0f172a', fontWeight: isToday ? 700 : 400 }}>{day}</span>
                <div style={S.eventList}>
                  {evs.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      title={ev.titulo}
                      style={{
                        ...S.eventChip,
                        background: TIPO_EVENTO_COLOR[ev.tipo] + '20',
                        color: TIPO_EVENTO_COLOR[ev.tipo],
                        borderLeft: `3px solid ${TIPO_EVENTO_COLOR[ev.tipo]}`,
                      }}
                    >
                      {ev.titulo}
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <div style={{ fontSize: 10, color: '#94a3b8', paddingLeft: 2 }}>+{evs.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {TIPOS.filter((t) => eventos.some((e) => e.tipo === t)).map((t) => (
          <span key={t} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: TIPO_EVENTO_COLOR[t], display: 'inline-block' }} />
            {TIPO_EVENTO_LABEL[t]}
          </span>
        ))}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:      { maxWidth: 1100 },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:     { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:  { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle: { margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid3:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  label:     { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:     { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:  { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  btnPrimary:   { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' },

  // Calendario
  calCard:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' },
  calNav:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' },
  calTitle:  { fontSize: 17, fontWeight: 700, color: '#0f172a' },
  navBtn:    { background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  calGrid:   { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#f1f5f9', padding: 1 },
  dayHeader: { textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#94a3b8', padding: '8px 4px', background: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' },
  dayCell:   { background: '#fff', minHeight: 88, padding: '6px 4px', border: '1px solid transparent', borderRadius: 2 },
  dayNum:    { fontSize: 13, display: 'block', marginBottom: 3, paddingLeft: 2 },
  eventList: { display: 'flex', flexDirection: 'column', gap: 2 },
  eventChip: { fontSize: 10, padding: '1px 4px', borderRadius: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' },
};
