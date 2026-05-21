import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  useAlumnosByCurso,
  useActa,
  useCargarBulk,
  useCerrarActa,
  useCursos,
  useMaterias,
} from '../hooks/useCalificaciones';
import { pdfApi } from '../../../api/pdf.api';
import type { TipoCalificacion } from '../../../shared/types/calificaciones.types';

// ─── Constantes ───────────────────────────────────────────────

const TIPOS: TipoCalificacion[] = ['nota', 'parcial', 'final', 'recuperatorio', 'concepto'];
const TIPO_LABELS: Record<TipoCalificacion, string> = {
  nota: 'Nota',
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recup.',
  concepto: 'Concepto',
};
const NOTA_MINIMA = 6;

// ─── Tipos internos ───────────────────────────────────────────

interface GridRow {
  alumnoId: string;
  apellido: string;
  nombre: string;
  legajo: string;
  notas: Record<TipoCalificacion, string>;
}

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'offline';

// ─── Helpers ─────────────────────────────────────────────────

function isBelowMin(value: string): boolean {
  const n = parseFloat(value);
  return !isNaN(n) && n < NOTA_MINIMA;
}

function localKey(cursoId: string, materiaId: string, periodo: string, anio: number) {
  return `libro_${cursoId}_${materiaId}_${periodo}_${anio}`;
}

function gridToPayload(grid: GridRow[]) {
  const calificaciones: Array<{ alumno_id: string; tipo: TipoCalificacion; nota_valor: string }> = [];
  for (const row of grid) {
    for (const tipo of TIPOS) {
      const val = row.notas[tipo].trim();
      if (val) calificaciones.push({ alumno_id: row.alumnoId, tipo, nota_valor: val });
    }
  }
  return calificaciones;
}

function parseCSV(text: string, grid: GridRow[]): GridRow[] | string {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return 'El CSV debe tener al menos una fila de datos.';

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const legajoIdx = headers.indexOf('legajo');
  const apellidoIdx = headers.indexOf('apellido');
  const tipoIdxMap: Partial<Record<TipoCalificacion, number>> = {};
  TIPOS.forEach((t) => {
    const idx = headers.indexOf(TIPO_LABELS[t].toLowerCase());
    if (idx >= 0) tipoIdxMap[t] = idx;
    // también buscar por nombre directo
    const idx2 = headers.indexOf(t);
    if (idx2 >= 0) tipoIdxMap[t] = idx2;
  });

  if (legajoIdx < 0 && apellidoIdx < 0) {
    return 'El CSV debe tener una columna "Legajo" o "Apellido".';
  }

  const newGrid = grid.map((r) => ({ ...r, notas: { ...r.notas } }));

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const identifier = legajoIdx >= 0 ? cols[legajoIdx] : cols[apellidoIdx];
    if (!identifier) continue;

    const rowIdx = newGrid.findIndex((r) =>
      legajoIdx >= 0 ? r.legajo === identifier : r.apellido.toLowerCase() === identifier.toLowerCase(),
    );
    if (rowIdx < 0) continue;

    TIPOS.forEach((t) => {
      const idx = tipoIdxMap[t];
      if (idx !== undefined && cols[idx]) {
        newGrid[rowIdx].notas[t] = cols[idx];
      }
    });
  }
  return newGrid;
}

// ─── Componente ───────────────────────────────────────────────

