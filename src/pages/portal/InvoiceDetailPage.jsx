import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useRoute } from 'wouter'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getAccessToken, BASE_URL } from '../../services/api'

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Joan Dev & Tech'
const BRAND_ADDRESS_LINE_1 = import.meta.env.VITE_BRAND_ADDRESS_LINE_1 || ''
const BRAND_ADDRESS_LINE_2 = import.meta.env.VITE_BRAND_ADDRESS_LINE_2 || ''

const statusConfig = {
  sent: { label: 'Pendiente', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  paid: { label: 'Pagada', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  partially_paid: { label: 'Parcial', bg: 'bg-amber-500/20', text: 'text-amber-300' },
  overdue: { label: 'Vencida', bg: 'bg-red-500/20', text: 'text-red-400' },
  draft: { label: 'Borrador', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  cancelled: { label: 'Cancelada', bg: 'bg-slate-500/20', text: 'text-slate-400' },
}

const fallbackStatus = { label: '—', bg: 'bg-slate-500/20', text: 'text-slate-400' }

function formatAmount(amount) {
  return Number(amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function InvoiceDetailPage() {
  const [, params] = useRoute('/portal/invoices/:id')
  const [downloading, setDownloading] = useState(false)

  const { data: invoice, loading, error, refetch } = useApi(`/client/invoices/${params?.id}`, {
    immediate: !!params?.id,
  })

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`${BASE_URL}/client/invoices/${params.id}/pdf`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${params.id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // silently fail
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Link to="/portal/invoices" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a facturas</span>
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
        <Link to="/portal/invoices" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a facturas</span>
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

  if (!invoice) {
    return (
      <div>
        <Link to="/portal/invoices" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a facturas</span>
        </Link>
        <div className="text-center py-16 text-slate-500">
          Factura no encontrada.
        </div>
      </div>
    )
  }

  const status = statusConfig[invoice.status] ?? fallbackStatus

  return (
    <div>
      <Link to="/portal/invoices" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} />
        <span>Volver a facturas</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6"
      >
        <h1 className="text-2xl font-display font-bold text-white">{invoice.invoice_number}</h1>
        <span className={`self-start px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        <span className="text-sm text-slate-400 sm:ml-auto">
          Emitida el {formatDate(invoice.issue_date)}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="bg-surface-dark rounded-2xl p-6 sm:p-8 border border-white/5"
      >
        <div className="flex flex-col md:flex-row md:justify-between gap-6 mb-8 pb-6 border-b border-white/5">
          <div>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Emisor</h3>
            <p className="text-white font-medium">{BRAND_NAME}</p>
            {BRAND_ADDRESS_LINE_1 && <p className="text-sm text-slate-400">{BRAND_ADDRESS_LINE_1}</p>}
            {BRAND_ADDRESS_LINE_2 && <p className="text-sm text-slate-400">{BRAND_ADDRESS_LINE_2}</p>}
          </div>

          <div className="md:text-right">
            <div className="mb-3">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Fecha emisión</h3>
              <p className="text-white">{formatDate(invoice.issue_date)}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Fecha vencimiento</h3>
              <p className="text-white">{formatDate(invoice.due_date)}</p>
            </div>
          </div>
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
              {(invoice.items || []).map((item, index) => (
                <tr key={index} className="border-b border-white/5">
                  <td className="py-4 text-sm text-white">{item.description}</td>
                  <td className="py-4 text-sm text-slate-400 text-center">{item.quantity}</td>
                  <td className="py-4 text-sm text-slate-400 text-right">{formatAmount(item.unit_price)}</td>
                  <td className="py-4 text-sm text-white text-right font-medium">{formatAmount(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 space-y-3 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-white">{formatAmount(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">IVA ({invoice.tax_rate}%)</span>
            <span className="text-white">{formatAmount(invoice.tax_amount)}</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-white/10">
            <span className="text-xl font-bold text-white">Total</span>
            <span className="text-xl font-bold text-white">{formatAmount(invoice.total)}</span>
          </div>
          {Number(invoice.amount_paid) > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">Pagado</span>
                <span className="text-emerald-400">- {formatAmount(invoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5">
                <span className="text-sm font-bold text-amber-400">Pendiente</span>
                <span className="text-sm font-bold text-amber-400">{formatAmount(invoice.balance_due)}</span>
              </div>
            </>
          )}
        </div>

        {(invoice.payments || []).length > 0 && (
          <div className="mt-8 pt-6 border-t border-white/5">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Historial de pagos</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-left pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Método</th>
                    <th className="text-left pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Referencia</th>
                    <th className="text-right pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 text-sm text-slate-300">{formatDate(p.payment_date)}</td>
                      <td className="py-3 text-sm text-slate-300 capitalize">{(p.payment_method || '').replace(/_/g, ' ') || '—'}</td>
                      <td className="py-3 text-sm text-slate-400">{p.reference || '—'}</td>
                      <td className="py-3 text-sm text-emerald-400 text-right font-medium">{formatAmount(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer"
          >
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Descargar PDF
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
