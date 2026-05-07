import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useRoute } from 'wouter'
import { ArrowLeft, Loader2, Repeat, Calendar, Receipt, MessageSquare } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { api } from '../../services/api'

const statusConfig = {
  active: { label: 'Activo', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  completed: { label: 'Finalizado', bg: 'bg-slate-500/20', text: 'text-slate-300' },
}

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
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ContractDetailPage() {
  const [, params] = useRoute('/portal/contracts/:id')
  const id = params?.id

  const {
    data: contract,
    loading,
    error,
    refetch,
  } = useApi(`/client/recurring-services/${id}`, { immediate: !!id })

  const [notes, setNotes] = useState([])
  const [notesMeta, setNotesMeta] = useState(null)
  const [notesPage, setNotesPage] = useState(1)
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setNotesLoading(true)
    setNotesError(null)
    api
      .get(`/client/recurring-services/${id}/notes?page=${notesPage}`)
      .then((res) => {
        if (cancelled) return
        const incoming = res?.data ?? []
        setNotes((prev) => (notesPage === 1 ? incoming : [...prev, ...incoming]))
        setNotesMeta(res?.meta ?? null)
      })
      .catch((err) => {
        if (!cancelled) setNotesError(err.message || 'Error al cargar notas')
      })
      .finally(() => {
        if (!cancelled) setNotesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, notesPage])

  if (loading) {
    return (
      <div>
        <Link to="/portal/contracts" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a contratos</span>
        </Link>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Link to="/portal/contracts" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a contratos</span>
        </Link>
        <div className="text-center py-16">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary/80 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div>
        <Link to="/portal/contracts" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a contratos</span>
        </Link>
        <div className="text-center py-16 text-slate-500">Contrato no encontrado.</div>
      </div>
    )
  }

  const status = statusConfig[contract.status] || statusConfig.active
  const cyclePct = Math.min(100, Math.max(0, Number(contract.progress?.cycle_percent ?? 0)))
  const contractPct = Math.min(100, Math.max(0, Number(contract.progress?.contract_percent ?? 0)))
  const daysLeft = contract.progress?.days_until_next_invoice
  const daysRemainingContract = contract.days_remaining ?? contract.progress?.days_remaining
  const hasMore = notesMeta && notesMeta.current_page < Math.ceil((notesMeta.total || 0) / (notesMeta.per_page || 20))

  return (
    <div>
      <Link to="/portal/contracts" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} />
        <span>Volver a contratos</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Repeat size={14} className="text-primary" />
            <span className="text-xs font-mono text-slate-500">{contract.contract_number}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">{contract.title}</h1>
          {contract.items_summary && (
            <p className="text-sm text-slate-400 mt-1">{contract.items_summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-300">
            {contract.billing_cycle_label}
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-surface-dark rounded-2xl p-5 border border-white/5">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Importe por ciclo</p>
          <p className="text-xl font-bold text-white mt-1">
            {formatAmount(contract.total_per_cycle, contract.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{contract.billing_cycle_label}</p>
        </div>

        <div className="bg-surface-dark rounded-2xl p-5 border border-white/5">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Próxima factura</p>
          <p className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <Calendar size={16} className="text-accent" />
            {formatDate(contract.next_billing_date)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {daysLeft !== undefined && daysLeft !== null
              ? daysLeft === 0
                ? 'Se factura hoy'
                : `${daysLeft} día${daysLeft === 1 ? '' : 's'} restantes`
              : '—'}
          </p>
        </div>

        <div className="bg-surface-dark rounded-2xl p-5 border border-white/5">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Inicio</p>
          <p className="text-xl font-bold text-white mt-1">{formatDate(contract.start_date)}</p>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">
            {contract.duration_type === 'fixed' ? 'Duración fija' : 'Indefinido'}
          </p>
        </div>

        <div className="bg-surface-dark rounded-2xl p-5 border border-white/5">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            {contract.duration_type === 'fixed' ? 'Fin' : 'Facturas emitidas'}
          </p>
          {contract.duration_type === 'fixed' ? (
            <>
              <p className="text-xl font-bold text-white mt-1">{formatDate(contract.end_date)}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {daysRemainingContract !== undefined && daysRemainingContract !== null
                  ? `${daysRemainingContract} día${daysRemainingContract === 1 ? '' : 's'} restantes`
                  : '—'}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-white mt-1">
                {contract.invoices_count ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Histórico total</p>
            </>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mt-4 bg-surface-dark rounded-2xl p-6 border border-white/5"
      >
        <h2 className="text-sm font-medium text-slate-400 mb-4">Progreso</h2>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Ciclo actual</span>
              <span className="text-slate-300">{Math.round(cyclePct)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: `${cyclePct}%` }}
              />
            </div>
          </div>

          {contract.duration_type === 'fixed' && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500">Contrato total</span>
                <span className="text-slate-300">{Math.round(contractPct)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                  style={{ width: `${contractPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {(contract.items || []).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mt-4 bg-surface-dark rounded-2xl p-6 border border-white/5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={16} className="text-slate-400" />
            <h2 className="text-sm font-medium text-slate-300">Servicios incluidos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left pb-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción</th>
                  <th className="text-center pb-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cantidad</th>
                  <th className="text-right pb-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Precio Unit.</th>
                  <th className="text-right pb-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {contract.items.map((item, i) => (
                  <tr key={item.id ?? i} className="border-b border-white/5 last:border-0">
                    <td className="py-3 text-sm text-white">{item.description}</td>
                    <td className="py-3 text-sm text-slate-400 text-center">{item.quantity}</td>
                    <td className="py-3 text-sm text-slate-400 text-right">
                      {formatAmount(item.unit_price, contract.currency)}
                    </td>
                    <td className="py-3 text-sm text-white text-right font-medium">
                      {formatAmount(item.total, contract.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {contract.invoices_count !== undefined && contract.duration_type === 'fixed' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="mt-4 bg-surface-dark rounded-2xl p-5 border border-white/5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Receipt size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-sm text-slate-300">Facturas emitidas</p>
              <p className="text-xs text-slate-500">Histórico de este contrato</p>
            </div>
          </div>
          <Link
            to="/portal/invoices"
            className="text-lg font-bold text-white hover:text-primary transition-colors"
          >
            {contract.invoices_count}
          </Link>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="mt-4 bg-surface-dark rounded-2xl p-6 border border-white/5"
      >
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={16} className="text-slate-400" />
          <h2 className="text-sm font-medium text-slate-300">Notas del servicio</h2>
          {notesMeta?.total !== undefined && (
            <span className="text-xs text-slate-500">({notesMeta.total})</span>
          )}
        </div>

        {notesError && (
          <p className="text-sm text-red-400 mb-3">{notesError}</p>
        )}

        {notes.length === 0 && !notesLoading && !notesError && (
          <p className="text-sm text-slate-500 py-4">Aún no hay notas publicadas.</p>
        )}

        <div className="space-y-0">
          {notes.map((note, index) => {
            const isLast = index === notes.length - 1 && !hasMore
            return (
              <div key={note.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  {!isLast && <div className="w-0 flex-1 border-l-2 border-white/5 my-1" />}
                </div>
                <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{note.body}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {note.author_name ? `${note.author_name} · ` : ''}
                    {formatDateTime(note.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {notesLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
            <Loader2 size={14} className="animate-spin" />
            Cargando notas...
          </div>
        )}

        {hasMore && !notesLoading && (
          <button
            onClick={() => setNotesPage((p) => p + 1)}
            className="mt-3 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Cargar más
          </button>
        )}
      </motion.div>
    </div>
  )
}
