import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { alumnosApi } from '../../../api/alumnos.api';
import { useDebounce } from '../../../shared/hooks/useDebounce';

export interface SelectedAlumno {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string;
}

interface Props {
  onSelect: (alumno: SelectedAlumno | null) => void;
  placeholder?: string;
}

export function AlumnoAutocomplete({
  onSelect,
  placeholder = 'Buscar alumno por nombre o DNI...',
}: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SelectedAlumno | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['alumnos-autocomplete', debouncedQuery],
    queryFn: () => alumnosApi.list({ q: debouncedQuery, limit: 6 }),
    enabled: debouncedQuery.length >= 2 && !selected,
    staleTime: 30_000,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(alumno: { id: string; nombre: string; apellido: string; legajo: string }) {
    const sel: SelectedAlumno = { id: alumno.id, nombre: alumno.nombre, apellido: alumno.apellido, legajo: alumno.legajo };
    setSelected(sel);
    setQuery('');
    setShowDrop(false);
    onSelect(sel);
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    onSelect(null);
  }

  const results = data?.items ?? [];

  if (selected) {
    return (
      <div style={S.selectedBox}>
        <div style={S.selectedInfo}>
          <span style={S.selectedName}>{selected.apellido}, {selected.nombre}</span>
          <span style={S.selectedLegajo}>Leg. {selected.legajo}</span>
        </div>
        <button style={S.clearBtn} onClick={handleClear} title="Quitar selección">✕</button>
      </div>
    );
  }

  return (
    <div style={S.wrapper} ref={wrapperRef}>
      <input
        style={S.input}
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowDrop(true); }}
        onFocus={() => { if (query.length >= 2) setShowDrop(true); }}
        autoComplete="off"
      />
      {showDrop && debouncedQuery.length >= 2 && (
        <div style={S.dropdown}>
          {isLoading && <div style={S.dropItemInfo}>Buscando...</div>}
          {!isLoading && results.length === 0 && (
            <div style={S.dropItemInfo}>Sin resultados para "{debouncedQuery}"</div>
          )}
          {results.map((a) => (
            <button
              key={a.id}
              style={S.dropItem}
              onMouseDown={() => handleSelect(a)}
            >
              <span style={S.dropName}>{a.apellido}, {a.nombre}</span>
              <span style={S.dropMeta}>DNI: {a.dni} · Leg: {a.legajo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative' },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 50,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    width: '100%',
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    textAlign: 'left',
  },
  dropItemInfo: {
    padding: '12px 14px',
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  dropName: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  dropMeta: { fontSize: 12, color: '#64748b' },
  selectedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
  },
  selectedInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  selectedName: { fontSize: 14, fontWeight: 600, color: '#1e40af' },
  selectedLegajo: { fontSize: 12, color: '#3b82f6' },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 4px',
    flexShrink: 0,
  },
};
