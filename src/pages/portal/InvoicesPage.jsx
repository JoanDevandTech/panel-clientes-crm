import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'wouter'
import { Eye, Download, Loader2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getAccessToken, BASE_URL } from '../../services/api'

const statusConfig = {
  pending: { label: 'Pendiente', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  paid: { label: 'Pagada', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  overdue: { label: 'Vencida', bg: 'bg-red-500/20', text: 'text-red-400' },
  draft: { label: 'Borrador', bg: 'bg-slate-500/20', text: 'text-slate-400' },
}

const tabs = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'paid', label: 'Pagadas' },
  { key: 'overdue', label: 'Vencidas' },
]

const currentYear = new Date().getFullYear()
const years = [currentYear, currentYear - 1]

function formatAmount(amount) {
  return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function formatDate(dateString) {
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

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [, setLocation] = useLocation()
  const [downloading, setDownloading] = useState(null)

  const { data: invoices, loading, error, refetch } = useApi('/client/invoices', {
    params: {
      status: activeTab !== 'all' ? activeTab : undefined,
      year: selectedYear,
      sort: '-issue_date',
    },
  })

  const handleDownloadPdf = async (e, invoiceId) => {
    e.stopPropagation()
    e.preventDefault()
    setDownloading(invoiceId)
    try {
      const response = await fetch(`${BASE_URL}/client/invoices/${invoiceId}/pdf`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${invoiceId}.pdf`
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

  const filteredInvoices = invoices || []

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-white">Facturas</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
        <div className="flex gap-2 flex-wrap">
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

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm outline-none focus:border-primary transition-colors cursor-pointer"
        >
          {years.map((year) => (
            <option key={year} value={year} className="bg-surface-dark">
              {year}
            </option>
          ))}
        </select>
      </div>

      <motion.div
        className="hidden md:block mt-6 bg-surface-dark rounded-2xl border border-white/5 overflow-hidden"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        key={`${activeTab}-${selectedYear}`}
      >
        <table className="w-full">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">N.º Factura</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Fecha Emisión</th>
              <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Vencimiento</th>
              <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Total</th>
              <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</th>
              <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => {
              const status = statusConfig[invoice.status]
              return (
                <motion.tr
                  key={invoice.id}
                  variants={fadeUp}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/portal/invoices/${invoice.id}`)}
                >
                  <td className="px-6 py-4">
                    <Link to={`/portal/invoices/${invoice.id}`} className="text-white font-medium hover:text-primary transition-colors">
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(invoice.issue_date)}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(invoice.due_date)}</td>
                  <td className="px-6 py-4 text-sm text-white text-right font-medium">{formatAmount(invoice.total)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <Link
                        to={`/portal/invoices/${invoice.id}`}
                        className="text-slate-400 hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        title="Ver detalle"
                      >
                        <Eye size={18} />
                      </Link>
                      <button
                        className="text-slate-400 hover:text-primary transition-colors cursor-pointer"
                        onClick={(e) => handleDownloadPdf(e, invoice.id)}
                        disabled={downloading === invoice.id}
                        title="Descargar PDF"
                      >
                        {downloading === invoice.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
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
        {filteredInvoices.map((invoice) => {
          const status = statusConfig[invoice.status]
          return (
            <motion.div key={invoice.id} variants={fadeUp}>
              <Link
                to={`/portal/invoices/${invoice.id}`}
                className="block bg-surface-dark rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-medium">{invoice.invoice_number}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Emisión</span>
                    <span className="text-slate-300">{formatDate(invoice.issue_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vencimiento</span>
                    <span className="text-slate-300">{formatDate(invoice.due_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total</span>
                    <span className="text-white font-bold">{formatAmount(invoice.total)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/5">
                  <span className="text-slate-400 hover:text-primary transition-colors">
                    <Eye size={18} />
                  </span>
                  <button
                    className="text-slate-400 hover:text-primary transition-colors cursor-pointer"
                    onClick={(e) => handleDownloadPdf(e, invoice.id)}
                    disabled={downloading === invoice.id}
                  >
                    {downloading === invoice.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  </button>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          No hay facturas en esta categoría.
        </div>
      )}
    </div>
  )
}
