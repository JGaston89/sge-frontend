import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  GraduationCap,
  Users,
  ClipboardList,
  BookOpen,
  CalendarCheck,
  UserPlus,
  CalendarDays,
  FileText,
  Calendar,
  Trophy,
  Users2,
  UserCheck,
  Clipboard,
  Building2,
  Library,
  ShieldCheck,
  MessageCircle,
  AlertTriangle,
  Mail,
  Newspaper,
  ChevronDown,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuthContext } from '../../store/AuthContext';
import { comunicacionApi } from '../../api/comunicacion.api';

// ─── Tipos ───────────────────────────────────────────────────

interface NavItemDef {
  to: string;
  label: string;
  Icon: LucideIcon;
  hiddenFor?: string[];
  badge?: boolean;
}

interface NavGroupDef {
  key: string;
  label: string;
  Icon: LucideIcon;
  defaultOpen: boolean;
  items: NavItemDef[];
}

// ─── Estructura del menú ──────────────────────────────────────

const GROUPS: NavGroupDef[] = [
  {
    key: 'gestion',
    label: 'Gestión Académica',
    Icon: GraduationCap,
    defaultOpen: true,
    items: [
      { to: '/alumnos',        label: 'Alumnos',         Icon: Users,         hiddenFor: ['docente', 'alumno'] },
      { to: '/inscripciones',  label: 'Inscripciones',   Icon: ClipboardList, hiddenFor: ['docente', 'alumno'] },
      { to: '/calificaciones', label: 'Calificaciones',  Icon: BookOpen },
      { to: '/asistencias',    label: 'Asistencias',     Icon: CalendarCheck },
      { to: '/alta-academica', label: 'Alta Académica',  Icon: UserPlus,      hiddenFor: ['docente', 'alumno'] },
    ],
  },
  {
    key: 'planificacion',
    label: 'Planificación',
    Icon: CalendarDays,
    defaultOpen: false,
    items: [
      { to: '/planificacion', label: 'Planificación',    Icon: FileText, hiddenFor: ['alumno'] },
      { to: '/calendario',    label: 'Calendario',       Icon: Calendar },
      { to: '/examenes',      label: 'Mesas de examen',  Icon: Trophy },
    ],
  },
  {
    key: 'recursos',
    label: 'Recursos y Personal',
    Icon: Users2,
    defaultOpen: false,
    items: [
      { to: '/docentes',        label: 'Docentes',        Icon: UserCheck,  hiddenFor: ['docente', 'alumno'] },
      { to: '/administrativos', label: 'Administrativos', Icon: Clipboard,  hiddenFor: ['docente', 'alumno'] },
      { to: '/espacios',        label: 'Espacios',        Icon: Building2 },
      { to: '/biblioteca',      label: 'Biblioteca',      Icon: Library },
      { to: '/usuarios',        label: 'Usuarios',        Icon: ShieldCheck, hiddenFor: ['docente', 'alumno'] },
    ],
  },
  {
    key: 'portal',
    label: 'Portal Institucional',
    Icon: Newspaper,
    defaultOpen: false,
    items: [
      { to: '/portal', label: 'Noticias & Portal', Icon: Newspaper, hiddenFor: ['docente', 'alumno'] },
    ],
  },
  {
    key: 'comunicacion',
    label: 'Comunicación y Alertas',
    Icon: MessageCircle,
    defaultOpen: false,
    items: [
      { to: '/alertas',     label: 'Alertas de riesgo', Icon: AlertTriangle },
      { to: '/comunicacion', label: 'Comunicación',     Icon: Mail, badge: true },
    ],
  },
];

// ─── Props ───────────────────────────────────────────────────

export interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Componente ───────────────────────────────────────────────

