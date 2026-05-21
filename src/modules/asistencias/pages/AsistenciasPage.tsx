import { Link, Navigate } from 'react-router-dom';
import { useAuthContext } from '../../../store/AuthContext';

export function AsistenciasPage() {
  const { user } = useAuthContext();

  if (user?.roles?.includes('alumno')) return <Navigate to="/asistencias/resumen" replace />;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Asistencias</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
          Registro de asistencia por materia y seguimiento por alumno
        </p>
      </div>

      <div style={S.grid}>
        <Link to="/asistencias/tomar" style={{ textDecoration: 'none' }}>
          <div style={S.card}>
            <div style={{ ...S.icon, background: '#eff6ff', color: '#2563eb' }}>✏️</div>
            <h2 style={S.cardTitle}>Tomar Asistencia</h2>
            <p style={S.cardDesc}>
              Registrá la asistencia de una clase: seleccioná curso, materia y fecha, y marcá el estado de cada alumno.
            </p>
            <span style={S.btnLink}>Ir al registro →</span>
          </div>
        </Link>

        <Link to="/asistencias/resumen" style={{ textDecoration: 'none' }}>
          <div style={S.card}>
            <div style={{ ...S.icon, background: '#f0fdf4', color: '#16a34a' }}>📊</div>
            <h2 style={S.cardTitle}>Resumen de Asistencia</h2>
            <p style={S.cardDesc}>
              Visualizá el porcentaje de asistencia de cada alumno en una materia durante el ciclo lectivo.
            </p>
            <span style={S.btnLink}>Ver resumen →</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#fff', borderRadius: 14,
    border: '1px solid #e2e8f0', padding: '28px 24px',
    display: 'flex', flexDirection: 'column', gap: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    cursor: 'pointer', transition: 'border-color 0.15s',
  },
  icon: {
    fontSize: 28, width: 52, height: 52, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' },
  cardDesc:  { margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.55, flex: 1 },
  btnLink:   { fontSize: 14, color: '#2563eb', fontWeight: 600 },
};
