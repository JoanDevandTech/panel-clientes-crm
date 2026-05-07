import { Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import PortalSearch from './PortalSearch'

function getInitials(client) {
  if (!client) return '?'
  const first = client.first_name || client.name || ''
  const last = client.last_name || ''
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?'
}

function getDisplayName(client) {
  if (!client) return ''
  if (client.first_name && client.last_name) {
    return `${client.first_name} ${client.last_name}`
  }
  return client.name || client.email || ''
}

export default function PortalHeader({ onMenuClick, title }) {
  const { client } = useAuth()

  return (
    <header
      className="sticky top-0 z-20 h-16 border-b border-white/5 flex items-center px-4 lg:px-8"
      style={{
        backgroundColor: 'rgba(11, 18, 38, 0.62)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      }}
    >
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors mr-3"
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-semibold text-white truncate">
          {title}
        </h1>
      </div>

      <div className="mr-4">
        <PortalSearch />
      </div>

      <div className="flex items-center gap-3 pl-3 border-l border-white/5">
        <span className="hidden sm:block text-sm text-slate-300 max-w-[160px] truncate">
          {getDisplayName(client)}
        </span>
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[13px] font-bold border border-primary/30 overflow-hidden shrink-0">
          {client?.avatar_url ? (
            <img src={client.avatar_url} alt={`Avatar de ${getDisplayName(client) || 'usuario'}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            getInitials(client)
          )}
        </div>
      </div>
    </header>
  )
}
