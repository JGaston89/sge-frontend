import { useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bibliotecaApi } from '../../../api/biblioteca.api';
import type { ArchivoEstudio } from '../../../shared/types/biblioteca.types';

function fmtBytes(b: number | null) {
  if (!b) return '';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function BibliotecaFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTitle, setUploadingTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: material, isLoading } = useQuery({
    queryKey: ['biblioteca', id],
    queryFn:  () => bibliotecaApi.getMaterial(id!),
    enabled:  !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => bibliotecaApi.deleteMaterial(id!),
    onSuccess: () => navigate('/biblioteca'),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, titulo }: { file: File; titulo: string }) =>
      bibliotecaApi.uploadArchivo(id!, file, titulo || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biblioteca', id] });
      qc.invalidateQueries({ queryKey: ['biblioteca'] });
      setSelectedFile(null);
      setUploadingTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const deleteArchivoMutation = useMutation({
    mutationFn: (archivoId: string) => bibliotecaApi.deleteArchivo(archivoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biblioteca', id] });
      qc.invalidateQueries({ queryKey: ['biblioteca'] });
    },
  });

  const getUrlMutation = useMutation({
    mutationFn: (archivoId: string) => bibliotecaApi.getArchivoUrl(archivoId),
    onSuccess: ({ url }) => window.open(url, '_blank'),
  });

  if (isLoading) return <p style={{ color: '#94a3b8', padding: 40 }}>Cargando...</p>;
  if (!material) return <p style={{ color: '#ef4444', padding: 40 }}>Material no encontrado.</p>;

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/biblioteca" style={S.back}>← Biblioteca</Link>
      </div>

      <div style={S.header}>
        <div>
          <h1 style={S.title}>{material.titulo}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {material.docente_nombre && <span style={S.chip}>Docente: {material.docente_nombre}</span>}
            {material.curso_nombre   && <span style={S.chip}>Curso: {material.curso_nombre}</span>}
            {material.materia_nombre && <span style={S.chip}>Materia: {material.materia_nombre}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/biblioteca/${id}/editar`} style={{ ...S.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Editar
          </Link>
          <button
            style={{ ...S.btnDanger }}
            onClick={() => { if (window.confirm('¿Eliminar este material y todos sus archivos?')) deleteMutation.mutate(); }}
            disabled={deleteMutation.isPending}
          >
            Eliminar
          </button>
        </div>
      </div>

      {(material.temas || material.descripcion) && (
        <div style={S.card}>
          {material.temas && (
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>
              <strong>Temas del examen:</strong> {material.temas}
            </p>
          )}
          {material.descripcion && (
            <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>{material.descripcion}</p>
          )}
        </div>
      )}

      {/* Archivos */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <h3 style={S.sectionTitle}>Archivos PDF ({material.archivos.length})</h3>

        {material.archivos.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>No hay archivos subidos aún.</p>
        )}

        {material.archivos.map((a: ArchivoEstudio) => (
          <div key={a.id} style={S.archivoRow}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                {a.titulo_archivo || a.nombre_original}
              </div>
              {a.titulo_archivo && (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.nombre_original}</div>
              )}
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {fmtBytes(a.tamano_bytes)} · {fmtDate(a.created_at)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                style={{ ...S.btnSmall, color: '#2563eb' }}
                onClick={() => getUrlMutation.mutate(a.id)}
                disabled={getUrlMutation.isPending}
              >
                Ver PDF
              </button>
              <button
                style={{ ...S.btnSmall, color: '#ef4444' }}
                onClick={() => { if (window.confirm('¿Eliminar este archivo?')) deleteArchivoMutation.mutate(a.id); }}
                disabled={deleteArchivoMutation.isPending}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {/* Subir nuevo archivo */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 8 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Subir archivo</h4>
          {uploadMutation.isError && (
            <div style={S.errorBox}>Error al subir el archivo. Verificá que sea un PDF de máximo 20 MB.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <label style={S.label}>
              Archivo PDF *
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={S.input}
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label style={S.label}>
              Título del archivo (opcional)
              <input
                style={S.input}
                value={uploadingTitle}
                placeholder="Ej: Guía de estudio unidad 3"
                onChange={(e) => setUploadingTitle(e.target.value)}
              />
            </label>
          </div>
          <button
            style={{ ...S.btnPrimary, opacity: (!selectedFile || uploadMutation.isPending) ? 0.6 : 1 }}
            disabled={!selectedFile || uploadMutation.isPending}
            onClick={() => selectedFile && uploadMutation.mutate({ file: selectedFile, titulo: uploadingTitle })}
          >
            {uploadMutation.isPending ? 'Subiendo...' : 'Subir PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:         { maxWidth: 900 },
  back:         { color: '#2563eb', textDecoration: 'none', fontSize: 14 },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title:        { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' },
  chip:         { fontSize: 12, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20, border: '1px solid #e2e8f0' },
  card:         { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 },
  sectionTitle: { margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' },
  archivoRow:   { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  label:        { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#374151', fontWeight: 500 },
  input:        { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  errorBox:     { background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
  btnPrimary:   { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' },
  btnDanger:    { padding: '8px 16px', background: '#fff', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  btnSmall:     { padding: '5px 12px', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
};
