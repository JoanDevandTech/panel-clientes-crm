import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { Menu, Search, Bell, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

function getInitials(client) {
  if (!client) return '?'
  const first = client.first_name || client.name || ''
  const last = client.last_name || ''
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
  return initials || (client.email ? client.email.charAt(0).toUpperCase() : '?')
}

function getDisplayName(client) {
  if (!client) return ''
  if (client.first_name && client.last_name) return `${client.first_name} ${client.last_name}`
  return client.name || client.email || ''
}

export default function PortalHeader({ onMenuClick, title, crumb }) {
  const { client } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="pr-topbar">
      <div className="pr-topbar-crumb" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            color: 'var(--pr-text-secondary)',
            cursor: 'pointer',
            padding: 4,
          }}
          className="pr-topbar-menu"
        >
          <Menu size={20} />
        </button>
        {crumb && (
          <>
            <span style={{ color: 'var(--pr-text-muted)' }}>{crumb}</span>
            <ChevronRight size={14} style={{ color: 'var(--pr-text-faint)' }} />
          </>
        )}
        <span>{title}</span>
      </div>

      <div className="pr-topbar-right">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="pr-topbar-search-trigger"
        >
          <Search size={14} />
          <span>Busca proyectos, facturas, atajos…</span>
          <kbd>⌘K</kbd>
        </button>

        <button type="button" className="pr-topbar-bell" aria-label="Notificaciones">
          <Bell size={16} />
        </button>

        <Link href="/portal/profile" className="pr-topbar-user">
          <span style={{ display: 'none' }} className="pr-topbar-user-name">
            {getDisplayName(client)}
          </span>
          <div className="pr-topbar-user-avatar">
            {client?.avatar_url ? (
              <img src={client.avatar_url} alt={getDisplayName(client) || 'Avatar'} />
            ) : (
              getInitials(client)
            )}
          </div>
        </Link>
      </div>

      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}

      <style>{`
        @media (min-width: 901px) {
          .pr-topbar-user-name { display: inline !important; }
        }
        @media (max-width: 900px) {
          .pr-topbar { padding: 0 16px; }
          .pr-topbar-menu { display: inline-flex !important; }
          .pr-topbar-search-trigger { min-width: 0; flex: 1; }
          .pr-topbar-search-trigger span,
          .pr-topbar-search-trigger kbd { display: none; }
        }
      `}</style>
    </header>
  )
}

function SearchPalette({ onClose }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const NAV = [
    { label: 'Dashboard', href: '/portal/dashboard' },
    { label: 'Proyectos', href: '/portal/projects' },
    { label: 'Tickets', href: '/portal/tickets' },
    { label: 'Presupuestos', href: '/portal/quotes' },
    { label: 'Contratos', href: '/portal/contracts' },
    { label: 'Facturas', href: '/portal/invoices' },
    { label: 'Documentos', href: '/portal/documents' },
    { label: 'Actividad', href: '/portal/activity' },
    { label: 'Mi perfil', href: '/portal/profile' },
  ]
  const q = query.trim().toLowerCase()
  const items = q ? NAV.filter((n) => n.label.toLowerCase().includes(q)) : NAV.slice(0, 6)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        // Sin backdrop-filter a propósito: la barra superior y el sidebar ya
        // llevan el suyo y, al superponerse dos capas que difuminan el fondo,
        // el navegador no puede muestrearlo y pinta una franja negra arriba.
        // Un velo opaco da el mismo resultado visual sin ese artefacto.
        background: 'rgba(13,14,17,0.92)',
        display: 'flex',
        justifyContent: 'center',
        padding: '10vh 16px 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 640,
          height: 'fit-content',
          maxHeight: '75vh',
          background: 'var(--pr-bg-primary)',
          border: '1px solid var(--pr-border)',
          overflow: 'hidden',
          boxShadow: 'var(--pr-shadow-lg), var(--pr-glow-cyan)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 18px',
            borderBottom: '1px solid var(--pr-border)',
          }}
        >
          <Search size={18} style={{ color: 'var(--pr-accent-cyan)' }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca proyectos, facturas, contratos…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--pr-text-primary)',
              fontSize: 16,
              fontWeight: 500,
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              fontFamily: 'var(--pr-font-mono)',
              padding: '3px 8px',
              background: 'var(--pr-bg-card-strong)',
              border: '1px solid var(--pr-border)',
              color: 'var(--pr-text-muted)',
            }}
          >
            ESC
          </kbd>
        </div>
        <div style={{ overflowY: 'auto', padding: 8 }}>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: 'var(--pr-text-muted)',
              fontWeight: 600,
              padding: '8px 12px 4px',
            }}
          >
            {q ? `Resultados para "${query}"` : 'Navegar a'}
          </div>
          {items.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--pr-text-muted)', fontSize: 13 }}>
              Sin resultados
            </div>
          )}
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  background: 'var(--pr-bg-card-strong)',
                  border: '1px solid var(--pr-border)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--pr-text-secondary)',
                  flexShrink: 0,
                }}
              >
                <ChevronRight size={14} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--pr-text-primary)' }}>{it.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
