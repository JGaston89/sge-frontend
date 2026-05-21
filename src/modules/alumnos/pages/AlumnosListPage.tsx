import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAlumnosList } from '../hooks/useAlumnos';
import { AlumnoTable } from '../components/AlumnoTable';
import { AlumnoSearch } from '../components/AlumnoSearch';
import type { QueryAlumnosDto } from '../../../shared/types/alumnos.types';

export function AlumnosListPage() {
  const [params, setParams] = useState<QueryAlumnosDto>({});
  const { data, isLoading } = useAlumnosList(params);

  const handleSearchChange = useCallback((newParams: QueryAlumnosDto) => {
    setParams(newParams);
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Alumnos</h1>
          {data && <span style={styles.count}>{data.total} registros</span>}
        </div>
        <Link to="/alumnos/nuevo" style={styles.btnNew}>+ Nuevo alumno</Link>
      </div>

      <div style={styles.searchBar}>
        <AlumnoSearch onChange={handleSearchChange} />
      </div>

      <AlumnoTable alumnos={data?.items ?? []} isLoading={isLoading} />

      {data?.cursor && (
        <div style={styles.paginationRow}>
          <button
            style={styles.btnMore}
            onClick={() => setParams((p) => ({ ...p, cursor: data.cursor ?? undefined }))}
          >
            Cargar más
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  count: { fontSize: 13, color: '#94a3b8' },
  btnNew: {
    padding: '10px 20px',
    background: '#2563eb',
    color: '#fff',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
  },
  searchBar: { marginBottom: 16 },
  paginationRow: { marginTop: 16, textAlign: 'center' },
  btnMore: {
    padding: '10px 32px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },
};
