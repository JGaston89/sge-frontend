import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { comunicacionApi } from '../../../api/comunicacion.api';
import type { TipoCircular } from '../../../shared/types/comunicacion.types';
import { TIPO_CIRCULAR_LABEL, TIPO_CIRCULAR_COLOR, DESTINATARIOS_LABEL } from '../../../shared/types/comunicacion.types';

function fmtDate(v: string) {
  const d = new Date(v.slice(0, 10) + 'T00:00:00');
  return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

const TIPOS: Array<'' | TipoCircular> = ['', 'circular', 'aviso', 'comunicado'];

export function CircularesPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [tipoFilter, setTipoFilter] = useState<'' | TipoCircular>('');

  const estaff  = user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r)) ?? false;
  const esAdmin = user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r)) ?? false;

  const { data: todas = [], isLoading } = useQuery({
    queryKey: ['circulares'],
    queryFn:  comunicacionApi.getCirculares,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => comunicacionApi.deleteCircular(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['circulares'] }),
  });

  const circulares = tipoFilter ? todas.filter(c => c.tipo === tipoFilter) : todas;
  const noLeidas   = todas.filter(c => !c.visto).length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Comunicación</h1>
          <p style={S.subtitle}>
            Circulares, avisos y comunicados institucionales
            {noLeidas > 0 && (
              <span style={S.badge}>{noLeidas} no leída{noLeidas !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        {estaff && (
          <Link to="/comunicacion/nueva" style={{ ...S.btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            + Nueva circular
          </Link>
        )}
      </div>

      {/* Filtro por tipo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TIPOS.map((t) => (
          <button
            key={t}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1px solid',
              background:  tipoFilter === t ? '#2563eb' : '#fff',
              color:       tipoFilter === t ? '#fff'    : '#475569',
              borderColor: tipoFilter === t ? '#2563eb' : '#d1d5db',
              fontWeight:  tipoFilter === t ? 600       : 400,
            }}
            onClick={() => setTipoFilter(t)}
          >
            {t === '' ? 'Todos' : TIPO_CIRCULAR_LABEL[t]}
          </button>
        ))}
      </div>

      {isLoading && <p style={S.empty}>Cargando...</p>}
      {!isLoading && circulares.length === 0 && <p style={S.empty}>No hay publicaciones para mostrar.</p>}

      {!isLoading && circulares.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {circulares.map((c) => (
            <div key={c.id} style={{ ...S.card, opacity: c.visto ? 0.85 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <Link to={`/comunicacion/${c.id}`} style={S.cardLink}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                    {!c.visto && <span style={S.dotNew} />}
                    <span style={{ ...TIPO_CIRCULAR_COLOR[c.tipo], padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {TIPO_CIRCULAR_LABEL[c.tipo]}
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Para: {DESTINATARIOS_LABEL[c.destinatarios_tipo]}
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(c.fecha_publicacion)}</span>
                    {c.fecha_vencimiento && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>· Vence: {fmtDate(c.fecha_vencimiento)}</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{c.titulo}</p>
                  <p style={{
                    margin: '4px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {c.contenido}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    Por {c.creado_por_nombre}
                  </p>
                </Link>

                {estaff && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Link to={`/comunicacion/${c.id}/editar`} style={S.btnSmall}>
                      Editar
                    </Link>
                    {esAdmin && (
                      <button
                        style={{ ...S.btnSmall, color: '#ef4444', borderColor: '#fecaca' }}
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta circular?')) deleteMutation.mutate(c.id);
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:     { maxWidth: 900 },
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:    { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#64748b', display: 'flex', alignItems: 'center', gap: 10 },
  badge:    { background: '#ef4444', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600 },
  card:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px' },
  cardLink:   { flex: 1, display: 'block', textDecoration: 'none', color: 'inherit', minWidth: 0 },
  btnPrimary: { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSmall:   { padding: '5px 12px', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#374151', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' },
  dotNew:   { width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0, display: 'inline-block' },
  empty:    { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
};
