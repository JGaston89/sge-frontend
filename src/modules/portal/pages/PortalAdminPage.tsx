import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, ExternalLink } from 'lucide-react';
import { portalAdminApi } from '../../../api/portal.api';

const CATEGORIA_BADGE: Record<string, string> = {
  noticia:    'bg-blue-100 text-blue-700',
  evento:     'bg-purple-100 text-purple-700',
  deporte:    'bg-green-100 text-green-700',
  logro:      'bg-yellow-100 text-yellow-700',
  comunicado: 'bg-orange-100 text-orange-700',
  general:    'bg-slate-100 text-slate-600',
};

export function PortalAdminPage() {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: noticias = [], isLoading } = useQuery({
    queryKey: ['portal', 'admin', 'noticias'],
    queryFn: portalAdminApi.getNoticias,
  });

  const togglePublicada = useMutation({
    mutationFn: ({ id, publicada }: { id: string; publicada: boolean }) =>
      portalAdminApi.updateNoticia(id, { publicada }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'admin', 'noticias'] }),
  });

  const toggleDestacada = useMutation({
    mutationFn: ({ id, destacada }: { id: string; destacada: boolean }) =>
      portalAdminApi.updateNoticia(id, { destacada }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'admin', 'noticias'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => portalAdminApi.deleteNoticia(id),
    onSuccess: () => {
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['portal', 'admin', 'noticias'] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Portal institucional</h1>
          <p className="text-slate-500 text-sm mt-1">Gestioná las noticias y novedades del portal público</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="h-4 w-4" /> Ver portal
          </a>
          <Link
            to="/portal/noticias/nueva"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva noticia
          </Link>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : noticias.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <p className="text-4xl mb-3">📰</p>
            <p className="font-medium">No hay noticias todavía</p>
            <p className="text-sm mt-1">Creá la primera noticia para que aparezca en el portal</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Título</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Categoría</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Publicada</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Destacada</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {noticias.map(n => (
                <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 line-clamp-1">{n.titulo}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{n.slug}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${CATEGORIA_BADGE[n.categoria] ?? CATEGORIA_BADGE.general}`}>
                      {n.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePublicada.mutate({ id: n.id, publicada: !n.publicada })}
                      className={`p-1.5 rounded-lg transition-colors ${n.publicada ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-slate-400 hover:bg-slate-100'}`}
                      title={n.publicada ? 'Despublicar' : 'Publicar'}
                    >
                      {n.publicada ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleDestacada.mutate({ id: n.id, destacada: !n.destacada })}
                      className={`p-1.5 rounded-lg transition-colors ${n.destacada ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' : 'text-slate-300 hover:bg-slate-100'}`}
                      title={n.destacada ? 'Quitar destacado' : 'Destacar'}
                    >
                      <Star className={`h-4 w-4 ${n.destacada ? 'fill-yellow-400' : ''}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {n.publicado_en
                      ? new Date(n.publicado_en).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-slate-300 italic">Borrador</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        to={`/portal/noticias/${n.id}/editar`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(n.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-slate-800 text-lg mb-2">¿Eliminar noticia?</h3>
            <p className="text-slate-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
