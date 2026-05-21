import { useState, type FormEvent } from 'react';

interface Props {
  onSubmit: (email: string, password: string) => void;
  error: string | null;
  isLoading: boolean;
}

export function LoginForm({ onSubmit, error, isLoading }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(email, password);
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h1 style={styles.title}>Iniciar sesión</h1>
      <p style={styles.subtitle}>Sistema de Gestión Educativa</p>

      {error && <div style={styles.error}>{error}</div>}

      <label style={styles.label}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
          autoFocus
        />
      </label>

      <label style={styles.label}>
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
      </label>

      <button type="submit" style={styles.btn} disabled={isLoading}>
        {isLoading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#1e293b' },
  subtitle: { margin: 0, color: '#64748b', fontSize: 14 },
  error: {
    background: '#fee2e2',
    color: '#b91c1c',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 14,
  },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#374151' },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 15,
    outline: 'none',
  },
  btn: {
    padding: '12px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
};
