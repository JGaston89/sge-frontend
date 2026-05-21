import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { planificacionApi } from '../../../api/planificacion.api';
import {
  ESTADO_PLANIFICACION_LABEL,
  ESTADO_PLANIFICACION_COLORS,
  type EstadoPlanificacion,
} from '../../../shared/types/planificacion.types';

const FLUJO: EstadoPlanificacion[] = ['borrador', 'enviada', 'aprobada'];

function EstadoBadge({ estado }: { estado: EstadoPlanificacion }) {
  return (
    <span style={{
      ...ESTADO_PLANIFICACION_COLORS[estado],
      padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
    }}>
      {ESTADO_PLANIFICACION_LABEL[estado]}
    </span>
  );
}

function Section({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div style={S.section}>
      <h3 style={S.sectionTitle}>{title}</h3>
      <p style={S.sectionBody}>{content}</p>
    </div>
  );
}

export function VisorPlanificacionPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const qc       = useQueryClient();

  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ['planificacion', id],
    queryFn:  () => planificacionApi.getOne(id!),
    enabled:  !!id,
  });

  const estadoMutation = useMutation({
    mutationFn: (estado: EstadoPlanificacion) => planificacionApi.update(id!, { estado }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planificacion', id] });
      qc.invalidateQueries({ queryKey: ['planificaciones'] });
    },
  });

  const noEsPlanificador = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo', 'docente'].includes(r));
  if (noEsPlanificador) return <Navigate to="/calificaciones" replace />;

  if (isLoading) return <p style={S.empty}>Cargando planificación...</p>;
  if (isError || !plan) return <p style={{ ...S.empty, color: '#dc2626' }}>No se pudo cargar la planificación.</p>;

  const idxEstado  = FLUJO.indexOf(plan.estado);
  const siguiente  = idxEstado < FLUJO.length - 1 ? FLUJO[idxEstado + 1] : null;
  const anterior   = idxEstado > 0                 ? FLUJO[idxEstado - 1] : null;

  return (
    <div style={S.page}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 12 }}>
        <Link to="/planificacion" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>
          ← Planificación curricular
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={S.title}>{plan.materia_nombre}</h1>
          <p style={S.subtitle}>
            {plan.curso_nombre} · Ciclo {plan.ciclo_lectivo}
            {plan.docente_nombre && <> · <span style={{ color: '#0f172a' }}>{plan.docente_nombre}</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <EstadoBadge estado={plan.estado} />
          <Link
            to={`/planificacion/${id}/editar`}
            style={{ ...S.btnSecondary, textDecoration: 'none' }}
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Cambio de estado */}
      <div style={{ ...S.card, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Cambiar estado:</span>
        {anterior && (
          <button
            style={{ ...S.btnMini, color: '#475569' }}
            onClick={() => estadoMutation.mutate(anterior)}
            disabled={estadoMutation.isPending}
          >
            ← Volver a {ESTADO_PLANIFICACION_LABEL[anterior]}
          </button>
        )}
        {siguiente && (
          <button
            style={{ ...S.btnMini, background: '#2563eb', color: '#fff', borderColor: '#2563eb' }}
            onClick={() => estadoMutation.mutate(siguiente)}
            disabled={estadoMutation.isPending}
          >
            Marcar como {ESTADO_PLANIFICACION_LABEL[siguiente]} →
          </button>
        )}
        {!siguiente && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>✓ Estado final alcanzado</span>}
      </div>

      {/* Contenido */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Section title="Objetivos generales" content={plan.objetivos} />

        {/* Unidades */}
        {plan.contenidos.length > 0 && (
          <div style={S.section}>
            <h3 style={S.sectionTitle}>Unidades temáticas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.contenidos.map((u, i) => (
                <div key={i} style={S.unidadCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={S.unidadNum}>{i + 1}</span>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}>{u.titulo || '(sin título)'}</strong>
                  </div>
                  {u.descripcion && (
                    <p style={{ margin: '8px 0 0 34px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                      {u.descripcion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Section title="Metodología de enseñanza"  content={plan.metodologia} />
        <Section title="Criterios de evaluación"    content={plan.criterios_evaluacion} />
        <Section title="Observaciones"              content={plan.observaciones} />

        {!plan.objetivos && plan.contenidos.length === 0 && !plan.metodologia && !plan.criterios_evaluacion && (
          <p style={S.empty}>Esta planificación aún no tiene contenido. Hacé clic en "Editar" para completarla.</p>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:         { maxWidth: 860 },
  title:        { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  subtitle:     { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  card:         { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 },
  section:      { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 },
  sectionTitle: { margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
  sectionBody:  { margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' },
  unidadCard:   { background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '14px 16px' },
  unidadNum:    { width: 24, height: 24, background: '#6366f1', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  empty:        { color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 },
  btnSecondary: { padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  btnMini:      { padding: '7px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 500 },
};
