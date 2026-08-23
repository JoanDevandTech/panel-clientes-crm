import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useRoute } from 'wouter'
import { ArrowLeft, Download, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { api, getAccessToken, BASE_URL } from '../../services/api'

const statusConfig = {
  sent: { label: 'Pendiente', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  approved: { label: 'Aprobado', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  rejected: { label: 'Rechazado', bg: 'bg-danger/15', text: 'text-[#FF5C7A]' },
  expired: { label: 'Expirado', bg: 'bg-ink/[0.06]', text: 'text-ink/60' },
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
        <Link to="/portal/quotes" className="inline-flex items-center gap-2 text-ink/60 hover:text-ink transition-colors mb-6">
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
        <Link to="/portal/quotes" className="inline-flex items-center gap-2 text-ink/60 hover:text-ink transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a presupuestos</span>
        </Link>
        <div className="text-center py-16">
          <p className="text-[#FF5C7A] mb-4">{error || 'Presupuesto no encontrado.'}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-primary text-background-dark text-sm font-medium cursor-pointer hover:bg-secondary transition-colors"
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
      <Link to="/portal/quotes" className="inline-flex items-center gap-2 text-ink/60 hover:text-ink transition-colors mb-6">
        <ArrowLeft size={16} />
        <span>Volver a presupuestos</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6"
      >
        <h1 className="text-2xl font-display font-bold text-ink">{quote.quote_number}</h1>
        <span className={`self-start px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        {quote.valid_until && (
          <span className="text-sm text-ink/60 sm:ml-auto">
            Válido hasta {formatDate(quote.valid_until)}
          </span>
        )}
      </motion.div>

      {message && (
        <div className={`mb-6 p-4 border ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-danger/10 border-danger/30 text-[#FF5C7A]'
        }`}>
          {message.text}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="bg-surface-dark border border-ink/[0.09] overflow-hidden"
      >
        {pdfLoading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {pdfError && !pdfLoading && (
          <div className="text-center py-16 px-6">
            <p className="text-[#FF5C7A] mb-4">{pdfError}</p>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-background-dark text-sm font-medium cursor-pointer hover:bg-secondary transition-colors"
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
            className="block w-full bg-bg-2"
            style={{ height: 'min(900px, calc(100vh - 200px))' }}
          />
        )}
      </motion.div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-ink/[0.03] border border-ink/[0.09] text-ink text-sm font-medium hover:bg-ink/[0.06] transition-all cursor-pointer disabled:opacity-50"
        >
          {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          Descargar PDF
        </button>

        {canDecide && (
          <>
            <button
              onClick={() => decide('reject')}
              disabled={!!deciding}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-danger/15 border border-danger/30 text-[#FF5C7A] text-sm font-medium hover:bg-danger/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {deciding === 'reject' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
              Rechazar
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => decide('accept')}
              disabled={!!deciding}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-background-dark font-bold text-sm hover:bg-secondary hover:shadow-portal-glow transition-all cursor-pointer disabled:opacity-50"
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