export function Sidebar({ isMobile, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthContext();
  const location = useLocation();
  const userRoles: string[] = user?.roles ?? [];

  const { data: noLeidas = 0 } = useQuery({
    queryKey: ['circulares'],
    queryFn:  comunicacionApi.getCirculares,
    staleTime: 60_000,
    select: (data) => data.filter(c => !c.visto).length,
  });

  // Estado de secciones abiertas/cerradas
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of GROUPS) {
      const hasActive = g.items.some(item => location.pathname.startsWith(item.to));
      init[g.key] = g.defaultOpen || hasActive;
    }
    return init;
  });

  // Key del elemento hovered (para hover effect sin CSS :hover)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Auto-abrir la sección que contiene la ruta activa al navegar
  useEffect(() => {
    setOpenGroups(prev => {
      const next = { ...prev };
      for (const g of GROUPS) {
        if (g.items.some(item => location.pathname.startsWith(item.to))) {
          next[g.key] = true;
        }
      }
      return next;
    });
  }, [location.pathname]);

  function toggleGroup(key: string) {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function isHidden(item: NavItemDef) {
    return item.hiddenFor?.some(r => userRoles.includes(r)) ?? false;
  }

  const asideStyle: React.CSSProperties = {
    ...S.aside,
    ...(isMobile ? {
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      zIndex: 100,
      overflowY: 'auto',
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.25s ease',
    } : {}),
  };

  return (
    <aside style={asideStyle}>

      {/* ── Logo ─────────────────────────────────────── */}
      <div style={S.logoArea}>
        <div style={S.logoWrap}>
          <span style={S.logoSge}>SGE</span>
          <span style={S.logoSub}>Sistema de Gestión Escolar</span>
        </div>
        {isMobile && (
          <button style={S.closeBtn} onClick={onClose} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        )}
      </div>
      <div style={S.divider} />

      {/* ── Navegación ───────────────────────────────── */}
      <nav style={S.nav}>

        {/* Inicio */}
        <NavLink
          to="/"
          end
          style={({ isActive }) => ({
            ...S.homeLink,
            ...(isActive ? S.linkActive : hoveredKey === '__home' ? S.linkHover : {}),
          })}
          onMouseEnter={() => setHoveredKey('__home')}
          onMouseLeave={() => setHoveredKey(null)}
          onClick={isMobile ? onClose : undefined}
        >
          <Home size={16} />
          Inicio
        </NavLink>

        {/* Grupos acordeón */}
        {GROUPS.map(group => {
          const visibleItems = group.items.filter(item => !isHidden(item));
          if (visibleItems.length === 0) return null;

          const isOpen = openGroups[group.key];
          const GroupIcon = group.Icon;
          const hKey = `__g_${group.key}`;

          return (
            <div key={group.key} style={S.groupWrap}>

              {/* Header de sección */}
              <button
                style={{
                  ...S.groupHeader,
                  ...(hoveredKey === hKey ? S.groupHeaderHover : {}),
                }}
                onClick={() => toggleGroup(group.key)}
                onMouseEnter={() => setHoveredKey(hKey)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <GroupIcon size={13} style={{ flexShrink: 0 }} />
                <span style={S.groupLabel}>{group.label}</span>
                <ChevronDown
                  size={13}
                  style={{
                    flexShrink: 0,
                    transition: 'transform 0.2s ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {/* Ítems del grupo */}
              {isOpen && (
                <div>
                  {visibleItems.map(item => {
                    const ItemIcon = item.Icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        style={({ isActive }) => ({
                          ...S.navLink,
                          ...(isActive ? S.linkActive : hoveredKey === item.to ? S.linkHover : {}),
                        })}
                        onMouseEnter={() => setHoveredKey(item.to)}
                        onMouseLeave={() => setHoveredKey(null)}
                        onClick={isMobile ? onClose : undefined}
                      >
                        <ItemIcon size={15} style={{ flexShrink: 0, opacity: 0.85 }} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge && noLeidas > 0 && (
                          <span style={S.badge}>{noLeidas}</span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ───────────────────────────────────── */}
      <div style={S.footer}>
        <span style={S.userName}>{user?.nombre} {user?.apellido}</span>
        <span style={S.userRole}>{user?.roles?.[0]}</span>
        <button style={S.logoutBtn} onClick={logout}>Cerrar sesión</button>
      </div>
    </aside>
  );
}

// ─── Estilos ──────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  aside: {
    width: 240,
    minHeight: '100vh',
    background: '#1e293b',
    color: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },

  // Logo
  logoArea: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 20px 16px',
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  logoSge: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 3,
    color: '#38bdf8',
    lineHeight: 1,
  },
  logoSub: {
    fontSize: 10,
    color: '#64748b',
    letterSpacing: 0.2,
    lineHeight: 1.4,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    borderRadius: 4,
  },
  divider: {
    height: 1,
    background: '#334155',
    margin: '0 16px 8px',
  },

  // Nav
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0 8px',
  },

  // Inicio (standalone)
  homeLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px',
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: 14,
    borderLeft: '3px solid transparent',
    transition: 'background 0.12s, color 0.12s',
    marginBottom: 4,
  },

  // Grupo
  groupWrap: {
    marginTop: 4,
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    width: '100%',
    padding: '7px 20px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'color 0.12s, background 0.12s',
  },
  groupHeaderHover: {
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.03)',
  },
  groupLabel: {
    flex: 1,
  },

  // Ítems de nav
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 20px 9px 30px',
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: 13.5,
    borderLeft: '3px solid transparent',
    transition: 'background 0.12s, color 0.12s',
  },

  // Estados
  linkActive: {
    color: '#38bdf8',
    borderLeftColor: '#38bdf8',
    background: 'rgba(56,189,248,0.08)',
  },
  linkHover: {
    color: '#e2e8f0',
    background: 'rgba(255,255,255,0.05)',
  },

  // Badge
  badge: {
    background: '#ef4444',
    color: '#fff',
    borderRadius: 10,
    padding: '1px 6px',
    fontSize: 11,
    fontWeight: 700,
    lineHeight: '16px',
    flexShrink: 0,
  },

  // Footer
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  userName: { fontSize: 13, fontWeight: 600, color: '#e2e8f0' },
  userRole: { fontSize: 11, color: '#64748b', textTransform: 'capitalize' },
  logoutBtn: {
    marginTop: 8,
    background: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    borderRadius: 6,
    padding: '6px 0',
    cursor: 'pointer',
    fontSize: 13,
  },
};