export function LibroCalificacionesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cursoId    = searchParams.get('curso_id')    ?? '';
  const materiaId  = searchParams.get('materia_id')  ?? '';
  const periodo    = searchParams.get('periodo')     ?? '';
  const anio       = Number(searchParams.get('anio_academico') ?? new Date().getFullYear());

  const { data: cursos   = [] } = useCursos();
  const { data: materias = [] } = useMaterias();
  const { data: alumnos  = [], isLoading: loadingAlumnos } = useAlumnosByCurso(cursoId);
  const { data: acta, error: actaError } = useActa(
    cursoId && materiaId && periodo ? { curso_id: cursoId, materia_id: materiaId, periodo, anio_academico: anio } : null,
  );
  const bulkMutation  = useCargarBulk();
  const cerrarMutation = useCerrarActa();

  const cursoNombre   = cursos.find((c) => c.id === cursoId)?.nombre   ?? cursoId;
  const materiaNombre = materias.find((m) => m.id === materiaId)?.nombre ?? materiaId;

  // ─── Estado grid ──────────────────────────────────────────
  const [grid, setGrid]             = useState<GridRow[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved]   = useState<Date | null>(null);
  const [isOnline, setIsOnline]     = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showCerrar, setShowCerrar] = useState(false);
  const [cerrarObs, setCerrarObs]   = useState('');
  const [csvError, setCsvError]     = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const initialized = useRef(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const lKey = localKey(cursoId, materiaId, periodo, anio);

  // ─── Online/offline ───────────────────────────────────────
  useEffect(() => {
    const up   = () => { setIsOnline(true);  };
    const down = () => { setIsOnline(false); setSaveStatus('offline'); };
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // Detectar datos locales al volver online
  useEffect(() => {
    if (isOnline && localStorage.getItem(lKey)) setShowOfflineBanner(true);
  }, [isOnline, lKey]);

  // ─── Inicializar grid ─────────────────────────────────────
  useEffect(() => {
    if (!alumnos.length || initialized.current) return;

    const base: GridRow[] = alumnos.map((a) => ({
      alumnoId: a.id,
      apellido: a.apellido,
      nombre:   a.nombre,
      legajo:   a.numero_legajo,
      notas:    { nota: '', parcial: '', final: '', recuperatorio: '', concepto: '' },
    }));

    // ¿Hay datos locales?
    const local = localStorage.getItem(lKey);
    if (local) {
      try {
        const { data } = JSON.parse(local) as { data: Record<string, Record<TipoCalificacion, string>> };
        base.forEach((row) => { if (data[row.alumnoId]) row.notas = { ...row.notas, ...data[row.alumnoId] }; });
        setSaveStatus('dirty');
      } catch { /* ignore */ }
    } else if (acta) {
      // Pre-cargar desde servidor
      acta.calificaciones.forEach((c) => {
        const row = base.find((r) => r.alumnoId === c.alumno_id);
        if (row && TIPOS.includes(c.tipo as TipoCalificacion)) {
          row.notas[c.tipo as TipoCalificacion] = c.nota_valor;
        }
      });
    }

    setGrid(base);
    initialized.current = true;
  }, [alumnos, acta, lKey]);

  // Repoblar desde acta cuando llega (si aún no inicializamos)
  useEffect(() => {
    if (initialized.current || !acta || !alumnos.length) return;
    // se maneja en el effect de arriba cuando alumnos también está listo
  }, [acta, alumnos]);

  // ─── Autoguardado cada 30 s ───────────────────────────────
  useEffect(() => {
    if (saveStatus !== 'dirty') return;
    const t = setTimeout(() => { if (saveStatus === 'dirty') handleSave(); }, 30_000);
    return () => clearTimeout(t);
  });

  // ─── Guardar ──────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const calificaciones = gridToPayload(grid);
    if (!calificaciones.length) return;

    setSaveStatus('saving');

    if (!isOnline) {
      saveLocal();
      setSaveStatus('offline');
      return;
    }

    try {
      await bulkMutation.mutateAsync({ curso_id: cursoId, materia_id: materiaId, periodo, anio_academico: anio, calificaciones });
      setSaveStatus('saved');
      setLastSaved(new Date());
      localStorage.removeItem(lKey);
      setShowOfflineBanner(false);
    } catch {
      saveLocal();
      setSaveStatus('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, isOnline, cursoId, materiaId, periodo, anio, lKey]);

  function saveLocal() {
    const data: Record<string, Record<TipoCalificacion, string>> = {};
    grid.forEach((r) => { data[r.alumnoId] = r.notas; });
    localStorage.setItem(lKey, JSON.stringify({ timestamp: Date.now(), data }));
  }

  // ─── Actualizar celda ─────────────────────────────────────
  function updateCell(rowIdx: number, tipo: TipoCalificacion, value: string) {
    setGrid((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], notas: { ...next[rowIdx].notas, [tipo]: value } };
      return next;
    });
    setSaveStatus('dirty');
  }

  // ─── Navegación por teclado ───────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent, rowIdx: number, colIdx: number) {
    const nCols = TIPOS.length;
    const nRows = grid.length;
    const focus = (r: number, c: number) => {
      const el = document.getElementById(`cell-${r}-${c}`) as HTMLInputElement | null;
      el?.focus(); el?.select();
    };

    if (e.key === 'Tab') {
      e.preventDefault();
      colIdx + 1 < nCols ? focus(rowIdx, colIdx + 1) : rowIdx + 1 < nRows && focus(rowIdx + 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      rowIdx + 1 < nRows && focus(rowIdx + 1, colIdx);
    } else if (e.key === 'ArrowUp'    && rowIdx > 0)        { e.preventDefault(); focus(rowIdx - 1, colIdx); }
      else if (e.key === 'ArrowDown'  && rowIdx + 1 < nRows) { e.preventDefault(); focus(rowIdx + 1, colIdx); }
      else if (e.key === 'ArrowLeft'  && colIdx > 0)         { e.preventDefault(); focus(rowIdx, colIdx - 1); }
      else if (e.key === 'ArrowRight' && colIdx + 1 < nCols) { e.preventDefault(); focus(rowIdx, colIdx + 1); }
  }

  // ─── CSV ──────────────────────────────────────────────────
  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    setCsvError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSV(text, grid);
      if (typeof result === 'string') { setCsvError(result); }
      else { setGrid(result); setSaveStatus('dirty'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function downloadCSVTemplate() {
    const header = ['Legajo', ...TIPOS.map((t) => TIPO_LABELS[t])].join(',');
    const rows = grid.map((r) => [r.legajo, ...TIPOS.map(() => '')].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `plantilla-${materiaNombre}-${periodo}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Cerrar acta ──────────────────────────────────────────
  async function handleCerrar() {
    if (!acta) return;
    await handleSave();
    cerrarMutation.mutate(
      { actaId: acta.id, observaciones: cerrarObs || undefined },
      { onSuccess: () => {
          setShowCerrar(false);
          navigate(`/calificaciones?curso_id=${cursoId}&materia_id=${materiaId}&periodo=${encodeURIComponent(periodo)}&anio_academico=${anio}`);
        },
      },
    );
  }

  // ─── Resumen para modal cierre ────────────────────────────
  const sinNota = grid.filter((r) => TIPOS.every((t) => !r.notas[t].trim()));
  const conNota = grid.length - sinNota.length;

  // ─── Booleans ─────────────────────────────────────────────
  const isReadOnly = acta?.estado === 'cerrada';

  // ─── Render ───────────────────────────────────────────────
  if (!cursoId || !materiaId || !periodo) {
    return (
      <div style={S.page}>
        <Link to="/calificaciones" style={S.back}>← Calificaciones</Link>
        <p style={{ color: '#dc2626', marginTop: 16 }}>Parámetros incompletos. Volvé a buscar el acta.</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Banner offline */}
      {showOfflineBanner && (
        <div style={S.offlineBanner}>
          📡 Hay cambios guardados localmente sin sincronizar.
          <button style={S.syncBtn} onClick={() => { setShowOfflineBanner(false); handleSave(); }}>
            Sincronizar ahora
          </button>
          <button style={S.dismissBtn} onClick={() => { setShowOfflineBanner(false); localStorage.removeItem(lKey); }}>
            Descartar
          </button>
        </div>
      )}

      {/* Cabecera */}
      <div style={S.breadcrumb}>
        <Link to="/calificaciones" style={S.back}>← Calificaciones</Link>
      </div>

      <div style={S.header}>
        <div>
          <h1 style={S.title}>Libro de calificaciones</h1>
          <div style={S.subtitle}>
            {materiaNombre} · {cursoNombre} · {periodo} {anio}
            {acta && (
              <span style={{ ...S.estadoBadge, ...(acta.estado === 'cerrada' ? S.badgeCerrada : S.badgeBorrador) }}>
                {acta.estado}
              </span>
            )}
          </div>
        </div>

        <div style={S.headerActions}>
          {/* Estado de guardado */}
          <span style={{ ...S.saveIndicator, color: statusColor(saveStatus) }}>
            {statusLabel(saveStatus, lastSaved)}
          </span>

          {!isReadOnly && (
            <>
              <button style={S.btnGhost} onClick={downloadCSVTemplate} title="Descargar plantilla CSV">
                ⬇ Plantilla CSV
              </button>
              <label style={S.btnGhost} title="Importar desde CSV">
                ↑ Importar CSV
                <input ref={csvInputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCSV} />
              </label>
              <button
                style={{ ...S.btnSecondary, opacity: saveStatus !== 'dirty' ? 0.5 : 1 }}
                onClick={handleSave}
                disabled={saveStatus === 'saving' || saveStatus !== 'dirty'}
              >
                {saveStatus === 'saving' ? 'Guardando...' : '💾 Guardar ahora'}
              </button>
            </>
          )}

          {acta && (
            <button
              style={S.btnPdf}
              disabled={pdfLoading}
              onClick={async () => {
                setPdfLoading(true);
                try { await pdfApi.downloadActa(acta.id); } finally { setPdfLoading(false); }
              }}
            >
              {pdfLoading ? '...' : '⬇ PDF'}
            </button>
          )}

          {acta && acta.estado === 'borrador' && (
            <button style={S.btnDanger} onClick={() => setShowCerrar(true)}>
              Cerrar acta
            </button>
          )}
        </div>
      </div>

      {csvError && <div style={S.errorBar}>{csvError}</div>}

      {!isOnline && (
        <div style={S.offlineBar}>
          ⚠ Sin conexión — las notas se guardan localmente y se sincronizarán al reconectar.
        </div>
      )}

      {/* Grilla */}
      {loadingAlumnos ? (
        <div style={S.loading}>Cargando alumnos...</div>
      ) : grid.length === 0 ? (
        <div style={S.empty}>No hay alumnos activos en este curso.</div>
      ) : (
        <div style={S.tableWrapper}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 220 }}>Alumno</th>
                <th style={{ ...S.th, width: 100 }}>Legajo</th>
                {TIPOS.map((t) => (
                  <th key={t} style={{ ...S.th, width: 100 }}>{TIPO_LABELS[t]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, rowIdx) => (
                <tr key={row.alumnoId} style={rowIdx % 2 === 0 ? S.trEven : S.trOdd}>
                  <td style={S.tdName}>{row.apellido}, {row.nombre}</td>
                  <td style={S.tdLegajo}>{row.legajo}</td>
                  {TIPOS.map((tipo, colIdx) => {
                    const val = row.notas[tipo];
                    const bad = isBelowMin(val);
                    return (
                      <td key={tipo} style={S.tdCell}>
                        <input
                          id={`cell-${rowIdx}-${colIdx}`}
                          style={{
                            ...S.cellInput,
                            ...(bad ? S.cellRed : {}),
                            ...(isReadOnly ? S.cellReadOnly : {}),
                          }}
                          value={val}
                          readOnly={isReadOnly}
                          maxLength={10}
                          onChange={(e) => updateCell(rowIdx, tipo, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                          title={bad ? `Nota inferior al mínimo (${NOTA_MINIMA})` : undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda */}
      {!isReadOnly && grid.some((r) => TIPOS.some((t) => isBelowMin(r.notas[t]))) && (
        <div style={S.legend}>
          <span style={S.legendDot} /> Nota inferior a {NOTA_MINIMA} (mínimo aprobatorio)
        </div>
      )}

      {/* Modal cierre de acta */}
      {showCerrar && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Cerrar acta</h2>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>
              Esta acción es definitiva. No podrá modificar las notas sin rectificación directiva.
            </p>

            <div style={S.summaryCard}>
              <div style={S.summaryRow}>
                <span>Total alumnos</span><strong>{grid.length}</strong>
              </div>
              <div style={S.summaryRow}>
                <span>Con al menos una nota</span><strong style={{ color: '#16a34a' }}>{conNota}</strong>
              </div>
              <div style={S.summaryRow}>
                <span>Sin ninguna nota</span>
                <strong style={{ color: sinNota.length ? '#dc2626' : '#16a34a' }}>{sinNota.length}</strong>
              </div>
            </div>

            {sinNota.length > 0 && (
              <div style={S.warningBox}>
                ⚠ {sinNota.length} alumno/s sin notas: {sinNota.map((r) => `${r.apellido}, ${r.nombre}`).join(' · ')}
              </div>
            )}

            <label style={S.modalLabel}>
              Observaciones (opcional)
              <textarea
                value={cerrarObs}
                onChange={(e) => setCerrarObs(e.target.value)}
                rows={2}
                style={S.textarea}
                placeholder="Ej: Cierre de primer trimestre"
              />
            </label>

            <div style={S.modalActions}>
              <button style={S.btnSecondary} onClick={() => setShowCerrar(false)}>Cancelar</button>
              <button
                style={S.btnDanger}
                onClick={handleCerrar}
                disabled={cerrarMutation.isPending}
              >
                {cerrarMutation.isPending ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers de estado ────────────────────────────────────────

function statusLabel(s: SaveStatus, last: Date | null): string {
  switch (s) {
    case 'idle':    return '';
    case 'dirty':   return '⚠ Cambios sin guardar';
    case 'saving':  return '⏳ Guardando...';
    case 'saved':   return `✓ Guardado${last ? ` ${last.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''}`;
    case 'error':   return '❌ Error al guardar';
    case 'offline': return '📡 Guardado localmente';
  }
}

function statusColor(s: SaveStatus): string {
  switch (s) {
    case 'saved':   return '#16a34a';
    case 'dirty':   return '#d97706';
    case 'error':   return '#dc2626';
    case 'offline': return '#7c3aed';
    default:        return '#64748b';
  }
}

// ─── Estilos ─────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100 },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  breadcrumb: { marginBottom: 12 },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16, gap: 16, flexWrap: 'wrap',
  },
  title: { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  estadoBadge: { display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  badgeBorrador: { background: '#fef9c3', color: '#854d0e' },
  badgeCerrada:  { background: '#dcfce7', color: '#15803d' },
  headerActions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  saveIndicator: { fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' },
  btnGhost: {
    padding: '7px 12px', background: 'transparent', border: '1px solid #d1d5db',
    borderRadius: 7, cursor: 'pointer', fontSize: 12, color: '#374151',
  },
  btnSecondary: {
    padding: '8px 14px', background: '#fff', border: '1px solid #d1d5db',
    borderRadius: 7, cursor: 'pointer', fontSize: 13,
  },
  btnPdf: {
    padding: '8px 12px', background: '#0f172a', color: '#fff',
    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  btnDanger: {
    padding: '8px 16px', background: '#dc2626', color: '#fff',
    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  offlineBanner: {
    background: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: 8,
    padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#5b21b6',
    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
  },
  syncBtn: {
    background: '#7c3aed', color: '#fff', border: 'none',
    borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12,
  },
  dismissBtn: {
    background: 'transparent', border: '1px solid #c4b5fd', color: '#5b21b6',
    borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12,
  },
  offlineBar: {
    background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8,
    padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#c2410c',
  },
  errorBar: {
    background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
    padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#b91c1c',
  },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  empty:   { padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  tableWrapper: {
    background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  th: {
    padding: '11px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700,
    color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em',
    background: '#f8fafc', borderBottom: '2px solid #e2e8f0', userSelect: 'none',
  },
  trEven: { background: '#fff' },
  trOdd:  { background: '#f8fafc' },
  tdName: { padding: '8px 12px', fontSize: 13, color: '#0f172a', minWidth: 180 },
  tdLegajo: { padding: '8px 10px', fontSize: 12, fontFamily: 'monospace', color: '#475569', textAlign: 'center' },
  tdCell: { padding: '4px 6px', textAlign: 'center' },
  cellInput: {
    width: 72, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 14, textAlign: 'center', outline: 'none', background: '#fff',
    transition: 'border-color 0.1s',
  },
  cellRed: {
    border: '1.5px solid #ef4444', background: '#fff1f2', color: '#b91c1c', fontWeight: 600,
  },
  cellReadOnly: {
    background: '#f1f5f9', color: '#64748b', cursor: 'default',
  },
  legend: {
    marginTop: 10, fontSize: 12, color: '#dc2626',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  legendDot: { width: 12, height: 12, background: '#fff1f2', border: '1.5px solid #ef4444', borderRadius: 3, display: 'inline-block' },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 14, padding: 32, width: '100%',
    maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  summaryCard: {
    background: '#f8fafc', borderRadius: 8, padding: '12px 16px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  summaryRow: {
    display: 'flex', justifyContent: 'space-between', fontSize: 14,
  },
  warningBox: {
    background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, color: '#c2410c',
  },
  modalLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#374151' },
  textarea: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical' },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
};
