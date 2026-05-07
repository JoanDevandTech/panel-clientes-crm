import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'wouter'
import { Activity, MessageSquare, Receipt, ClipboardList, User, Loader2 } from 'lucide-react'
import { api } from '../../services/api'

const typeConfig = {
  ticket_comment: { icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' },
  invoice: { icon: Receipt, color: 'text-accent', bg: 'bg-accent/10' },
  quote: { icon: ClipboardList, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  activity: { icon: User, color: 'text-secondary', bg: 'bg-secondary/10' },
}

const filters = [
  { key: 'all', label: 'Todo' },
  { key: 'ticket_comment', label: 'Tickets' },
  { key: 'invoice', label: 'Facturas' },
  { key: 'quote', label: 'Presupuestos' },
  { key: 'activity', label: 'Cuenta' },
]

function formatDateTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getRelativeDate(dateString) {
  if (!dateString) return ''
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  const weeks = Math.floor(diffDays / 7)
  if (diffDays < 30) return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`
  const months = Math.floor(diffDays / 30)
  return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`
}

function refToHref(ref) {
  if (!ref) return null
  if (ref.type === 'ticket') return `/portal/tickets/${ref.id}`
  if (ref.type === 'invoice') return `/portal/invoices/${ref.id}`
  if (ref.type === 'quote') return `/portal/quotes/${ref.id}`
  return null
}

export default function ActivityPage() {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [events, setEvents] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' })
      if (filter !== 'all') params.set('type', filter)
      const response = await api.get(`/client/activity?${params.toString()}`)
      setEvents(response?.data ?? [])
      setMeta(response?.meta ?? null)
    } catch (err) {
      setError(err?.message || 'Error al cargar actividad.')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { fetchActivity() }, [fetchActivity])

  const changeFilter = (key) => {
    setFilter(key)
    setPage(1)
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-white">Actividad</h1>
      <p className="text-slate-400 text-sm mt-1">Historial de eventos recientes en tu cuenta.</p>

      <div className="flex gap-2 flex-wrap mt-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => changeFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              filter === f.key
                ? 'bg-primary text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-16">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchActivity}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-16">
          <Activity size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Sin actividad registrada.</p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <motion.ul
          className="mt-6 space-y-3"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {events.map((e, idx) => {
            const cfg = typeConfig[e.type] ?? typeConfig.activity
            const Icon = cfg.icon
            const href = refToHref(e.ref)
            const content = (
              <>
                <div className={`shrink-0 rounded-xl w-10 h-10 flex items-center justify-center ${cfg.bg}`}>
                  <Icon size={18} className={cfg.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200 leading-relaxed">{e.message}</p>
                  <p className="text-xs text-slate-500 mt-1" title={formatDateTime(e.date)}>
                    {getRelativeDate(e.date)}
                  </p>
                </div>
              </>
            )
            return (
              <motion.li
                key={`${e.type}-${idx}-${e.date}`}
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              >
                {href ? (
                  <Link
                    href={href}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-surface-dark border border-white/5 hover:border-white/10 transition-all"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-dark border border-white/5">
                    {content}
                  </div>
                )}
              </motion.li>
            )
          })}
        </motion.ul>
      )}

      {meta && meta.last_page > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 text-sm hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página {meta.current_page} de {meta.last_page}
          </span>
          <button
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 text-sm hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
