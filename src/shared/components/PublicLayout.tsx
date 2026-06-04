import { Outlet } from 'react-router-dom';
import { PublicHeader } from '../../modules/portal/components/PublicHeader';
import { PublicFooter } from '../../modules/portal/components/PublicFooter';
import { usePerfilInstitucional } from '../../modules/portal/hooks/usePortal';

export function PublicLayout() {
  const { data: perfil } = usePerfilInstitucional();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicHeader perfil={perfil} />
      <main className="flex-1 pt-16 lg:pt-20">
        <Outlet />
      </main>
      <PublicFooter perfil={perfil} />
    </div>
  );
}
