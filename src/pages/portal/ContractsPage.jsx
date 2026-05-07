import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'wouter'
import { Eye, Loader2, Repeat, Calendar, MessageSquare } from 'lucide-react'
import { useApi } from '../../hooks/useApi'

const statusConfig = {
  active: { label: 'Activo', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  completed: { label: 'Finalizado', bg: 'bg-slate-500/20', text: 'text-slate-300' },
}

const tabs = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'completed', label: 'Finalizados' },
]

function formatAmount(amount, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0))
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [, setLocation] = useLocation()

  const { data: contracts, loading, error, refetch } = useApi('/client/recurring-services')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary/80 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const list = (contracts || []).filter((c) =>
    activeTab === 'all' ? true : c.status === activeTab
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Contratos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Servicios recurrentes contratados y su ciclo de facturación.
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mt-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6"
      >
        {list.map((c) => {
          const status = statusConfig[c.status] || statusConfig.active
          const cyclePct = Math.min(100, Math.max(0, Number(c.progress?.cycle_percent ?? 0)))
          const contractPct = Math.min(100, Math.max(0, Number(c.progress?.contract_percent ?? 0)))
          const daysLeft = c.progress?.days_until_next_invoice

          return (
            <motion.div
              key={c.id}
              variants={fadeUp}
              onClick={() => setLocation(`/portal/contracts/${c.id}`)}
              className="bg-surface-dark rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Repeat size={14} className="text-primary shrink-0" />
                    <span className="text-xs font-mono text-slate-500">{c.contract_number}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white group-hover:text-primary transition-colors truncate">
                    {c.title}
                  </h3>
                  {c.items_summary && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{c.items_summary}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                  <span className="text-[11px] text-slate-500">{c.billing_cycle_label}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500">Ciclo actual</span>
                  <span className="text-slate-400">
                    {daysLeft !== undefined && daysLeft !== null
                      ? daysLeft === 0
                        ? 'Factura hoy'
                        : `${daysLeft} día${daysLeft === 1 ? '' : 's'} para próxima factura`
                      : '—'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                    style={{ width: `${cyclePct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">Próximo cobro</p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-base font-bold text-white">
                      {formatAmount(c.total_per_cycle, c.currency)}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(c.next_billing_date)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.has_public_notes && (
                    <span className="text-slate-500" title="Tiene notas">
                      <MessageSquare size={16} />
                    </span>
                  )}
                  <Link
                    to={`/portal/contracts/${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-primary transition-colors"
                    title="Ver detalle"
                  >
                    <Eye size={18} />
                  </Link>
                </div>
              </div>

              {c.duration_type === 'fixed' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Contrato</span>
                    <span>{Math.round(contractPct)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/20"
                      style={{ width: `${contractPct}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>

      {list.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          No hay contratos en esta categoría.
        </div>
      )}
    </div>
  )
}
