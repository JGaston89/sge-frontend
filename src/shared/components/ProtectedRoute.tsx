import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../store/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Cargando...
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Primer acceso: forzar cambio de contraseña antes de continuar
  if (user?.primer_acceso && location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />;
  }

  return <Outlet />;
}
