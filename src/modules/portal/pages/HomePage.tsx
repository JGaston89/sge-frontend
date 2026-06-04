import { useState, useEffect } from 'react';
import { Star, Search, Newspaper } from 'lucide-react';
import { usePerfilInstitucional, useNoticias } from '../hooks/usePortal';
import { NoticiaCard } from '../components/NoticiaCard';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=80',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&q=80',
  'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=1600&q=80',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&q=80',
];

const CATEGORIAS = [
  { value: '', label: 'Todas' },
  { value: 'noticia', label: 'Noticias' },
  { value: 'evento', label: 'Eventos' },
  { value: 'deporte', label: 'Deportes' },
  { value: 'logro', label: 'Logros' },
  { value: 'comunicado', label: 'Comunicados' },
];

export function HomePage() {
  const { data: perfil } = usePerfilInstitucional();
  const [categoria, setCategoria] = useState('');
  const [q, setQ] = useState('');
  const [heroIdx, setHeroIdx] = useState(0);
  const { data: noticias = [], isLoading } = useNoticias({ categoria: categoria || undefined, q: q || undefined });

  const primary   = perfil?.color_primario   ?? '#1e3a5f';
  const secondary = perfil?.color_secundario ?? '#f59e0b';

  const destacadas = noticias.filter(n => n.destacada).slice(0, 3);
  const resto      = noticias.filter(n => !n.destacada || destacadas.length === 0).slice(0, 8);

  // Ciclo automático de imágenes cada 5 segundos
  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[35vh] flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: primary }}
      >
        {/* Imágenes del carrusel — cross-fade con opacity */}
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${src})`,
              opacity: i === heroIdx ? 0.28 : 0,
            }}
          />
        ))}

        {/* Overlay oscuro para contraste del texto */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/30" />

        {/* Contenido centrado */}
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto py-12">
          {perfil?.logo_url && (
            <img
              src={perfil.logo_url}
              alt={perfil.nombre}
              className="h-16 w-16 object-contain mx-auto mb-4 drop-shadow-xl rounded-full bg-white/10 p-1.5"
            />
          )}
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-md">
            {perfil?.nombre ?? ''}
          </h1>
          {perfil?.motto && (
            <p className="text-base md:text-lg text-white/75 italic mt-3 font-light">
              {perfil.motto}
            </p>
          )}
        </div>

        {/* Indicadores del carrusel */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIdx(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === heroIdx ? '24px' : '8px',
                backgroundColor: i === heroIdx ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 48L60 40C120 32 240 16 360 12C480 8 600 16 720 20C840 24 960 24 1080 20C1200 16 1320 8 1380 4L1440 0V48H0Z" fill="#f8fafc"/>
          </svg>
        </div>
      </section>

      {/* ── Noticias ──────────────────────────────────────────────────── */}
      <section id="noticias" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* Header sección */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-5 w-5" style={{ color: secondary }} />
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Destacado</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Novedades institucionales</h2>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 pb-6 border-b border-slate-200">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIAS.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategoria(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  categoria === cat.value
                    ? 'text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
                style={categoria === cat.value ? { backgroundColor: primary } : {}}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 rounded-full border border-slate-200 text-sm focus:outline-none focus:border-slate-400 bg-white w-full sm:w-52"
            />
          </div>
        </div>

        {/* Grid destacadas */}
        {!isLoading && destacadas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {destacadas.map(n => <NoticiaCard key={n.id} noticia={n} destacada />)}
          </div>
        )}

        {/* Lista resto */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : resto.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 divide-y md:divide-y-0">
            {resto.map(n => <NoticiaCard key={n.id} noticia={n} />)}
          </div>
        ) : noticias.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Aún no hay noticias publicadas</p>
          </div>
        ) : null}
      </section>
    </>
  );
}
