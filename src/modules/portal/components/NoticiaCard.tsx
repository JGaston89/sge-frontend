import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import type { NoticiaCard as NoticiaCardType } from '../../../api/portal.api';

const CATEGORIA_COLORS: Record<string, string> = {
  noticia:    'bg-blue-100 text-blue-700',
  evento:     'bg-purple-100 text-purple-700',
  deporte:    'bg-green-100 text-green-700',
  logro:      'bg-yellow-100 text-yellow-700',
  comunicado: 'bg-orange-100 text-orange-700',
  general:    'bg-slate-100 text-slate-600',
};

interface Props {
  noticia: NoticiaCardType;
  destacada?: boolean;
}

export function NoticiaCard({ noticia, destacada = false }: Props) {
  const fecha = noticia.publicado_en
    ? new Date(noticia.publicado_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const autor = noticia.autor_nombre
    ? `${noticia.autor_nombre} ${noticia.autor_apellido ?? ''}`
    : null;

  if (destacada) {
    return (
      <Link
        to={`/noticias/${noticia.slug}`}
        className="group block rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        <div className="relative h-56 bg-slate-200 overflow-hidden">
          {noticia.imagen_url ? (
            <img
              src={noticia.imagen_url}
              alt={noticia.titulo}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
              <span className="text-4xl">📰</span>
            </div>
          )}
          <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold capitalize ${CATEGORIA_COLORS[noticia.categoria] ?? CATEGORIA_COLORS.general}`}>
            {noticia.categoria}
          </span>
        </div>
        <div className="p-5">
          <h3 className="font-bold text-slate-800 text-lg leading-snug group-hover:text-blue-700 transition-colors line-clamp-2 mb-2">
            {noticia.titulo}
          </h3>
          {noticia.resumen && (
            <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-3">{noticia.resumen}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fecha}</span>
            {autor && <span>• {autor}</span>}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/noticias/${noticia.slug}`}
      className="group flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors"
    >
      <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100">
        {noticia.imagen_url ? (
          <img src={noticia.imagen_url} alt={noticia.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">📰</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize mb-1 ${CATEGORIA_COLORS[noticia.categoria] ?? CATEGORIA_COLORS.general}`}>
          {noticia.categoria}
        </span>
        <h4 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
          {noticia.titulo}
        </h4>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <Calendar className="h-3 w-3" />{fecha}
        </p>
      </div>
    </Link>
  );
}
