import { useAuthContext } from '../../../store/AuthContext';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardPage() {
  const { user } = useAuthContext();

  return (
    <div>
      <h1 style={S.title}>
        {getGreeting()}, {user?.nombre}
      </h1>
      <p style={S.subtitle}>Bienvenido al Sistema de Gestión Escolar.</p>

      <div style={S.card}>
        <p style={S.cardText}>
          El panel de inicio estará disponible próximamente. Desde aquí podrás ver
          estadísticas, comunicados y actividad reciente del sistema.
        </p>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  title:    { fontSize: 28, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' },
  subtitle: { color: '#64748b', fontSize: 15, margin: '0 0 32px' },
  card: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 32,
    maxWidth: 480,
  },
  cardText: { margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.7 },
};
