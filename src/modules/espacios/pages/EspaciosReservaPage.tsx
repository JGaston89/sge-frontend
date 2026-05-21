import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { espaciosApi } from '../../../api/espacios.api';
import type { CreateReservaEspacioDto } from '../../../shared/types/espacios.types';
import { TIPO_ESPACIO_LABEL } from '../../../shared/types/espacios.types';

export function EspaciosReservaPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  if (user?.roles?.includes('alumno')) return <Navigate to="/espacios" replace />;
  const espacioIdDefault = params.get('espacio_id') ?? '';

  const [form, setForm] = useState<CreateReservaEspacioDto & { espacio_id: string }>({
    espacio_id: espacioIdDefault,
    fecha: '', hora_inicio: '', hora_fin: '',
    nombre_evento: '', motivo: '',
  });

  const { data: espacios = [] } = useQuery({
    queryKey: ['espacios'],
    queryFn:  () => espaciosApi.getEspacios(),
  });

  const { data: disponibles = [], isLoading: loadDisponibles } = useQuery({
    queryKey: ['espacios-disponibles', form.fecha, form.hora_inicio, form.hora_fin],
    queryFn:  () => espaciosApi.getDisponibles({ fecha: form.fecha, hora_inicio: form.hora_inicio, hora_fin: form.hora_fin }),
    enabled:  !!(form.fecha && form.hora_inicio && form.hora_fin),
  });

  const reservaMutation = useMutation({
    mutationFn: ({ espacioId, dto }: { espacioId: string; dto: CreateReservaEspacioDto }) =>
      espaciosApi.createReserva(espacioId, dto),
    onSuccess: () => navigate('/espacios/mis-reservas'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.espacio_id || !form.fecha || !form.hora_inicio || !form.hora_fin) return;
    const { espacio_id, ...dto } = form;
    reservaMutation.mutate({
      espacioId: espacio_id,
      dto: {
        ...dto,
        nombre_evento: dto.nombre_evento || undefined,
        motivo:        dto.motivo        || undefined,
      },
    });
  }

  const espacioSeleccionado = espacios.find((e) => e.id === form.espacio_id);
  const estaDisponible = disponibles.some((e) => e.id === form.espacio_id);
  const conflicto = form.espacio_id && form.fecha && form.hora_inicio && form.hora_fin && !loadDisponibles && !estaDisponible;

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/espacios" style={S.back}>← Espacios</Link>
      </div>
      <h1 style={S.title}>Nueva reserva de espacio</h1>
      <p style={S.subtitle}>Seleccioná el espacio, fecha y horario</p>

      <div style={S.card}>
        <form onSubmit={handleSubmit}>
          {reservaMutation.isError && (
            <div style={S.errorBox}>
              {(reservaMutation.error as any)?.response?.data?.message ?? 'Error al crear la reserva.'}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <label style={S.label}>
              Fecha *
              <input required type="date" style={S.input} value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
            </label>
            <label style={S.label}>
              Hora inicio *
              <input required type="time" style={S.input} value={form.hora_inicio}
                onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))} />
            </label>
            <label style={S.label}>
              Hora fin *
              <input required type="time" style={S.input} value={form.hora_fin}
                onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))} />
            </label>
          </div>

          {/* Selector de espacio — muestra disponibles si hay fecha+hora */}
          <div style={{ marginTop: 14 }}>
            <label style={S.label}>
              Espacio *
              <select required style={S.input} value={form.espacio_id}
                onChange={(e) => setForm((f) => ({ ...f, espacio_id: e.target.value }))}>
                <option value="">Seleccionar espacio</option>
                {(form.fecha && form.hora_inicio && form.hora_fin ? disponibles : espacios).map((esp) => (
                  <option key={esp.id} value={esp.id}>
                    {esp.nombre} — {TIPO_ESPACIO_LABEL[esp.tipo]}{esp.capacidad ? ` (${esp.capacidad} personas)` : ''}
                  </option>
                ))}
              </select>
            </label>
            {form.fecha && form.hora_inicio && form.hora_fin && !loadDisponibles && (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                {disponibles.length} espacio{disponibles.length !== 1 ? 's' : ''} disponible{disponibles.length !== 1 ? 's' : ''} en ese horario
              </p>
            )}
            {conflicto && (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#dc2626' }}>
                ⚠ Este espacio ya tiene una reserva confirmada en ese horario.
              </p>
            )}
          </div>

          {/* Info del espacio seleccionado */}
          {espacioSeleccionado && (
            <div style={{ ...S.infoBox, marginTop: 14 }}>
              <strong>{espacioSeleccionado.nombre}</strong> · {TIPO_ESPACIO_LABEL[espacioSeleccionado.tipo]}
              {espacioSeleccionado.capacidad ? ` · ${espacioSeleccionado.capacidad} personas` : ''}
              {espacioSeleccionado.piso ? ` · ${espacioSeleccionado.piso}` : ''}
              {Array.isArray(espacioSeleccionado.equipamiento) && espacioSeleccionado.equipamiento.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                  Equipamiento: {espacioSeleccionado.equipamiento.join(', ')}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <label style={S.label}>
              Nombre del evento / clase
              <input style={S.input} value={form.nombre_evento ?? ''} placeholder="Ej: Química aplicada"
                onChange={(e) => setForm((f) => ({ ...f, nombre_evento: e.target.value }))} />
            </label>
            <label style={S.label}>
              Motivo
              <input style={S.input} value={form.motivo ?? ''} placeholder="Ej: Examen parcial"
                onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <Link to="/espacios" style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Cancelar
            </Link>
            <button type="submit"
              style={{ ...S.btnPrimary, opacity: (reservaMutation.isPending || !!conflicto) ? 0.6 : 1 }}
              disabled={reservaMutation.isPending || !!conflicto}>
              {reservaMutation.isPending ? 'Guardando...' : 'Confirmar reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 800 },
  back:        { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  title:       { margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle:    { margin: '0 0 20px', fontSize: 14, color: '#64748b' },
  card:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 },
  label:       { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:       { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:    { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  infoBox:     { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#0369a1' },
  btnPrimary:  { padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '10px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#374151' },
};
