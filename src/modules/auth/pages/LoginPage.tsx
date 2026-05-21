import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthContext } from '../../../store/AuthContext';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const { login, error, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) navigate('/alumnos', { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <LoginForm
          onSubmit={(email, password) => login(email, password)}
          error={error}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 48px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
};
