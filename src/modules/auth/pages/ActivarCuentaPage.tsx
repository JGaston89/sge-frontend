import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../../api/auth.api';

type Estado = 'form' | 'exito' | 'error';

export function ActivarCuentaPage() {
  const [params] = useSearchParams();
  const token    = params.get('token') ?? '';

  const [password, setPassword]       = useState('');
  const [confirmar, setConfirmar]     = useState('');
  const [estado, setEstado]           = useState<Estado>('form');
  const [errorMsg, setErrorMsg]       = useState('');
  const [loading, setLoading]         = useState(false);

  const validarPassword = (): string | null => {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!/[A-Z]/.test(password)) return 'Debe contener al menos una letra mayúscula.';
    if (!/[a-z]/.test(password)) return 'Debe contener al menos una letra minúscula.';
    if (!/\d/.test(password)) return 'Debe contener al menos un número.';
    if (password !== confirmar) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('El enlace de activación no contiene un token válido.');
      setEstado('error');
      return;
    }
    const err = validarPassword();
    if (err) { setErrorMsg(err); return; }

    setLoading(true);
    setErrorMsg('');
    try {
      await authApi.activate(token, password);
      setEstado('exito');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'El enlace de activación es inválido o ya expiró.';
      setErrorMsg(msg);
      setEstado('error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h1 style={S.title}>Enlace inválido</h1>
          <p style={S.text}>Este enlace de activación no es válido. Solicitá uno nuevo a tu institución.</p>
          <Link to="/login" style={S.btn}>Ir al inicio de sesión</Link>
        </div>
      </div>
    );
  }

  if (estado === 'exito') {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.iconOk}>✓</div>
          <h1 style={S.title}>¡Cuenta activada!</h1>
          <p style={S.text}>Tu contraseña fue configurada correctamente. Ya podés iniciar sesión.</p>
          <Link to="/login" style={S.btn}>Iniciar sesión</Link>
        </div>
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.iconErr}>✗</div>
          <h1 style={S.title}>Enlace expirado</h1>
          <p style={S.text}>{errorMsg}</p>
          <p style={{ ...S.text, color: '#64748b', fontSize: 13 }}>
            Solicitá a un administrador que reenvíe el enlace de activación.
          </p>
          <Link to="/login" style={S.btn}>Ir al inicio de sesión</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>Activar cuenta</h1>
        <p style={S.text}>Establecé tu contraseña para acceder al sistema.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
          <label style={S.label}>
            Nueva contraseña
            <input
              type="password"
              style={S.input}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres, mayúscula y número"
              required
              autoFocus
            />
          </label>
          <label style={S.label}>
            Confirmar contraseña
            <input
              type="password"
              style={S.input}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repetí la contraseña"
              required
            />
          </label>

          {errorMsg && (
            <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{errorMsg}</p>
          )}

          <button type="submit" style={{ ...S.btn, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Activando...' : 'Activar mi cuenta'}
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
  page:   { minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:   { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '40px 36px', width: '100%', maxWidth: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  title:  { margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#0f172a' },
  text:   { margin: '0 0 16px', color: '#475569', fontSize: 15 },
  label:  { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:  { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' },
  btn:    { display: 'inline-block', marginTop: 8, padding: '12px 0', background: '#2563eb', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' },
  iconOk: { width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconErr:{ width: 52, height: 52, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  rules:  { marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, color: '#64748b', fontSize: 12, lineHeight: 1.8 },
};
