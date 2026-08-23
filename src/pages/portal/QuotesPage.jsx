import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'wouter'
import { Eye, Download, Loader2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getAccessToken, BASE_URL } from '../../services/api'

const statusConfig = {
  sent: { label: 'Pendiente', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  approved: { label: 'Aprobado', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  rejected: { label: 'Rechazado', bg: 'bg-danger/15', text: 'text-[#FF5C7A]' },
  expired: { label: 'Expirado', bg: 'bg-ink/[0.06]', text: 'text-ink/60' },
}

const tabs = [
  { key: 'all', label: 'Todos' },
  { key: 'sent', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobados' },
  { key: 'rejected', label: 'Rechazados' },
  { key: 'expired', label: 'Expirados' },
]

const currentYear = new Date().getFullYear()
const years = [currentYear, currentYear - 1]

function formatAmount(amount, currency = 'EUR') {
  const symbols = { EUR: '€', USD: '$', COP: 'COP ' }
  const symbol = symbols[currency] ?? (currency + ' ')
  const formatted = Number(amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'EUR' ? `${formatted} ${symbol}` : `${symbol}${formatted}`
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
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function QuotesPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [, setLocation] = useLocation()
  const [downloading, setDownloading] = useState(null)

  const { data: quotes, loading, error, refetch } = useApi('/client/quotes', {
    params: {
      status: activeTab !== 'all' ? activeTab : undefined,
      year: selectedYear,
      sort: '-issue_date',
    },
  })

  const handleDownloadPdf = async (e, quoteId, number) => {
    e.stopPropagation()
    e.preventDefault()
    setDownloading(quoteId)
    try {
      const response = await fetch(`${BASE_URL}/client/quotes/${quoteId}/pdf`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `presupuesto-${number || quoteId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // silently fail
    } finally {
      setDownloading(null)
    }
  }

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
        <p className="text-[#FF5C7A] mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-primary text-background-dark text-sm font-medium cursor-pointer hover:bg-secondary transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const filteredQuotes = quotes || []

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-ink">Presupuestos</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
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

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 bg-ink/[0.03] border border-ink/[0.09] text-ink/72 text-sm outline-none focus:border-primary transition-colors cursor-pointer"
        >
          {years.map((year) => (
            <option key={year} value={year} className="bg-surface-dark">
              {year}
            </option>
          ))}
        </select>
      </div>

      <motion.div
        className="hidden md:block mt-6 bg-surface-dark border border-ink/[0.09] overflow-hidden"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        key={`${activeTab}-${selectedYear}`}
      >
        <table className="w-full">
          <thead>
            <tr className="bg-ink/[0.03]">
              <th className="text-left px-6 py-4 text-xs font-medium text-ink/60 uppercase tracking-wider">N.º Presupuesto</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-ink/60 uppercase tracking-wider">Título</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-ink/60 uppercase tracking-wider">Emisión</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-ink/60 uppercase tracking-wider">Válido hasta</th>
              <th className="text-right px-6 py-4 text-xs font-medium text-ink/60 uppercase tracking-wider">Total</th>
              <th className="text-center px-6 py-4 text-xs font-medium text-ink/60 uppercase tracking-wider">Estado</th>
              <th className="text-center px-6 py-4 text-xs font-medium text-ink/60 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((quote) => {
              const status = statusConfig[quote.status] ?? statusConfig.sent
              return (
                <motion.tr
                  key={quote.id}
                  variants={fadeUp}
                  className="border-b border-ink/[0.09] hover:bg-ink/[0.03] transition-colors cursor-pointer"
                  onClick={() => setLocation(`/portal/quotes/${quote.id}`)}
                >
                  <td className="px-6 py-4">
                    <Link to={`/portal/quotes/${quote.id}`} className="text-ink font-medium hover:text-primary transition-colors">
                      {quote.quote_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink/72 max-w-xs truncate">{quote.title || '—'}</td>
                  <td className="px-6 py-4 text-sm text-ink/60">{formatDate(quote.issue_date)}</td>
                  <td className="px-6 py-4 text-sm text-ink/60">{formatDate(quote.valid_until)}</td>
                  <td className="px-6 py-4 text-sm text-ink text-right font-medium">{formatAmount(quote.total, quote.currency)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <Link
                        to={`/portal/quotes/${quote.id}`}
                        className="text-ink/60 hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        title="Ver detalle"
                      >
                        <Eye size={18} />
                      </Link>
                      <button
                        className="text-ink/60 hover:text-primary transition-colors cursor-pointer"
                        onClick={(e) => handleDownloadPdf(e, quote.id, quote.quote_number)}
                        disabled={downloading === quote.id}
                        title="Descargar PDF"
                      >
                        {downloading === quote.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </motion.div>

      <motion.div
        className="md:hidden mt-6 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        key={`mobile-${activeTab}-${selectedYear}`}
      >
        {filteredQuotes.map((quote) => {
          const status = statusConfig[quote.status] ?? statusConfig.sent
          return (
            <motion.div key={quote.id} variants={fadeUp}>
              <Link
                to={`/portal/quotes/${quote.id}`}
                className="block bg-surface-dark p-5 border border-ink/[0.09] hover:border-ink/[0.09] transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-ink font-medium">{quote.quote_number}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>
                {quote.title && (
                  <p className="text-sm text-ink/72 mb-3 line-clamp-2">{quote.title}</p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink/45">Emisión</span>
                    <span className="text-ink/72">{formatDate(quote.issue_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45">Válido hasta</span>
                    <span className="text-ink/72">{formatDate(quote.valid_until)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45">Total</span>
                    <span className="text-ink font-bold">{formatAmount(quote.total, quote.currency)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-ink/[0.09]">
                  <span className="text-ink/60 hover:text-primary transition-colors">
                    <Eye size={18} />
                  </span>
                  <button
                    className="text-ink/60 hover:text-primary transition-colors cursor-pointer"
                    onClick={(e) => handleDownloadPdf(e, quote.id, quote.quote_number)}
                    disabled={downloading === quote.id}
                  >
                    {downloading === quote.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  </button>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {filteredQuotes.length === 0 && (
        <div className="text-center py-16 text-ink/45">
          No hay presupuestos en esta categoría.
        </div>
      )}
    </div>
  )
}
