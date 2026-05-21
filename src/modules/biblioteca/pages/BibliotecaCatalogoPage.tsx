import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { bibliotecaApi } from '../../../api/biblioteca.api';

function fmtDate(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function BibliotecaCatalogoPage() {
  const { user } = useAuthContext();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['biblioteca', debouncedSearch, page],
    queryFn:  () => bibliotecaApi.getMateriales({ search: debouncedSearch || undefined, page }),
  });

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Biblioteca — Materiales de estudio</h1>
          <p style={S.subtitle}>PDFs y recursos subidos por docentes para los alumnos</p>
        </div>
        {!user?.roles?.includes('alumno') && (
          <Link to="/biblioteca/nuevo" style={{ ...S.btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            + Nuevo material
          </Link>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          style={S.searchInput}
          value={search}
          placeholder="Buscar por título o temas..."
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <p style={S.empty}>Cargando materiales...</p>}
      {!isLoading && items.length === 0 && (
        <p style={S.empty}>No hay materiales{debouncedSearch ? ` para "${debouncedSearch}"` : ''}.</p>
      )}

      {!isLoading && items.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            {total} material{total !== 1 ? 'es' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((m) => (
              <div key={m.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Link to={`/biblioteca/${m.id}`} style={S.cardTitle}>{m.titulo}</Link>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                      {m.docente_nombre && <span style={S.chip}>Docente: {m.docente_nombre}</span>}
                      {m.curso_nombre   && <span style={S.chip}>Curso: {m.curso_nombre}</span>}
                      {m.materia_nombre && <span style={S.chip}>Materia: {m.materia_nombre}</span>}
                    </div>
                    {m.temas && (
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                        <strong>Temas:</strong> {m.temas}
                      </p>
                    )}
                    {m.descripcion && (
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{m.descripcion}</p>
                    )}
                  </div>
                  <div style={{ marginLeft: 16, textAlign: 'right', flexShrink: 0 }}>
                    <div style={S.archivoBadge}>
                      {m.archivos.length} PDF{m.archivos.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      {fmtDate(m.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div style={S.paginator}>
              <button style={S.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Anterior
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  style={{
                    ...S.pageBtn,
                    background:  page === p ? '#2563eb' : '#fff',
                    color:       page === p ? '#fff'    : '#374151',
                    borderColor: page === p ? '#2563eb' : '#d1d5db',
                    fontWeight:  page === p ? 700       : 400,
                  }}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button style={S.pageBtn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 1000 },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:       { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:    { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  searchInput: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' },
  card:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px' },
  cardTitle:   { fontSize: 16, fontWeight: 700, color: '#2563eb', textDecoration: 'none' },
  chip:        { fontSize: 12, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20, border: '1px solid #e2e8f0' },
  archivoBadge:{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btnPrimary:  { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  empty:       { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  paginator:   { display: 'flex', gap: 6, justifyContent: 'center', marginTop: 24 },
  pageBtn:     { padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#374151' },
};
