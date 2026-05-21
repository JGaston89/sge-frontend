import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { comunicacionApi } from '../../../api/comunicacion.api';
import { TIPO_CIRCULAR_LABEL, TIPO_CIRCULAR_COLOR, DESTINATARIOS_LABEL } from '../../../shared/types/comunicacion.types';

function fmtDate(v: string) {
  const d = new Date(v.slice(0, 10) + 'T00:00:00');
  return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function CircularDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const { user }   = useAuthContext();
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const estaff  = user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r)) ?? false;
  const esAdmin = user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r)) ?? false;

  const { data: circular, isLoading } = useQuery({
    queryKey: ['circular', id],
    queryFn:  () => comunicacionApi.getCircularById(id!),
    enabled:  !!id,
  });

  // Invalidar la lista al leer para que el badge y visto se actualicen
  useEffect(() => {
    if (circular) {
      qc.invalidateQueries({ queryKey: ['circulares'] });
    }
  }, [circular?.id]);

  const deleteMutation = useMutation({
    mutationFn: () => comunicacionApi.deleteCircular(id!),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['circulares'] });
      navigate('/comunicacion');
    },
  });

  if (isLoading) return <p style={{ color: '#94a3b8', padding: '40px 0', textAlign: 'center' }}>Cargando...</p>;
  if (!circular) return <p style={{ color: '#ef4444', padding: '40px 0', textAlign: 'center' }}>Circular no encontrada.</p>;

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/comunicacion" style={S.back}>← Comunicación</Link>
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...TIPO_CIRCULAR_COLOR[circular.tipo], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {TIPO_CIRCULAR_LABEL[circular.tipo]}
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>Para: {DESTINATARIOS_LABEL[circular.destinatarios_tipo]}</span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{fmtDate(circular.fecha_publicacion)}</span>
            {circular.fecha_vencimiento && (
              <span style={{ fontSize: 13, color: '#94a3b8' }}>· Vence: {fmtDate(circular.fecha_vencimiento)}</span>
            )}
          </div>

          {estaff && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Link to={`/comunicacion/${circular.id}/editar`} style={S.btnSecondary}>
                Editar
              </Link>
              {esAdmin && (
                <button
                  style={{ ...S.btnSecondary, color: '#ef4444', borderColor: '#fecaca' }}
                  onClick={() => { if (window.confirm('¿Eliminar esta circular?')) deleteMutation.mutate(); }}
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>

        <h1 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
          {circular.titulo}
        </h1>

        <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
          {circular.contenido}
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9', fontSize: 13, color: '#94a3b8' }}>
          Publicado por {circular.creado_por_nombre}
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 800 },
  back:        { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  card:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 28 },
  btnSecondary:{ padding: '7px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' },
};
