import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useRoute } from 'wouter'
import { ArrowLeft, Download, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { api, getAccessToken, BASE_URL } from '../../services/api'

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Joan Dev & Tech'
const BRAND_ADDRESS_LINE_1 = import.meta.env.VITE_BRAND_ADDRESS_LINE_1 || ''
const BRAND_ADDRESS_LINE_2 = import.meta.env.VITE_BRAND_ADDRESS_LINE_2 || ''

const statusConfig = {
  sent: { label: 'Pendiente', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  approved: { label: 'Aprobado', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  rejected: { label: 'Rechazado', bg: 'bg-red-500/20', text: 'text-red-400' },
  expired: { label: 'Expirado', bg: 'bg-slate-500/20', text: 'text-slate-400' },
}

function formatAmount(amount, currency = 'EUR') {
  const symbols = { EUR: '€', USD: '$', COP: 'COP ' }
  const symbol = symbols[currency] ?? (currency + ' ')
  const formatted = Number(amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'EUR' ? `${formatted} ${symbol}` : `${symbol}${formatted}`
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function QuoteDetailPage() {
  const [, params] = useRoute('/portal/quotes/:id')
  const [downloading, setDownloading] = useState(false)
  const [deciding, setDeciding] = useState(null)
  const [message, setMessage] = useState(null)

  const { data: quote, loading, error, refetch, setData } = useApi(`/client/quotes/${params?.id}`, {
    immediate: !!params?.id,
  })

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`${BASE_URL}/client/quotes/${params.id}/pdf`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `presupuesto-${quote?.quote_number || params.id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setMessage({ type: 'error', text: 'No se pudo descargar el PDF.' })
    } finally {
      setDownloading(false)
    }
  }

  const decide = async (action) => {
    if (deciding) return
    const confirmText = action === 'accept'
      ? '¿Aceptar este presupuesto? Esta decisión se notifica al equipo.'
      : '¿Rechazar este presupuesto? Esta decisión se notifica al equipo.'
    if (!window.confirm(confirmText)) return

    setDeciding(action)
    setMessage(null)
    try {
      const response = await api.post(`/client/quotes/${params.id}/${action}`, {})
      if (response?.data) {
        setData(response.data)
      } else {
        await refetch()
      }
      setMessage({
        type: 'success',
        text: action === 'accept' ? 'Presupuesto aceptado.' : 'Presupuesto rechazado.',
      })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'No se pudo actualizar el estado.' })
    } finally {
      setDeciding(null)
    }
  }

  if (loading) {
    return (
      <div>
        <Link to="/portal/quotes" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a presupuestos</span>
        </Link>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div>
        <Link to="/portal/quotes" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a presupuestos</span>
        </Link>
        <div className="text-center py-16">
          <p className="text-red-400 mb-4">{error || 'Presupuesto no encontrado.'}</p>
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

  const status = statusConfig[quote.status] ?? statusConfig.sent
  const canDecide = quote.status === 'sent' && !quote.is_expired

  return (
    <div>
      <Link to="/portal/quotes" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} />
        <span>Volver a presupuestos</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6"
      >
        <h1 className="text-2xl font-display font-bold text-white">{quote.quote_number}</h1>
        <span className={`self-start px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        {quote.valid_until && (
          <span className="text-sm text-slate-400 sm:ml-auto">
            Válido hasta {formatDate(quote.valid_until)}
          </span>
        )}
      </motion.div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="bg-surface-dark rounded-2xl p-6 sm:p-8 border border-white/5"
      >
        {quote.title && (
          <div className="mb-6 pb-6 border-b border-white/5">
            <h2 className="text-xl font-display font-bold text-white mb-2">{quote.title}</h2>
            {quote.introduction && (
              <p className="text-sm text-slate-400 whitespace-pre-wrap">{quote.introduction}</p>
            )}
          </div>
        )}

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
              <p className="text-white">{formatDate(quote.issue_date)}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Válido hasta</h3>
              <p className="text-white">{formatDate(quote.valid_until)}</p>
            </div>
          </div>
        </div>

        {quote.objective && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Objetivo</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{quote.objective}</p>
          </div>
        )}

        {quote.deliverables && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Entregables</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{quote.deliverables}</p>
          </div>
        )}

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
              {(quote.items || []).map((item, index) => (
                <tr key={index} className="border-b border-white/5">
                  <td className="py-4 text-sm text-white">{item.description}</td>
                  <td className="py-4 text-sm text-slate-400 text-center">{item.quantity}</td>
                  <td className="py-4 text-sm text-slate-400 text-right">{formatAmount(item.unit_price, quote.currency)}</td>
                  <td className="py-4 text-sm text-white text-right font-medium">{formatAmount(item.total, quote.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 space-y-3 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-white">{formatAmount(quote.subtotal, quote.currency)}</span>
          </div>
          {Number(quote.discount_amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Descuento</span>
              <span className="text-emerald-400">- {formatAmount(quote.discount_amount, quote.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">IVA ({quote.tax_rate}%)</span>
            <span className="text-white">{formatAmount(quote.tax_amount, quote.currency)}</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-white/10">
            <span className="text-xl font-bold text-white">Total</span>
            <span className="text-xl font-bold text-white">{formatAmount(quote.total, quote.currency)}</span>
          </div>
        </div>

        {(quote.terms || quote.notes) && (
          <div className="mt-8 pt-6 border-t border-white/5">
            {quote.terms && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Términos</h3>
                <p className="text-sm text-slate-400 whitespace-pre-wrap">{quote.terms}</p>
              </div>
            )}
            {quote.notes && (
              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Notas</h3>
                <p className="text-sm text-slate-400 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Descargar PDF
          </button>

          {canDecide && (
            <>
              <button
                onClick={() => decide('reject')}
                disabled={!!deciding}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {deciding === 'reject' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                Rechazar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => decide('accept')}
                disabled={!!deciding}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {deciding === 'accept' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Aceptar
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
