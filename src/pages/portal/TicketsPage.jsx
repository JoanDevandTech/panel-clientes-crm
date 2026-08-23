import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'wouter'
import { Plus, Loader2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'

const statusConfig = {
  open: { label: 'Abierto', bg: 'bg-primary/20', text: 'text-primary' },
  in_progress: { label: 'En Progreso', bg: 'bg-accent/20', text: 'text-accent' },
  waiting_client: { label: 'Esperando Respuesta', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  resolved: { label: 'Resuelto', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  closed: { label: 'Cerrado', bg: 'bg-ink/[0.06]', text: 'text-ink/60' },
}

const priorityConfig = {
  low: { label: 'Baja', bg: 'bg-ink/[0.06]', text: 'text-ink/60' },
  medium: { label: 'Media', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  high: { label: 'Alta', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  urgent: { label: 'Urgente', bg: 'bg-danger/15', text: 'text-[#FF5C7A]' },
}

const statusTabs = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Abiertos' },
  { key: 'in_progress', label: 'En Progreso' },
  { key: 'waiting_client', label: 'Esperando Respuesta' },
  { key: 'resolved', label: 'Resueltos' },
  { key: 'closed', label: 'Cerrados' },
]

const priorityOptions = [
  { key: 'all', label: 'Todas' },
  { key: 'low', label: 'Baja' },
  { key: 'medium', label: 'Media' },
  { key: 'high', label: 'Alta' },
  { key: 'urgent', label: 'Urgente' },
]

function getRelativeDate(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return 'Hace 1 día'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`
  }
  const months = Math.floor(diffDays / 30)
  return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function TicketsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const { data: tickets, loading, error, refetch } = useApi('/client/tickets', {
    params: {
      status: activeTab !== 'all' ? activeTab : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      sort: '-created_at',
    },
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24">
        <p className="text-[#FF5C7A] mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-5 py-2.5 bg-ink/[0.03] text-ink/72 hover:text-ink hover:bg-ink/[0.06] text-sm font-medium transition-all"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const ticketList = Array.isArray(tickets) ? tickets : []

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Soporte</h1>
          <p className="text-ink/60 mt-1">{ticketList.length} tickets en total</p>
        </div>
        <Link
          href="/portal/tickets/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-background-dark font-medium transition-all hover:bg-secondary hover:shadow-portal-glow text-sm"
        >
          <Plus size={18} />
          Nuevo Ticket
        </Link>
      </div>

      <div className="flex gap-2 mt-6 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary text-background-dark'
                : 'bg-ink/[0.03] text-ink/60 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 bg-background-dark border border-ink/[0.09] focus:border-primary focus:ring-1 focus:ring-primary outline-none text-ink text-sm transition-colors"
        >
          {priorityOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              Prioridad: {opt.label}
            </option>
          ))}
        </select>
      </div>

      <motion.div
        className="space-y-3 mt-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        key={`${activeTab}-${priorityFilter}`}
      >
        {ticketList.map((ticket) => {
          const status = statusConfig[ticket.status] || statusConfig.open
          const priority = priorityConfig[ticket.priority] || priorityConfig.medium
          return (
            <motion.div key={ticket.id} variants={fadeUp}>
              <Link
                href={`/portal/tickets/${ticket.id}`}
                className="block bg-surface-dark p-5 border border-ink/[0.09] hover:border-ink/[0.09] transition-all cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-ink/45 text-sm">#{ticket.id}</span>
                      <h3 className="text-ink font-medium truncate">{ticket.subject}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
                        {priority.label}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-ink/45 sm:text-right flex-shrink-0">
                    {getRelativeDate(ticket.updated_at)}
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {ticketList.length === 0 && (
        <div className="text-center py-16 text-ink/45">
          No hay tickets en esta categoría.
        </div>
      )}
    </div>
  )
}
