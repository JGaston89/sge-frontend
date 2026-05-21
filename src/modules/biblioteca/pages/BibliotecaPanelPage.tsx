import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { bibliotecaApi } from '../../../api/biblioteca.api';
import { docentesApi } from '../../../api/docentes.api';
import type { CreateMaterialEstudioDto } from '../../../shared/types/biblioteca.types';
import { apiClient } from '../../../api/client';
import type { ApiResponse } from '../../../shared/types/api.types';

interface Curso   { id: string; nombre: string; }
interface Materia { id: string; nombre: string; }

const EMPTY: CreateMaterialEstudioDto = { titulo: '', docente_id: '', curso_id: '', materia_id: '', temas: '', descripcion: '' };

export function BibliotecaPanelPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const [form, setForm] = useState<CreateMaterialEstudioDto>(EMPTY);

  const { data: material, isLoading: loadingMaterial } = useQuery({
    queryKey: ['biblioteca', id],
    queryFn:  () => bibliotecaApi.getMaterial(id!),
    enabled:  isEdit,
  });

  useEffect(() => {
    if (material) {
      setForm({
        titulo:      material.titulo       ?? '',
        docente_id:  material.docente_id   ?? '',
        curso_id:    material.curso_id     ?? '',
        materia_id:  material.materia_id   ?? '',
        temas:       material.temas        ?? '',
        descripcion: material.descripcion  ?? '',
      });
    }
  }, [material]);

  const { data: docentes = [] } = useQuery({
    queryKey: ['docentes-activos'],
    queryFn:  () => docentesApi.getAll({ estado: 'activo' }),
  });

  const { data: cursos = [] } = useQuery<Curso[]>({
    queryKey: ['cursos-lista'],
    queryFn:  () => apiClient.get<ApiResponse<Curso[]>>('/calificaciones/cursos').then((r) => r.data.data),
  });

  const { data: materias = [] } = useQuery<Materia[]>({
    queryKey: ['materias-lista'],
    queryFn:  () => apiClient.get<ApiResponse<Materia[]>>('/calificaciones/materias').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateMaterialEstudioDto) => bibliotecaApi.createMaterial(dto),
    onSuccess: (m) => { qc.invalidateQueries({ queryKey: ['biblioteca'] }); navigate(`/biblioteca/${m.id}`); },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: CreateMaterialEstudioDto) => bibliotecaApi.updateMaterial(id!, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biblioteca', id] }); qc.invalidateQueries({ queryKey: ['biblioteca'] }); navigate(`/biblioteca/${id}`); },
  });

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo', 'docente'].includes(r));
  if (noEsStaff) return <Navigate to="/biblioteca" replace />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    const dto: CreateMaterialEstudioDto = {
      titulo:      form.titulo.trim(),
      docente_id:  form.docente_id  || undefined,
      curso_id:    form.curso_id    || undefined,
      materia_id:  form.materia_id  || undefined,
      temas:       form.temas       || undefined,
      descripcion: form.descripcion || undefined,
    };
    isEdit ? updateMutation.mutate(dto) : createMutation.mutate(dto);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isError   = createMutation.isError   || updateMutation.isError;

  if (isEdit && loadingMaterial) return <p style={{ color: '#94a3b8', padding: 40 }}>Cargando...</p>;

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to={isEdit ? `/biblioteca/${id}` : '/biblioteca'} style={S.back}>
          ← {isEdit ? 'Volver al material' : 'Biblioteca'}
        </Link>
      </div>
      <h1 style={S.title}>{isEdit ? 'Editar material' : 'Nuevo material de estudio'}</h1>
      <p style={S.subtitle}>Completá los datos del recurso educativo</p>

      <div style={S.card}>
        <form onSubmit={handleSubmit}>
          {isError && <div style={S.errorBox}>Error al guardar el material.</div>}

          <label style={S.label}>
            Título *
            <input required style={S.input} value={form.titulo}
              placeholder="Ej: Guía de estudio Matemáticas II"
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
            <label style={S.label}>
              Docente
              <select style={S.input} value={form.docente_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, docente_id: e.target.value || undefined }))}>
                <option value="">Sin asignar</option>
                {docentes.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>
                ))}
              </select>
            </label>
            <label style={S.label}>
              Curso
              <select style={S.input} value={form.curso_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, curso_id: e.target.value || undefined }))}>
                <option value="">Sin asignar</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
            <label style={S.label}>
              Materia
              <select style={S.input} value={form.materia_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, materia_id: e.target.value || undefined }))}>
                <option value="">Sin asignar</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ ...S.label, marginTop: 14 }}>
            Temas del examen
            <textarea style={{ ...S.input, minHeight: 60, resize: 'vertical' }}
              value={form.temas ?? ''}
              placeholder="Ej: Derivadas, integrales, límites..."
              onChange={(e) => setForm((f) => ({ ...f, temas: e.target.value }))} />
          </label>

          <label style={{ ...S.label, marginTop: 14 }}>
            Descripción
            <textarea style={{ ...S.input, minHeight: 60, resize: 'vertical' }}
              value={form.descripcion ?? ''}
              placeholder="Descripción adicional del material..."
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <Link to={isEdit ? `/biblioteca/${id}` : '/biblioteca'}
              style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Cancelar
            </Link>
            <button type="submit" style={{ ...S.btnPrimary, opacity: isPending ? 0.6 : 1 }} disabled={isPending}>
              {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear material'}
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
  title:       { margin: '8px 0 4px', fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle:    { margin: '0 0 20px', fontSize: 14, color: '#64748b' },
  card:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 },
  label:       { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:       { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:    { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  btnPrimary:  { padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '10px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#374151' },
};
