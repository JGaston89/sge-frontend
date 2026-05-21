import { useState, type FormEvent } from 'react';

interface Props {
  onSubmit: (code: string) => void;
  error: string | null;
  isLoading: boolean;
}

export function TwoFactorForm({ onSubmit, error, isLoading }: Props) {
  const [code, setCode] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(code);
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h1 style={styles.title}>Verificación en dos pasos</h1>
      <p style={styles.subtitle}>Ingresá el código de tu aplicación de autenticación</p>

      {error && <div style={styles.error}>{error}</div>}

      <label style={styles.label}>
        Código TOTP (6 dígitos)
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          style={styles.input}
          autoFocus
          required
        />
      </label>

      <button type="submit" style={styles.btn} disabled={isLoading || code.length !== 6}>
        {isLoading ? 'Verificando...' : 'Verificar'}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' },
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
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 8,
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
  },
};
