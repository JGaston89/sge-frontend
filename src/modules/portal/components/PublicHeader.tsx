import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, GraduationCap, LogIn } from 'lucide-react';
import type { PerfilInstitucional } from '../../../api/portal.api';

interface Props {
  perfil: PerfilInstitucional | undefined;
}

export function PublicHeader({ perfil }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Inicio' },
    { to: '/noticias', label: 'Noticias' },
    { to: '#contacto', label: 'Contacto' },
  ];

  const primary = perfil?.color_primario ?? '#1e3a5f';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-lg' : ''
      }`}
      style={{ backgroundColor: primary }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo + nombre */}
          <Link to="/" className="flex items-center gap-3 group">
            {perfil?.logo_url ? (
              <img
                src={perfil.logo_url}
                alt={perfil.nombre}
                className="h-10 w-10 object-contain rounded-full bg-white/10 p-1"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-white font-bold text-sm lg:text-base leading-tight">
                {perfil?.nombre ?? 'Cargando...'}
              </p>
              {perfil?.motto && (
                <p className="text-white/60 text-xs italic leading-tight">{perfil.motto}</p>
              )}
            </div>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/login"
              className="ml-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Ingresar
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menú"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 px-4 pb-4 pt-2 flex flex-col gap-1" style={{ backgroundColor: primary }}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="px-4 py-3 rounded-lg text-white/90 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/login"
            className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/15 text-white text-sm font-semibold"
          >
            <LogIn className="h-4 w-4" /> Ingresar al sistema
          </Link>
        </div>
      )}
    </header>
  );
}
