import { Link, useLocation } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FolderKanban,
  LifeBuoy,
  ClipboardList,
  FileSignature,
  Receipt,
  FileText,
  Activity,
  User,
  Wallet,
  LogOut,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Krom'
const BRAND_SUBTITLE = import.meta.env.VITE_BRAND_SUBTITLE || 'Portal cliente'

const NAV_MAIN = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/portal/dashboard' },
  { icon: FolderKanban, label: 'Proyectos', href: '/portal/projects' },
  { icon: LifeBuoy, label: 'Tickets', href: '/portal/tickets' },
  { icon: ClipboardList, label: 'Presupuestos', href: '/portal/quotes' },
  { icon: FileSignature, label: 'Contratos', href: '/portal/contracts' },
  { icon: Receipt, label: 'Facturas', href: '/portal/invoices' },
  { icon: FileText, label: 'Documentos', href: '/portal/documents' },
  { icon: Activity, label: 'Actividad', href: '/portal/activity' },
]

const NAV_ACCOUNT = [
  { icon: User, label: 'Mi Perfil', href: '/portal/profile' },
  { icon: Wallet, label: 'Métodos de pago', href: '/portal/payment-methods' },
]

function NavItem({ icon: Icon, label, href, isActive, onClick }) {
  return (
    <Link
      href={href}
      className={`pr-sidebar-link ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.6} />
      <span>{label}</span>
    </Link>
  )
}

function SidebarBody({ location, onLinkClick, onLogout }) {
  return (
    <>
      <Link href="/portal/dashboard" className="pr-sidebar-brand" onClick={onLinkClick}>
        <div className="pr-sidebar-brand-logo">
          <img src="/brand-logo.svg" alt={BRAND_NAME} />
        </div>
        <div>
          <div className="pr-sidebar-brand-name">{BRAND_NAME}</div>
          <div className="pr-sidebar-brand-sub">{BRAND_SUBTITLE}</div>
        </div>
      </Link>

      <div className="pr-sidebar-section">
        <div className="pr-sidebar-section-title">Principal</div>
        {NAV_MAIN.map((it) => (
          <NavItem
            key={it.href}
            icon={it.icon}
            label={it.label}
            href={it.href}
            isActive={location === it.href || location.startsWith(it.href + '/')}
            onClick={onLinkClick}
          />
        ))}
      </div>

      <div className="pr-sidebar-section">
        <div className="pr-sidebar-section-title">Cuenta</div>
        {NAV_ACCOUNT.map((it) => (
          <NavItem
            key={it.href}
            icon={it.icon}
            label={it.label}
            href={it.href}
            isActive={location === it.href}
            onClick={onLinkClick}
          />
        ))}
      </div>

      <div className="pr-sidebar-bottom">
        <button type="button" onClick={onLogout} className="pr-sidebar-link">
          <LogOut size={18} strokeWidth={1.6} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  )
}

export default function PortalSidebar({ isOpen, onClose }) {
  const [location] = useLocation()
  const { logout } = useAuth()

  return (
    <>
      <aside className="pr-sidebar" style={{ display: 'flex' }}>
        <SidebarBody location={location} onLogout={logout} />
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 60,
              }}
              className="pr-sidebar-overlay"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="pr-sidebar pr-sidebar-mobile"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: 280,
                height: '100vh',
                zIndex: 61,
                display: 'flex',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--pr-text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
              <SidebarBody location={location} onLinkClick={onClose} onLogout={logout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
