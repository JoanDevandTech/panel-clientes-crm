import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useRoute } from 'wouter'
import { ArrowLeft, Download, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { api, getAccessToken, BASE_URL } from '../../services/api'

const statusConfig = {
  sent: { label: 'Pendiente', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  approved: { label: 'Aprobado', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  rejected: { label: 'Rechazado', bg: 'bg-red-500/20', text: 'text-red-400' },
  expired: { label: 'Expirado', bg: 'bg-slate-500/20', text: 'text-slate-400' },
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

  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(null)

  useEffect(() => {
    if (!params?.id) return

    let revokedUrl = null
    let cancelled = false

    setPdfLoading(true)
    setPdfError(null)

    fetch(`${BASE_URL}/client/quotes/${params.id}/pdf`, {
      headers: { 'Authorization': `Bearer ${getAccessToken()}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`PDF no disponible (${res.status})`)
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        revokedUrl = URL.createObjectURL(blob)
        setPdfUrl(revokedUrl)
      })
      .catch((err) => {
        if (cancelled) return
        setPdfError(err.message || 'No se pudo cargar la previsualización.')
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false)
      })

    return () => {
      cancelled = true
      if (revokedUrl) URL.revokeObjectURL(revokedUrl)
    }
  }, [params?.id])

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
        className="bg-surface-dark rounded-2xl border border-white/5 overflow-hidden"
      >
        {pdfLoading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {pdfError && !pdfLoading && (
          <div className="text-center py-16 px-6">
            <p className="text-red-400 mb-4">{pdfError}</p>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary/80 transition-colors"
            >
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Descargar PDF
            </button>
          </div>
        )}

        {pdfUrl && !pdfError && (
          <iframe
            src={pdfUrl}
            title={`Presupuesto ${quote.quote_number}`}
            className="block w-full bg-white"
            style={{ height: 'min(900px, calc(100vh - 200px))' }}
          />
        )}
      </motion.div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
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
    </div>
  )
}
