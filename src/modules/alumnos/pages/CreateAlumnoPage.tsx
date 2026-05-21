import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../../../store/AuthContext';
import { useCreateAlumno } from '../hooks/useAlumnos';
import { AlumnoForm } from '../components/AlumnoForm';
import type { CreateAlumnoDto } from '../../../shared/types/alumnos.types';
import type { AxiosError } from 'axios';

export function CreateAlumnoPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { mutate, isPending, error } = useCreateAlumno();

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  function handleSubmit(dto: CreateAlumnoDto) {
    mutate(dto, {
      onSuccess: (alumno) => navigate(`/alumnos/${alumno.id}`),
    });
  }

  const errorText = error
    ? (() => {
        const data = (error as AxiosError<{ message: string | string[]; details?: { message: string }[] }>).response?.data;
        if (data?.details?.length) return data.details.map(d => d.message).join(' · ');
        if (Array.isArray(data?.message)) return data.message.join(', ');
        return data?.message ?? 'Error al crear el alumno';
      })()
    : null;

  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>
        <Link to="/alumnos" style={styles.backLink}>← Alumnos</Link>
      </div>
      <h1 style={styles.title}>Nuevo alumno</h1>

      <div style={styles.card}>
        <AlumnoForm
          onSubmit={handleSubmit}
          error={errorText}
          isLoading={isPending}
          submitLabel="Crear alumno"
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 860 },
  breadcrumb: { marginBottom: 12 },
  backLink: { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  title: { margin: '0 0 24px', fontSize: 24, fontWeight: 700, color: '#0f172a' },
  card: { background: '#fff', borderRadius: 12, padding: '32px', border: '1px solid #e2e8f0' },
};
