import { useState } from 'react';
import { authApi } from '../../../api/auth.api';
import { useAuthContext } from '../../../store/AuthContext';
import type { AxiosError } from 'axios';

interface UseAuthReturn {
  login: (email: string, password: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

export function useAuth(): UseAuthReturn {
  const { saveTokens } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function login(email: string, password: string) {
    setError(null);
    setIsLoading(true);
    try {
      const instituciones = await authApi.getInstituciones();
      if (!instituciones.length) {
        setError('No hay instituciones configuradas en el sistema');
        return;
      }
      const result = await authApi.login({
        email,
        password,
        institucion_id: instituciones[0].id,
      });
      saveTokens(result.access_token, result.refresh_token);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string | string[]; ok?: boolean }>;
      if (axiosErr.response) {
        const msg = axiosErr.response.data?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Email o contraseña incorrectos'));
      } else {
        // Error de red o CORS — el servidor no respondió
        setError('No se pudo conectar con el servidor. Verificá que el backend esté activo.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return { login, error, isLoading };
}
