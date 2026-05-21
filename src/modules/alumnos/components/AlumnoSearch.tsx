import { useState, useEffect } from 'react';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import type { EstadoAlumno, QueryAlumnosDto } from '../../../shared/types/alumnos.types';

interface Props {
  onChange: (params: QueryAlumnosDto) => void;
}

export function AlumnoSearch({ onChange }: Props) {
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [estado, setEstado] = useState<EstadoAlumno | ''>('');

  const debouncedNombre = useDebounce(nombre);
  const debouncedDni = useDebounce(dni);

  useEffect(() => {
    const params: QueryAlumnosDto = {};
    if (debouncedNombre) params.nombre = debouncedNombre;
    if (debouncedDni) params.dni = debouncedDni;
    if (estado) params.estado = estado;
    onChange(params);
  }, [debouncedNombre, debouncedDni, estado, onChange]);

  return (
    <div style={styles.wrapper}>
      <input
        placeholder="Buscar por nombre..."
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        style={styles.input}
      />
      <input
        placeholder="DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
        style={{ ...styles.input, width: 140 }}
      />
      <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoAlumno | '')} style={styles.select}>
        <option value="">Todos los estados</option>
        <option value="activo">Activo</option>
        <option value="baja">Baja</option>
        <option value="egresado">Egresado</option>
      </select>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    flex: 1,
    minWidth: 180,
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    background: '#fff',
  },
};
