import { MapPin, Phone, Mail, Globe, ExternalLink } from 'lucide-react';
import type { PerfilInstitucional } from '../../../api/portal.api';


interface Props {
  perfil: PerfilInstitucional | undefined;
}

export function PublicFooter({ perfil }: Props) {
  const primary = perfil?.color_primario ?? '#1e3a5f';
  const redes = perfil?.redes_sociales ?? {};

  return (
    <footer id="contacto" style={{ backgroundColor: primary }} className="text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Columna 1: institución */}
          <div>
            <h3 className="text-lg font-bold mb-3">{perfil?.nombre}</h3>
            {perfil?.motto && <p className="text-white/60 text-sm italic mb-4">{perfil.motto}</p>}
            {perfil?.descripcion && (
              <p className="text-white/70 text-sm leading-relaxed">{perfil.descripcion}</p>
            )}
          </div>

          {/* Columna 2: contacto */}
          <div>
            <h4 className="font-semibold mb-4 text-white/90">Contacto</h4>
            <ul className="space-y-3 text-sm text-white/70">
              {perfil?.domicilio && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-white/50" />
                  {perfil.domicilio}
                </li>
              )}
              {perfil?.telefono_contacto && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-white/50" />
                  <a href={`tel:${perfil.telefono_contacto}`} className="hover:text-white transition-colors">
                    {perfil.telefono_contacto}
                  </a>
                </li>
              )}
              {perfil?.email_contacto && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-white/50" />
                  <a href={`mailto:${perfil.email_contacto}`} className="hover:text-white transition-colors">
                    {perfil.email_contacto}
                  </a>
                </li>
              )}
              {perfil?.sitio_web && (
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-white/50" />
                  <a href={perfil.sitio_web} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    {perfil.sitio_web.replace(/^https?:\/\//, '')}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Columna 3: redes */}
          {Object.keys(redes).length > 0 && (
            <div>
              <h4 className="font-semibold mb-4 text-white/90">Redes sociales</h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(redes).map(([red, url]) => (
                    <a
                      key={red}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-sm transition-colors capitalize"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {red}
                    </a>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-white/40 text-xs">
          © {new Date().getFullYear()} {perfil?.nombre} — Sistema de Gestión Educativa
        </div>
      </div>
    </footer>
  );
}
