import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useRoute } from 'wouter'
import {
  ArrowLeft,
  Download,
  Loader2,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  FileText,
  Bell,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { api, getAccessToken, BASE_URL } from '../../services/api'
import './invoices.css'

const statusConfig = {
  paid: { cls: 'green', label: 'Pagada', icon: CheckCircle2 },
  sent: { cls: 'blue', label: 'Pendiente', icon: Clock },
  partially_paid: { cls: 'amber', label: 'Parcial', icon: Clock },
  overdue: { cls: 'red', label: 'Vencida', icon: AlertTriangle },
  draft: { cls: 'gray', label: 'Borrador', icon: Clock },
  cancelled: { cls: 'gray', label: 'Cancelada', icon: Clock },
}
const fallbackStatus = { cls: 'gray', label: '—', icon: Clock }

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function formatLongDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function daysUntil(dateString) {
  if (!dateString) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateString)
  target.setHours(0, 0, 0, 0)
  const ms = target.getTime() - today.getTime()
  return Math.round(ms / 86400000)
}

export default function InvoiceDetailPage() {
  const [, params] = useRoute('/portal/invoices/:id')
  const [downloading, setDownloading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [toasts, setToasts] = useState([])

  const showToast = (msg) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((ts) => [...ts, { id, msg }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 2800)
  }

  const { data: invoice, loading, error, refetch } = useApi(`/client/invoices/${params?.id}`, {
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

    fetch(`${BASE_URL}/client/invoices/${params.id}/pdf`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
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
      const response = await fetch(`${BASE_URL}/client/invoices/${params.id}/pdf`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${invoice?.invoice_number || params.id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // silently fail
    } finally {
      setDownloading(false)
    }
  }

  const handlePay = async () => {
    if (!params?.id || paying) return
    setPaying(true)
    try {
      const res = await api.post(`/client/invoices/${params.id}/pay`, {})
      if (res?.redirect_url) {
        window.location.href = res.redirect_url
        return
      }
      showToast('Pago online próximamente disponible.')
    } catch (err) {
      if (err?.status === 501) {
        showToast('Pago online próximamente disponible.')
      } else {
        showToast(err?.message || 'No se pudo iniciar el pago.')
      }
    } finally {
      setPaying(false)
    }
  }

  const handleRemind = async () => {
    if (!params?.id || reminding) return
    setReminding(true)
    try {
      await api.post(`/client/invoices/${params.id}/remind`, {})
      showToast('Recordatorio enviado.')
    } catch (err) {
      showToast(err?.message || 'No se pudo enviar el recordatorio.')
    } finally {
      setReminding(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Link to="/portal/invoices" className="pr-page-crumb">
          <ArrowLeft size={14} />
          <span>Volver a facturas</span>
        </Link>
        <div className="pr-loading">
          <span className="pr-spinner" aria-label="Cargando" />
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div>
        <Link to="/portal/invoices" className="pr-page-crumb">
          <ArrowLeft size={14} />
          <span>Volver a facturas</span>
        </Link>
        <div className="pr-card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#f87171', marginBottom: 16 }}>{error || 'Factura no encontrada.'}</p>
          <button onClick={refetch} className="pr-btn primary">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const cfg = statusConfig[invoice.status] ?? fallbackStatus
  const StatusIcon = cfg.icon

  const total = Number(invoice.total || 0)
  const amountPaid = Number(invoice.amount_paid || 0)
  const balanceDue = invoice.balance_due != null
    ? Number(invoice.balance_due)
    : Math.max(total - amountPaid, 0)
  const isPaid = invoice.status === 'paid' || balanceDue <= 0
  const isCancelled = invoice.status === 'cancelled'
  const dueDays = daysUntil(invoice.due_date)
  const isOverdue = !isPaid && !isCancelled && dueDays != null && dueDays < 0
  const items = Array.isArray(invoice.items) ? invoice.items : []
  const payments = Array.isArray(invoice.payments) ? invoice.payments : []

  let dueLabel = ''
  if (isPaid) dueLabel = `Cobrada${invoice.paid_at ? ` el ${formatLongDate(invoice.paid_at)}` : ''}`
  else if (isOverdue) dueLabel = `Vencida hace ${Math.abs(dueDays)} ${Math.abs(dueDays) === 1 ? 'día' : 'días'}`
  else if (dueDays != null && dueDays === 0) dueLabel = 'Vence hoy'
  else if (dueDays != null) dueLabel = `Vence en ${dueDays} ${dueDays === 1 ? 'día' : 'días'}`

  return (
    <div>
      <Link to="/portal/invoices" className="pr-page-crumb">
        <ArrowLeft size={14} />
        <span>Volver a facturas</span>
      </Link>

      <motion.div
        className="inv-detail-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="inv-detail-title">{invoice.invoice_number}</h1>
        <span className={`pr-badge ${cfg.cls}`}>
          <StatusIcon size={11} strokeWidth={2.4} />
          {cfg.label}
        </span>
        <span className="inv-detail-meta">
          Emitida el {formatLongDate(invoice.issue_date)}
        </span>
      </motion.div>

      {/* Banner contextual */}
      {isPaid ? (
        <div
          className="pr-banner"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(6,182,212,0.06))',
            borderColor: 'rgba(16,185,129,0.28)',
          }}
        >
          <CheckCircle2 size={18} color="#34d399" />
          <span>
            Esta factura está <strong>pagada</strong>{invoice.paid_at ? ` desde el ${formatLongDate(invoice.paid_at)}` : ''}.
            Gracias por tu confianza.
          </span>
        </div>
      ) : isOverdue ? (
        <div
          className="pr-banner"
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(245,158,11,0.06))',
            borderColor: 'rgba(239,68,68,0.30)',
          }}
        >
          <AlertTriangle size={18} color="#f87171" />
          <span>
            Esta factura está <strong>vencida hace {Math.abs(dueDays)} {Math.abs(dueDays) === 1 ? 'día' : 'días'}</strong>.
            Por favor, regulariza el pago lo antes posible.
          </span>
        </div>
      ) : !isCancelled && dueDays != null && dueDays <= 7 ? (
        <div
          className="pr-banner"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(168,85,247,0.05))',
            borderColor: 'rgba(245,158,11,0.28)',
          }}
        >
          <Clock size={18} color="#fbbf24" />
          <span>
            <strong>{dueDays === 0 ? 'Vence hoy' : `Quedan ${dueDays} ${dueDays === 1 ? 'día' : 'días'} para vencer`}</strong>
            {invoice.due_date ? ` (${formatLongDate(invoice.due_date)})` : ''}.
          </span>
        </div>
      ) : null}

      <div className="inv-detail-grid">
        {/* PDF embed */}
        <motion.div
          className="inv-pdf-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {pdfLoading && (
            <div className="inv-pdf-state">
              <span className="pr-spinner" />
              <p style={{ color: 'var(--pr-text-muted)', fontSize: 12 }}>Cargando previsualización…</p>
            </div>
          )}
          {pdfError && !pdfLoading && (
            <div className="inv-pdf-state">
              <FileText size={32} color="#94a3b8" />
              <p style={{ color: '#f87171', margin: 0 }}>{pdfError}</p>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="pr-btn primary"
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Descargar PDF
              </button>
            </div>
          )}
          {pdfUrl && !pdfError && (
            <iframe
              src={pdfUrl}
              title={`Factura ${invoice.invoice_number}`}
              className="inv-pdf-frame"
            />
          )}
        </motion.div>

        {/* Sidebar */}
        <motion.div
          className="inv-side"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {/* Resumen económico */}
          <div className="pr-card">
            <div className="pr-card-head">
              <div className="pr-card-head-icon pr-accent-purple">
                <Wallet size={14} />
              </div>
              <div className="pr-card-head-title">Resumen</div>
            </div>

            <div className="inv-side-row">
              <span className="label">Subtotal</span>
              <span className="value">{formatAmount(invoice.subtotal ?? total)}</span>
            </div>
            {invoice.tax_amount != null && (
              <div className="inv-side-row">
                <span className="label">
                  IVA{invoice.tax_rate != null ? ` (${invoice.tax_rate}%)` : ''}
                </span>
                <span className="value">{formatAmount(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="inv-side-row total">
              <span className="label" style={{ color: 'var(--pr-text-primary)' }}>Total</span>
              <span className="value">{formatAmount(total)}</span>
            </div>

            {amountPaid > 0 && (
              <div className="inv-side-row paid">
                <span className="label">Pagado</span>
                <span className="value">- {formatAmount(amountPaid)}</span>
              </div>
            )}
            {!isPaid && balanceDue > 0 && (
              <div className="inv-side-row balance">
                <span className="label">Pendiente</span>
                <span className="value">{formatAmount(balanceDue)}</span>
              </div>
            )}
          </div>

          {/* Fechas */}
          <div className="pr-card">
            <div className="pr-card-head">
              <div className="pr-card-head-icon pr-accent-cyan">
                <Calendar size={14} />
              </div>
              <div className="pr-card-head-title">Fechas</div>
            </div>
            <div className="inv-side-row">
              <span className="label">Emisión</span>
              <span className="value">{formatLongDate(invoice.issue_date)}</span>
            </div>
            <div className="inv-side-row">
              <span className="label">Vencimiento</span>
              <span
                className="value"
                style={isOverdue ? { color: '#f87171', fontWeight: 600 } : undefined}
              >
                {formatLongDate(invoice.due_date)}
              </span>
            </div>
            {dueLabel && (
              <div style={{ fontSize: 12, color: isOverdue ? '#f87171' : 'var(--pr-text-muted)', marginTop: 4 }}>
                {dueLabel}
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="pr-card">
              <div className="pr-card-head">
                <div className="pr-card-head-icon pr-accent-amber">
                  <FileText size={14} />
                </div>
                <div className="pr-card-head-title">Conceptos</div>
              </div>
              <div className="inv-side-items">
                {items.map((item, idx) => (
                  <div key={idx} className="inv-side-item">
                    <span className="desc">{item.description || '—'}</span>
                    <span className="amount">{formatAmount(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagos */}
          {payments.length > 0 && (
            <div className="pr-card">
              <div className="pr-card-head">
                <div className="pr-card-head-icon pr-accent-green">
                  <CheckCircle2 size={14} />
                </div>
                <div className="pr-card-head-title">Historial de pagos</div>
              </div>
              <div className="inv-pay-history">
                {payments.map((p, idx) => (
                  <div key={p.id ?? idx} className="inv-pay-row">
                    <span className="ref">
                      {p.payment_date ? formatLongDate(p.payment_date) : (p.reference || `Pago ${idx + 1}`)}
                      {p.reference && p.payment_date ? ` · ${p.reference}` : ''}
                    </span>
                    <span className="amount">{formatAmount(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Acciones */}
      <div className="inv-detail-actions">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="pr-btn ghost"
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Descargar PDF
        </button>
        {!isPaid && !isCancelled && ['sent', 'partially_paid', 'overdue'].includes(invoice.status) && (
          <button
            type="button"
            className="pr-btn ghost"
            onClick={handleRemind}
            disabled={reminding}
          >
            {reminding ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            Recordar
          </button>
        )}
        {!isPaid && !isCancelled && (
          <button
            type="button"
            className="pr-btn primary"
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
            Pagar {formatAmount(balanceDue)}
          </button>
        )}
      </div>

      {/* Toasts */}
      <div className="pr-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="pr-toast">{t.msg}</div>
        ))}
      </div>

      <style>{`.animate-spin { animation: pr-spin 1s linear infinite; }`}</style>
    </div>
  )
}
