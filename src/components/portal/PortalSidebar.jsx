import { Link, useLocation } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FolderKanban,
  LifeBuoy,
  Receipt,
  FileText,
  ClipboardList,
  Repeat,
  Activity,
  User,
  LogOut,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Joan Dev & Tech'
const BRAND_SUBTITLE = import.meta.env.VITE_BRAND_SUBTITLE || 'Portal cliente'

const navLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/portal/dashboard' },
  { icon: FolderKanban, label: 'Proyectos', href: '/portal/projects' },
  { icon: LifeBuoy, label: 'Tickets', href: '/portal/tickets' },
  { icon: ClipboardList, label: 'Presupuestos', href: '/portal/quotes' },
  { icon: Repeat, label: 'Contratos', href: '/portal/contracts' },
  { icon: Receipt, label: 'Facturas', href: '/portal/invoices' },
  { icon: FileText, label: 'Documentos', href: '/portal/documents' },
  { icon: Activity, label: 'Actividad', href: '/portal/activity' },
]

const bottomLinks = [
  { icon: User, label: 'Mi Perfil', href: '/portal/profile' },
]

function NavItem({ icon: Icon, label, href, isActive }) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
        isActive
          ? 'portal-active-nav font-semibold'
          : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
      }`}
    >
      <Icon
        size={18}
        className={`shrink-0 ${isActive ? '' : 'text-slate-500 group-hover:text-slate-300'}`}
        strokeWidth={1.8}
      />
      <span>{label}</span>
    </Link>
  )
}

function BrandAvatar() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/brand-logo.jpg"
        alt={BRAND_NAME}
        className="w-10 h-10 rounded-xl shrink-0 object-cover"
        style={{ boxShadow: '0 8px 28px -8px rgba(99, 102, 241, 0.55)' }}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white leading-tight truncate">{BRAND_NAME}</p>
        <p className="text-[11px] text-slate-500 leading-tight truncate">{BRAND_SUBTITLE}</p>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="px-3 pt-4 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[.12em]">
      {children}
    </p>
  )
}

function SidebarContent({ location, onClose, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
        <Link href="/portal/dashboard" className="min-w-0 flex-1">
          <BrandAvatar />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <SectionLabel>Principal</SectionLabel>
        <div className="space-y-0.5">
          {navLinks.map((link) => (
            <NavItem
              key={link.href}
              icon={link.icon}
              label={link.label}
              href={link.href}
              isActive={location === link.href || location.startsWith(link.href + '/')}
            />
          ))}
        </div>

        <SectionLabel>Cuenta</SectionLabel>
        <div className="space-y-0.5">
          {bottomLinks.map((link) => (
            <NavItem
              key={link.href}
              icon={link.icon}
              label={link.label}
              href={link.href}
              isActive={location === link.href}
            />
          ))}
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-white/5">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all w-full"
        >
          <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )
}

export default function PortalSidebar({ isOpen, onClose }) {
  const [location] = useLocation()
  const { logout } = useAuth()

  const glassStyle = {
    backgroundColor: 'rgba(11, 18, 38, 0.72)',
    backdropFilter: 'blur(18px) saturate(140%)',
    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
  }

  return (
    <>
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 border-r border-white/5 z-30"
        style={glassStyle}
      >
        <SidebarContent location={location} onLogout={logout} />
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-72 border-r border-white/5 z-50 lg:hidden"
              style={glassStyle}
            >
              <SidebarContent location={location} onClose={onClose} onLogout={logout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
