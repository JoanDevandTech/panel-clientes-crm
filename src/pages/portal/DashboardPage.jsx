import { Link } from 'wouter'
import { motion } from 'framer-motion'
import { LifeBuoy, FolderKanban, Receipt, CheckCircle, ClipboardList, Repeat, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'

const statusConfig = {
  in_progress: { label: 'En Progreso', bg: 'bg-primary/20', text: 'text-primary' },
  completed: { label: 'Completado', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
}

const activityColors = {
  ticket_reply: 'bg-primary',
  invoice_created: 'bg-accent',
  project_update: 'bg-secondary',
  ticket_resolved: 'bg-emerald-400',
}

function getRelativeDate(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Hace 1 día'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`
  }
  const months = Math.floor(diffDays / 30)
  return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function DashboardPage() {
  const { client } = useAuth()
  const { data, loading, error, refetch } = useApi('/client/dashboard')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={refetch} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors">Reintentar</button>
      </div>
    )
  }

  const summaryCards = [
    {
      icon: LifeBuoy,
      value: data?.tickets?.open ?? 0,
      label: 'Tickets Abiertos',
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      icon: FolderKanban,
      value: data?.projects?.active ?? 0,
      label: 'Proyectos Activos',
      colorClass: 'text-secondary',
      bgClass: 'bg-secondary/10',
    },
    {
      icon: Receipt,
      value: formatCurrency(data?.invoices?.pending_amount ?? 0),
      label: 'Pendiente de Pago',
      colorClass: 'text-accent',
      bgClass: 'bg-accent/10',
    },
    {
      icon: CheckCircle,
      value: data?.tickets?.resolved_this_month ?? 0,
      label: 'Resueltos este Mes',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-400/10',
    },
  ]

  const recentProjects = data?.projects?.recent ?? []
  const recentActivity = data?.recent_activity ?? []

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white">
          Bienvenido, {client?.name || 'Cliente'}
        </h1>
        <p className="text-slate-400 mt-1">
          Aquí tienes un resumen de tu actividad
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {summaryCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              variants={itemVariants}
              custom={index}
              className="bg-surface-dark rounded-2xl p-6 border border-white/5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                  <p className="text-sm text-slate-400 mt-1">{card.label}</p>
                </div>
                <div
                  className={`${card.bgClass} rounded-xl p-3 w-12 h-12 flex items-center justify-center`}
                >
                  <Icon className={`w-6 h-6 ${card.colorClass}`} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <motion.div
          variants={itemVariants}
          className="bg-surface-dark rounded-2xl p-6 border border-white/5"
        >
          <h2 className="text-lg font-display font-bold text-white mb-4">
            Proyectos Recientes
          </h2>
          <div className="space-y-5">
            {recentProjects.map((project) => {
              const status = statusConfig[project.status] || statusConfig.in_progress
              return (
                <Link
                  key={project.id}
                  href={`/portal/projects/${project.id}`}
                  className="block group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium group-hover:text-primary transition-colors">
                      {project.name}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-10 text-right">
                      {project.progress}%
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
          <Link
            href="/portal/projects"
            className="inline-block mt-5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Ver todos &rarr;
          </Link>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-surface-dark rounded-2xl p-6 border border-white/5"
        >
          <h2 className="text-lg font-display font-bold text-white mb-4">
            Actividad Reciente
          </h2>
          <div className="space-y-0">
            {recentActivity.map((activity, index) => {
              const isLast = index === recentActivity.length - 1
              return (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${activityColors[activity.type]} flex-shrink-0 mt-1`}
                    />
                    {!isLast && (
                      <div className="w-0 flex-1 border-l-2 border-white/5 my-1" />
                    )}
                  </div>
                  <div className={`pb-5 ${isLast ? 'pb-0' : ''}`}>
                    <p className="text-sm text-slate-300">{activity.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {getRelativeDate(activity.date)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {(data?.quotes?.pending ?? 0) > 0 && (
        <motion.div
          variants={itemVariants}
          className="mt-8 bg-surface-dark rounded-2xl p-6 border border-white/5 border-l-4 border-l-amber-400"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-display font-bold text-white mb-1 flex items-center gap-2">
                <ClipboardList size={20} className="text-amber-400" />
                Presupuestos por revisar
              </h2>
              <p className="text-sm text-slate-400">
                {data.quotes.pending} pendiente{data.quotes.pending === 1 ? '' : 's'} &middot; {formatCurrency(data.quotes.pending_amount ?? 0)} total
              </p>
            </div>
            <Link
              href="/portal/quotes"
              className="self-start inline-flex items-center justify-center px-4 py-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-sm font-medium rounded-xl transition-colors"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {(data.quotes.latest ?? []).map((q) => (
              <Link
                key={q.id}
                href={`/portal/quotes/${q.id}`}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate">
                    {q.quote_number} {q.title ? `— ${q.title}` : ''}
                  </p>
                  {q.valid_until && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Válido hasta {formatDate(q.valid_until)}
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold text-white ml-4 shrink-0">
                  {formatCurrency(q.total)}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {data?.invoices?.year_summary && data.invoices.year_summary.invoiced > 0 && (
        <motion.div
          variants={itemVariants}
          className="mt-8 bg-surface-dark rounded-2xl p-6 border border-white/5"
        >
          <h2 className="text-lg font-display font-bold text-white mb-1">
            Resumen {data.invoices.year_summary.year}
          </h2>
          <p className="text-sm text-slate-400 mb-5">Facturación y pagos del año en curso.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Facturado</p>
              <p className="text-xl font-bold text-white">{formatCurrency(data.invoices.year_summary.invoiced)}</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-emerald-400 mb-1">Pagado</p>
              <p className="text-xl font-bold text-emerald-300">{formatCurrency(data.invoices.year_summary.paid)}</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-amber-400 mb-1">Pendiente</p>
              <p className="text-xl font-bold text-amber-300">{formatCurrency(data.invoices.year_summary.pending)}</p>
            </div>
          </div>

          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${Math.min(100, (data.invoices.year_summary.paid / data.invoices.year_summary.invoiced) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {Math.round((data.invoices.year_summary.paid / data.invoices.year_summary.invoiced) * 100)}% cobrado
          </p>
        </motion.div>
      )}

      {data?.recurring_services?.active_count > 0 && (
        <motion.div
          variants={itemVariants}
          className="mt-8 bg-surface-dark rounded-2xl p-6 border border-white/5 border-l-4 border-l-primary"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-display font-bold text-white mb-1 flex items-center gap-2">
                <Repeat size={20} className="text-primary" />
                Servicios recurrentes
              </h2>
              <p className="text-sm text-slate-400">
                {data.recurring_services.active_count} activo{data.recurring_services.active_count === 1 ? '' : 's'}
              </p>
            </div>
            <Link
              href="/portal/contracts"
              className="self-start inline-flex items-center justify-center px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium rounded-xl transition-colors"
            >
              Ver todos
            </Link>
          </div>

          {data.recurring_services.next_billing && (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/5">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-slate-500">Próximo cobro</p>
                <p className="text-sm text-slate-300 mt-0.5">
                  {formatDate(data.recurring_services.next_billing.date)}
                </p>
              </div>
              <span className="text-lg font-bold text-white ml-4 shrink-0">
                {formatCurrency(data.recurring_services.next_billing.total)}
              </span>
            </div>
          )}

          {(data.recurring_services.expiring_soon ?? []).length > 0 && (
            <div className="mt-3 space-y-2">
              {data.recurring_services.expiring_soon.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-500/10 text-sm"
                >
                  <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                  <span className="text-slate-300 truncate flex-1">
                    {c.contract_number} expira el {formatDate(c.end_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {data?.invoices?.next_due && (
        <motion.div
          variants={itemVariants}
          className="mt-8 bg-surface-dark rounded-2xl p-6 border border-white/5 border-l-4 border-l-accent"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-bold text-white mb-2">
                Próxima Factura
              </h2>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data.invoices.next_due.amount)}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Vencimiento: {formatDate(data.invoices.next_due.due_date)}
              </p>
            </div>
            <Link
              href={`/portal/invoices/${data.invoices.next_due.id}`}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-accent hover:bg-accent/80 text-white font-medium rounded-xl transition-colors text-sm"
            >
              Ver factura
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
