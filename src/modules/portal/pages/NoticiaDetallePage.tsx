import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Download, File, X, ZoomIn } from 'lucide-react';
import { useNoticiaDetalle, usePerfilInstitucional } from '../hooks/usePortal';

const IMG_MIME = new Set(['image/jpeg','image/png','image/gif','image/webp']);

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, nombre, onClose }: { url: string; nombre?: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/92 p-4"
      onClick={onClose}
    >
      {/* Barra superior */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-white/70 text-sm truncate max-w-sm">{nombre}</span>
        <div className="flex items-center gap-2">
          <a
            href={url}
            download={nombre}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            <Download className="h-4 w-4" /> Descargar
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Imagen */}
      <img
        src={url}
        alt={nombre}
        className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export function NoticiaDetallePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: noticia, isLoading, isError } = useNoticiaDetalle(slug);
  const { data: perfil } = usePerfilInstitucional();
  const [lightbox, setLightbox] = useState<{ url: string; nombre?: string } | null>(null);

  const primary = perfil?.color_primario ?? '#1e3a5f';

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-3/4" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-slate-200 rounded w-full" />)}
        </div>
      </div>
    );
  }

  if (isError || !noticia) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">Noticia no encontrada</h2>
        <p className="text-slate-500 mb-6">El contenido que buscás no existe o fue eliminado.</p>
        <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
      </div>
    );
  }

  const fecha = noticia.publicado_en
    ? new Date(noticia.publicado_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const autor = noticia.autor_nombre
    ? `${noticia.autor_nombre} ${noticia.autor_apellido ?? ''}`
    : null;

  const archivos         = noticia.archivos ?? [];
  const imagenesAdjuntas = archivos.filter(a => IMG_MIME.has(a.mime_type));
  const documentos       = archivos.filter(a => !IMG_MIME.has(a.mime_type));

  return (
    <>
      {lightbox && (
        <Lightbox url={lightbox.url} nombre={lightbox.nombre} onClose={() => setLightbox(null)} />
      )}

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a noticias
        </Link>

        {/* Categoría */}
        <div className="mb-4">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white capitalize"
            style={{ backgroundColor: primary }}
          >
            {noticia.categoria}
          </span>
        </div>

        {/* Título */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
          {noticia.titulo}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-8 pb-6 border-b border-slate-200">
          {fecha && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {fecha}
            </span>
          )}
          {autor && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" /> {autor}
            </span>
          )}
        </div>

        {/* Imagen de portada — clickeable, tamaño completo */}
        {noticia.imagen_url && (
          <div
            className="rounded-2xl overflow-hidden mb-8 shadow-md cursor-zoom-in relative group"
            onClick={() => setLightbox({ url: noticia.imagen_url!, nombre: noticia.titulo })}
          >
            <img
              src={noticia.imagen_url}
              alt={noticia.titulo}
              className="w-full"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" />
            </div>
          </div>
        )}

        {/* Resumen */}
        {noticia.resumen && (
          <p className="text-lg text-slate-600 leading-relaxed mb-6 font-medium italic border-l-4 pl-4"
             style={{ borderColor: primary }}>
            {noticia.resumen}
          </p>
        )}

        {/* Contenido */}
        <div
          className="prose prose-slate max-w-none text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: noticia.contenido }}
        />

        {/* Imágenes adjuntas — inline, clickeables */}
        {imagenesAdjuntas.length > 0 && (
          <div className="mt-10 space-y-4">
            {imagenesAdjuntas.map(img => (
              <div
                key={img.s3_key}
                className="rounded-2xl overflow-hidden shadow-sm border border-slate-100 cursor-zoom-in relative group"
                onClick={() => setLightbox({ url: img.url, nombre: img.nombre })}
              >
                <img src={img.url} alt={img.nombre} className="w-full" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" />
                </div>
                {img.nombre && (
                  <p className="text-xs text-slate-400 text-center py-2 bg-slate-50">{img.nombre}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Documentos descargables */}
        {documentos.length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" style={{ color: primary }} />
              Documentos adjuntos
            </h2>
            <div className="space-y-3">
              {documentos.map(doc => (
                <a
                  key={doc.s3_key}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={doc.nombre}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div
                    className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${primary}18` }}
                  >
                    <File className="h-5 w-5" style={{ color: primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors truncate">
                      {doc.nombre}
                    </p>
                    <p className="text-xs text-slate-400">{formatBytes(doc.tamano_bytes)}</p>
                  </div>
                  <Download className="h-4 w-4 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: primary }}
          >
            <ArrowLeft className="h-4 w-4" /> Ver todas las noticias
          </Link>
        </div>
      </article>
    </>
  );
}
