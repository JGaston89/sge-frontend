import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Eye, Upload, X, File, ImagePlus, Paperclip, AlertCircle } from 'lucide-react';
import { portalAdminApi, type NoticiaArchivo } from '../../../api/portal.api';

const CATEGORIAS   = ['noticia','evento','deporte','logro','comunicado','general'];
const IMG_MIME     = new Set(['image/jpeg','image/png','image/gif','image/webp']);
const DOC_MIME     = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const MAX_IMG_MB  = 50;
const MAX_DOC_MB  = 10;

interface FormState {
  titulo: string;
  resumen: string;
  contenido: string;
  imagen_url: string;
  categoria: string;
  destacada: boolean;
  publicada: boolean;
  archivos: NoticiaArchivo[];
}

const EMPTY: FormState = {
  titulo: '', resumen: '', contenido: '', imagen_url: '',
  categoria: 'general', destacada: false, publicada: false, archivos: [],
};

// ── Zona de drop reutilizable ─────────────────────────────────────────────────

function DropZone({
  label, hint, accept, multiple = false, uploading, progress, onFiles,
}: {
  label: string;
  hint?: string;
  accept: string;
  multiple?: boolean;
  uploading: boolean;
  progress?: number;
  onFiles: (files: FileList) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
        }}
        className={`w-full border-2 border-dashed rounded-xl py-6 px-4 text-center transition-colors
          ${over ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}
          ${uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={e => {
            if (e.target.files?.length) { onFiles(e.target.files); e.target.value = ''; }
          }}
        />
        <Upload className="h-6 w-6 mx-auto mb-1.5 text-slate-400" />
        <p className="text-sm text-slate-500">{uploading ? 'Subiendo...' : label}</p>
        <p className="text-xs text-slate-400 mt-0.5">o arrastrá el archivo aquí</p>
      </button>

      {uploading && progress !== undefined && (
        <div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{progress}%</p>
        </div>
      )}

      {hint && !uploading && (
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <AlertCircle className="h-3 w-3 shrink-0" /> {hint}
        </p>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function NoticiaEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [form, setForm]         = useState<FormState>(EMPTY);
  const [preview, setPreview]   = useState(false);
  const [imgUploading, setImgUploading]   = useState(false);
  const [imgProgress, setImgProgress]     = useState(0);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadError, setUploadError]     = useState<string | null>(null);

  const { data: existing } = useQuery({
    queryKey: ['portal', 'admin', 'noticia', id],
    queryFn: () => portalAdminApi.getNoticia(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        titulo:    existing.titulo,
        resumen:   existing.resumen ?? '',
        contenido: existing.contenido,
        imagen_url: existing.imagen_url ?? '',
        categoria: existing.categoria,
        destacada: existing.destacada,
        publicada: existing.publicada,
        archivos:  existing.archivos ?? [],
      });
    }
  }, [existing]);

  const set = (field: keyof FormState, value: string | boolean | NoticiaArchivo[]) =>
    setForm(f => ({ ...f, [field]: value }));

  // ── Validación cliente antes de subir ─────────────────────────────────────

  function validateFile(file: File): string | null {
    const isImg = file.type.startsWith('image/');
    const isDoc = DOC_MIME.has(file.type);
    if (!isImg && !isDoc) {
      return `"${file.name}": tipo no permitido. Solo JPG, PNG, GIF, WEBP, PDF, Word o Excel.`;
    }
    if (isImg && file.size > MAX_IMG_MB * 1024 * 1024) {
      return `"${file.name}": la imagen supera los ${MAX_IMG_MB} MB.`;
    }
    if (isDoc && file.size > MAX_DOC_MB * 1024 * 1024) {
      return `"${file.name}": el documento supera los ${MAX_DOC_MB} MB. Peso actual: ${(file.size / (1024 * 1024)).toFixed(1)} MB.`;
    }
    return null;
  }

  // ── Upload de imagen de portada ───────────────────────────────────────────

  async function handleCoverUpload(files: FileList) {
    const file = files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setUploadError(err); return; }

    setUploadError(null);
    setImgUploading(true);
    setImgProgress(0);
    try {
      const result = await portalAdminApi.uploadFile(file, pct => setImgProgress(pct));
      set('imagen_url', result.url);
    } catch (e: any) {
      setUploadError(e.message ?? 'No se pudo subir la imagen.');
    } finally {
      setImgUploading(false);
    }
  }

  // ── Upload de archivos adjuntos ───────────────────────────────────────────

  async function handleAttachmentUpload(files: FileList) {
    const fileArr = Array.from(files);
    for (const f of fileArr) {
      const err = validateFile(f);
      if (err) { setUploadError(err); return; }
    }
    setUploadError(null);
    setFileUploading(true);
    try {
      const uploads = await Promise.all(fileArr.map(f => portalAdminApi.uploadFile(f)));
      set('archivos', [...form.archivos, ...uploads]);
    } catch (e: any) {
      setUploadError(e.message ?? 'No se pudo subir uno o más archivos.');
    } finally {
      setFileUploading(false);
    }
  }

  function removeArchivo(s3Key: string) {
    set('archivos', form.archivos.filter(a => a.s3_key !== s3Key));
  }

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? portalAdminApi.updateNoticia(id!, form)
        : portalAdminApi.createNoticia(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'admin', 'noticias'] });
      navigate('/portal');
    },
  });

  const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/portal')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Editar noticia' : 'Nueva noticia'}</h1>
            <p className="text-sm text-slate-500">Portal institucional público</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPreview(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
          >
            <Eye className="h-4 w-4" /> {preview ? 'Editar' : 'Vista previa'}
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.titulo || !form.contenido}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" /> {save.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {preview ? (
        /* ── Vista previa ─────────────────────────────────────────────── */
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          {form.imagen_url && (
            <img src={form.imagen_url} alt={form.titulo} className="w-full rounded-xl mb-6" />
          )}
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
            {form.categoria}
          </span>
          <h1 className="text-3xl font-bold text-slate-900 mt-4 mb-2">{form.titulo || 'Título de la noticia'}</h1>
          {form.resumen && (
            <p className="text-lg text-slate-600 italic border-l-4 border-blue-500 pl-4 mb-6">{form.resumen}</p>
          )}
          <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: form.contenido.replace(/\n/g, '<br>') }} />
          {form.archivos.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Archivos adjuntos
              </h3>
              <div className="space-y-2">
                {form.archivos.map(a => (
                  <a key={a.s3_key} href={a.url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-blue-600">
                    <File className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{a.nombre}</span>
                    <span className="text-xs text-slate-400 shrink-0">{(a.tamano_bytes / 1024).toFixed(0)} KB</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Formulario ───────────────────────────────────────────────── */
        <div className="space-y-5">

          {/* Banner de error de upload */}
          {uploadError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">{uploadError}</div>
              <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">

            <div>
              <label className={labelCls}>Título *</label>
              <input className={inputCls} value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Título de la noticia" />
            </div>

            <div>
              <label className={labelCls}>Resumen <span className="text-slate-400 font-normal">(opcional — aparece en las cards)</span></label>
              <textarea className={inputCls} rows={2} value={form.resumen} onChange={e => set('resumen', e.target.value)} placeholder="Breve descripción..." />
            </div>

            <div>
              <label className={labelCls}>Contenido * <span className="text-slate-400 font-normal">(acepta HTML básico)</span></label>
              <textarea className={inputCls} rows={12} value={form.contenido} onChange={e => set('contenido', e.target.value)} placeholder="Escribí el contenido completo de la noticia..." />
            </div>

            {/* Imagen de portada */}
            <div>
              <label className={labelCls}>
                <ImagePlus className="inline h-4 w-4 mr-1.5 mb-0.5" />
                Imagen de portada
              </label>

              {form.imagen_url ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={form.imagen_url} alt="Portada" className="w-full" />
                  <button
                    type="button"
                    onClick={() => set('imagen_url', '')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <DropZone
                  label={`Subir imagen de portada (JPG, PNG, GIF, WEBP — máx. ${MAX_IMG_MB} MB)`}
                  hint={`El sistema redimensiona automáticamente a máx. 1920×1080 px. Podés subir hasta ${MAX_IMG_MB} MB.`}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  uploading={imgUploading}
                  progress={imgProgress}
                  onFiles={handleCoverUpload}
                />
              )}
            </div>

            {/* Archivos adjuntos */}
            <div>
              <label className={labelCls}>
                <Paperclip className="inline h-4 w-4 mr-1.5 mb-0.5" />
                Archivos adjuntos
              </label>

              {form.archivos.length > 0 && (
                <div className="mb-3 space-y-2">
                  {form.archivos.map(a => {
                    const isImg = IMG_MIME.has(a.mime_type);
                    return (
                      <div key={a.s3_key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                        {isImg ? (
                          <img src={a.url} alt={a.nombre} className="h-10 w-10 rounded object-cover shrink-0" />
                        ) : (
                          <File className="h-5 w-5 text-slate-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{a.nombre}</p>
                          <p className="text-xs text-slate-400">{(a.tamano_bytes / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeArchivo(a.s3_key)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <DropZone
                label="Agregar archivos adjuntos (imágenes, PDF, Word, Excel)"
                hint={`Documentos (PDF, Word, Excel): máx. ${MAX_DOC_MB} MB por archivo. Imágenes: máx. ${MAX_IMG_MB} MB (se redimensionan automáticamente).`}
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple
                uploading={fileUploading}
                onFiles={handleAttachmentUpload}
              />
            </div>
          </div>

          {/* Opciones de publicación */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-700 mb-4">Opciones de publicación</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div>
                <label className={labelCls}>Categoría</label>
                <select className={inputCls} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                  {CATEGORIAS.map(c => (
                    <option key={c} value={c} className="capitalize">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={form.publicada} onChange={e => set('publicada', e.target.checked)} className="h-4 w-4 rounded text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Publicada</p>
                  <p className="text-xs text-slate-400">Visible en el portal</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={form.destacada} onChange={e => set('destacada', e.target.checked)} className="h-4 w-4 rounded text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Destacada</p>
                  <p className="text-xs text-slate-400">Aparece en grilla principal</p>
                </div>
              </label>
            </div>
          </div>

          {save.isError && (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
              Ocurrió un error al guardar. Verificá los datos e intentá de nuevo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
