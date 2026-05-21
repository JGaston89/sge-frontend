import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import { useAuthContext } from '../../../store/AuthContext';
import type { ApiResponse } from '../../../shared/types/api.types';

export function CambiarPasswordPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuthContext();

  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validar = (): string | null => {
    if (form.nueva.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.';
    if (!/[A-Z]/.test(form.nueva)) return 'Debe contener al menos una letra mayúscula.';
    if (!/[a-z]/.test(form.nueva)) return 'Debe contener al menos una letra minúscula.';
    if (!/\d/.test(form.nueva)) return 'Debe contener al menos un número.';
    if (form.nueva !== form.confirmar) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validar();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      await apiClient.post<ApiResponse<void>>('/auth/update-password', {
        current_password: form.actual,
        new_password:     form.nueva,
      });
      // Refrescar el usuario para que primer_acceso sea false y el guard no redirija más
      await refreshUser();
      navigate('/', { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al cambiar la contraseña. Verificá tu contraseña actual.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>Cambiá tu contraseña</h1>
        <p style={S.text}>
          Es tu primer acceso al sistema. Por seguridad, establecé una contraseña personal antes de continuar.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
          <label style={S.label}>
            Contraseña actual
            <input
              type="password"
              style={S.input}
              value={form.actual}
              onChange={set('actual')}
              placeholder="Tu contraseña actual"
              required
              autoFocus
            />
          </label>
          <label style={S.label}>
            Nueva contraseña
            <input
              type="password"
              style={S.input}
              value={form.nueva}
              onChange={set('nueva')}
              placeholder="Mínimo 8 caracteres, mayúscula y número"
              required
            />
          </label>
          <label style={S.label}>
            Confirmar nueva contraseña
            <input
              type="password"
              style={S.input}
              value={form.confirmar}
              onChange={set('confirmar')}
              placeholder="Repetí la nueva contraseña"
              required
            />
          </label>

          {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}

          <button
            type="submit"
            style={{ ...S.btn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>

        <ul style={S.rules}>
          <li>Mínimo 8 caracteres</li>
          <li>Al menos una letra mayúscula</li>
          <li>Al menos una letra minúscula</li>
          <li>Al menos un número</li>
        </ul>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:  { minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:  { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '40px 36px', width: '100%', maxWidth: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  title: { margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#0f172a' },
  text:  { margin: '0 0 16px', color: '#475569', fontSize: 15 },
  label: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' },
  btn:   { marginTop: 8, padding: '12px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, textAlign: 'center' },
  rules: { marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, color: '#64748b', fontSize: 12, lineHeight: 1.8 },
};
