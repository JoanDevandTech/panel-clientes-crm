import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useRoute } from 'wouter'
import {
  ArrowLeft,
  FileSignature,
  RotateCcw,
  Calendar,
  Clock,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  MessageSquare,
  Sparkles,
  Cloud,
  Code,
  CreditCard,
  Server,
  Shield,
  ChevronRight,
  X,
  Check,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { api, BASE_URL, getAccessToken } from '../../services/api'
import './contracts.css'

/* ---------- helpers (same map as list) ---------- */

const STATUS = {
  active: { cls: 'green', dot: true, label: 'Activo' },
  pending_signature: { cls: 'amber', dot: true, label: 'Pendiente de firma' },
  paused: { cls: 'amber', dot: true, label: 'Pausado' },
  completed: { cls: 'gray', dot: false, label: 'Finalizado' },
  finished: { cls: 'gray', dot: false, label: 'Finalizado' },
  cancelled: { cls: 'red', dot: false, label: 'Cancelado' },
}

const TYPE_HEURISTICS = [
  { match: /mantenim|maintenance|soporte|support/i, type: 'Mantenimiento', accent: 'cyan', icon: Sparkles },
  { match: /hosting|servidor|cloud|server/i, type: 'Hosting', accent: 'cyan', icon: Cloud },
  { match: /licenc|license|suscrip|subscription|saas|figma|adobe/i, type: 'Licencias', accent: 'blue', icon: CreditCard },
  { match: /desarrollo|development|web|app|build/i, type: 'Desarrollo', accent: 'green', icon: Code },
]

const CATEGORY_MAP = {
  maintenance: { type: 'Mantenimiento', accent: 'cyan', Icon: Sparkles },
  hosting: { type: 'Hosting', accent: 'cyan', Icon: Cloud },
  licenses: { type: 'Licencias', accent: 'blue', Icon: CreditCard },
  license: { type: 'Licencias', accent: 'blue', Icon: CreditCard },
  development: { type: 'Desarrollo', accent: 'green', Icon: Code },
  service: { type: 'Servicio', accent: 'cyan', Icon: Server },
}

function deriveType(contract) {
  const key = (contract.category || contract.contract_type || '').toString().toLowerCase()
  if (key && CATEGORY_MAP[key]) return CATEGORY_MAP[key]
  const haystack = [contract.title, contract.items_summary].filter(Boolean).join(' ')
  const hit = TYPE_HEURISTICS.find((h) => h.match.test(haystack))
  if (hit) return { type: hit.type, accent: hit.accent, Icon: hit.icon }
  return { type: 'Servicio', accent: 'cyan', Icon: Server }
}

function formatAmount(amount, currency = 'EUR') {
  const n = Number(amount || 0)
  return (
    new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + (currency === 'EUR' ? ' €' : ` ${currency}`)
  )
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
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

function safePct(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

/* ---------- Reusable status badge ---------- */

function StatusBadge({ status }) {
  const m = STATUS[status] || STATUS.completed
  return (
    <span className={`pr-badge ${m.cls}`}>
      {m.dot && <span className="pr-badge-dot solo" />}
      {m.label}
    </span>
  )
}

function Kpi({ icon: Icon, accent, value, label, sub }) {
  return (
    <div className="pr-kpi">
      <div className="pr-kpi-head">
        <div className={`pr-kpi-icon pr-accent-${accent}`}>
          <Icon size={14} />
        </div>
        <div className="pr-kpi-label">{label}</div>
      </div>
      <div className="pr-kpi-value">{value}</div>
      <div className="pr-kpi-sub">{sub}</div>
    </div>
  )
}

/* ---------- Page ---------- */

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

  const [signOpen, setSignOpen] = useState(false)
  const [signName, setSignName] = useState('')
  const [signAccept, setSignAccept] = useState(false)
  const [signSubmitting, setSignSubmitting] = useState(false)
  const [signError, setSignError] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const handleSignSubmit = async () => {
    if (!signName.trim() || !signAccept || signSubmitting) return
    setSignSubmitting(true)
    setSignError(null)
    try {
      await api.post(`/client/recurring-services/${id}/sign`, {
        signed_by: signName.trim(),
        accepted_terms: true,
      })
      setSignOpen(false)
      setSignName('')
      setSignAccept(false)
      showToast('success', 'Contrato firmado correctamente.')
      refetch()
    } catch (e) {
      setSignError(e.message || 'No se pudo firmar el contrato.')
    } finally {
      setSignSubmitting(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (pdfLoading) return
    setPdfLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/client/recurring-services/${id}/pdf`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      })
      if (!res.ok) throw new Error(`Descarga falló (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fname = `${contract?.contract_number || `contrato-${id}`}.pdf`
      a.download = fname
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      showToast('error', e.message || 'No se pudo descargar el PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

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

  const services = useMemo(() => {
    if (!contract) return []
    if (Array.isArray(contract.items) && contract.items.length > 0) {
      return contract.items.map((it) => it.description).filter(Boolean)
    }
    if (contract.items_summary) return [contract.items_summary]
    return []
  }, [contract])

  if (loading) {
    return (
      <div>
        <Link to="/portal/contracts" className="pr-page-crumb">
          <ArrowLeft size={14} /> Volver a contratos
        </Link>
        <div className="pr-loading">
          <span className="pr-spinner" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Link to="/portal/contracts" className="pr-page-crumb">
          <ArrowLeft size={14} /> Volver a contratos
        </Link>
        <div className="pr-empty">
          <div className="pr-empty-art">
            <AlertCircle size={32} />
          </div>
          <div>
            <p className="pr-empty-title">No pudimos cargar el contrato</p>
            <p className="pr-empty-desc">{error}</p>
          </div>
          <button className="pr-btn primary sm" onClick={refetch}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div>
        <Link to="/portal/contracts" className="pr-page-crumb">
          <ArrowLeft size={14} /> Volver a contratos
        </Link>
        <div className="pr-empty">
          <div className="pr-empty-art">
            <FileSignature size={32} />
          </div>
          <div>
            <p className="pr-empty-title">Contrato no encontrado</p>
            <p className="pr-empty-desc">
              Puede que se haya eliminado o que no tengas acceso a él.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const status = contract.status || 'active'
  const { type, accent, Icon } = deriveType(contract)
  const cyclePct = safePct(contract.progress?.cycle_percent)
  const contractPct = safePct(contract.progress?.contract_percent)
  const daysToBill = contract.progress?.days_until_next_invoice
  const daysRemaining = contract.days_remaining ?? contract.progress?.days_remaining
  const isAutoRenew = contract.auto_renew ?? (contract.duration_type !== 'fixed')
  const totalPerCycle = Number(contract.total_per_cycle || 0)
  const monthlyFee = contract.monthly_fee ?? null
  const yearlyTotal = monthlyFee ? monthlyFee * 12 : totalPerCycle
  const hasMore =
    notesMeta &&
    notesMeta.current_page <
      Math.ceil((notesMeta.total || 0) / (notesMeta.per_page || 20))

  return (
    <div>
      <Link to="/portal/contracts" className="pr-page-crumb">
        <ArrowLeft size={14} /> Volver a contratos
      </Link>

      {/* Header banner card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pr-card pr-contract-card"
        style={{ marginBottom: 16 }}
      >
        <div className="pr-contract-card-head">
          <div className={`pr-contract-head-icon pr-accent-${accent}`}>
            <Icon size={18} />
          </div>
          <div className="pr-contract-head-info">
            <div className="pr-contract-title-row">
              <h1 className="pr-contract-title" style={{ fontSize: 20 }}>
                {contract.title}
              </h1>
              <StatusBadge status={status} />
              {isAutoRenew && status === 'active' && (
                <span className="pr-contract-renew-chip">
                  <RotateCcw size={10} /> Renovación automática
                </span>
              )}
            </div>
            <div className="pr-contract-meta-row">
              <span>{type}</span>
              <span className="pr-dot">·</span>
              <span>{contract.billing_cycle_label || '—'}</span>
              <span className="pr-dot">·</span>
              <span className="pr-contract-code">
                {contract.contract_number || `#${contract.id}`}
              </span>
            </div>
          </div>
          <div className="pr-contract-actions">
            {status === 'pending_signature' && (
              <button
                className="pr-btn primary sm"
                onClick={() => setSignOpen(true)}
              >
                <FileSignature size={13} /> Firmar
              </button>
            )}
            <button
              className="pr-btn ghost sm"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
            >
              <Download size={13} /> {pdfLoading ? 'Descargando…' : 'PDF'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Banner conditional */}
      {status === 'pending_signature' && (
        <div
          className="pr-banner"
          style={{
            background:
              'var(--pr-amber-bg)',
            borderColor: 'rgba(245,158,11,0.25)',
            color: '#FBBF24',
          }}
        >
          <AlertTriangle size={16} />
          <span>
            <strong style={{ color: '#FBBF24' }}>Pendiente de firma.</strong> El servicio
            no comenzará hasta que el contrato esté firmado.
          </span>
        </div>
      )}

      {/* KPI strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="pr-grid-4"
        style={{ marginBottom: 16 }}
      >
        <Kpi
          icon={CreditCard}
          accent="cyan"
          value={formatAmount(monthlyFee ?? totalPerCycle, contract.currency)}
          label={monthlyFee ? 'Cuota mensual' : contract.billing_cycle_label || 'Importe'}
          sub={
            monthlyFee
              ? `${formatAmount(yearlyTotal, contract.currency)} / año`
              : 'por ciclo'
          }
        />
        <Kpi
          icon={Calendar}
          accent="amber"
          value={contract.next_billing_date ? formatDate(contract.next_billing_date) : '—'}
          label="Próxima factura"
          sub={
            daysToBill === 0
              ? 'Se factura hoy'
              : daysToBill !== undefined && daysToBill !== null
                ? `En ${daysToBill} día${daysToBill === 1 ? '' : 's'}`
                : '—'
          }
        />
        <Kpi
          icon={Clock}
          accent="cyan"
          value={formatDate(contract.start_date)}
          label="Inicio"
          sub={contract.duration_type === 'fixed' ? 'Duración fija' : 'Indefinido'}
        />
        <Kpi
          icon={contract.duration_type === 'fixed' ? CheckCircle2 : Receipt}
          accent={contract.duration_type === 'fixed' ? 'green' : 'blue'}
          value={
            contract.duration_type === 'fixed'
              ? formatDate(contract.end_date)
              : (contract.invoices_count ?? 0)
          }
          label={contract.duration_type === 'fixed' ? 'Fin del contrato' : 'Facturas emitidas'}
          sub={
            contract.duration_type === 'fixed'
              ? daysRemaining !== undefined && daysRemaining !== null
                ? `${daysRemaining} día${daysRemaining === 1 ? '' : 's'} restantes`
                : '—'
              : 'Histórico total'
          }
        />
      </motion.div>

      {/* Detail grid: items + side info */}
      <div className="pr-contract-detail-grid" style={{ marginBottom: 16 }}>
        {/* Left: items table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="pr-card"
        >
          <div className="pr-card-head">
            <div className="pr-card-head-icon pr-accent-cyan">
              <Receipt size={14} />
            </div>
            <div className="pr-card-head-title">Servicios incluidos</div>
          </div>

          {Array.isArray(contract.items) && contract.items.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="pr-contract-items-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th className="t-center">Cant.</th>
                    <th className="t-num">Precio unit.</th>
                    <th className="t-num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.items.map((item, i) => (
                    <tr key={item.id ?? i}>
                      <td className="t-desc">{item.description}</td>
                      <td className="t-center">{item.quantity}</td>
                      <td className="t-num">
                        {formatAmount(item.unit_price, contract.currency)}
                      </td>
                      <td className="t-num t-total">
                        {formatAmount(item.total, contract.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : services.length > 0 ? (
            <div className="pr-contract-services">
              {services.map((s, i) => (
                <div key={i} className="pr-contract-service-item">
                  <CheckCircle2 size={14} />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--pr-text-muted)', padding: '8px 0' }}>
              Sin desglose disponible.
            </div>
          )}
        </motion.div>

        {/* Right: side info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Progress card */}
          <div className="pr-card">
            <div className="pr-card-head">
              <div className="pr-card-head-icon pr-accent-cyan">
                <Sparkles size={14} />
              </div>
              <div className="pr-card-head-title">Progreso</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div className="pr-contract-progress-row">
                  <span className="pr-contract-progress-label">Ciclo actual</span>
                  <span className="pr-contract-progress-value">{cyclePct}%</span>
                </div>
                <div className="pr-contract-progress-track" style={{ height: 8 }}>
                  <div
                    className={`pr-contract-progress-fill${cyclePct >= 90 ? ' high' : ''}`}
                    style={{ width: `${cyclePct}%` }}
                  />
                </div>
              </div>

              {contract.duration_type === 'fixed' && (
                <div>
                  <div className="pr-contract-progress-row">
                    <span className="pr-contract-progress-label">Contrato total</span>
                    <span className="pr-contract-progress-value">{contractPct}%</span>
                  </div>
                  <div className="pr-contract-progress-track" style={{ height: 8 }}>
                    <div
                      className="pr-contract-progress-fill"
                      style={{ width: `${contractPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumen card */}
          <div className="pr-card">
            <div className="pr-card-head">
              <div className="pr-card-head-icon pr-accent-amber">
                <Shield size={14} />
              </div>
              <div className="pr-card-head-title">Resumen del contrato</div>
            </div>

            <div className="pr-contract-info-row">
              <span className="label">Periodo</span>
              <span className="value">
                {formatDate(contract.start_date)} →{' '}
                {contract.duration_type === 'fixed' ? formatDate(contract.end_date) : 'Indefinido'}
              </span>
            </div>
            <div className="pr-contract-info-row">
              <span className="label">Ciclo de facturación</span>
              <span className="value">{contract.billing_cycle_label || '—'}</span>
            </div>
            <div className="pr-contract-info-row">
              <span className="label">Renovación</span>
              <span className="value">
                {isAutoRenew ? 'Automática' : 'Manual'}
              </span>
            </div>
            {contract.invoices_count !== undefined && (
              <div className="pr-contract-info-row">
                <span className="label">Facturas emitidas</span>
                <span className="value">
                  <Link
                    to="/portal/invoices"
                    style={{
                      color: 'var(--pr-text-primary)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {contract.invoices_count}
                    <ChevronRight size={12} />
                  </Link>
                </span>
              </div>
            )}
            <div className="pr-contract-info-row">
              <span className="label">Importe total año</span>
              <span className="value">{formatAmount(yearlyTotal, contract.currency)}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Notes timeline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="pr-card"
      >
        <div className="pr-card-head">
          <div className="pr-card-head-icon pr-accent-blue">
            <MessageSquare size={14} />
          </div>
          <div className="pr-card-head-title">
            Notas del servicio
            {notesMeta?.total !== undefined && (
              <span style={{ color: 'var(--pr-text-muted)', fontWeight: 400, marginLeft: 6 }}>
                ({notesMeta.total})
              </span>
            )}
          </div>
        </div>

        {notesError && (
          <p style={{ fontSize: 13, color: '#FF5C7A', marginBottom: 12 }}>{notesError}</p>
        )}

        {notes.length === 0 && !notesLoading && !notesError && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--pr-text-muted)',
              padding: '12px 0',
              margin: 0,
            }}
          >
            Aún no hay notas publicadas.
          </p>
        )}

        {notes.length > 0 && (
          <div className="pr-contract-notes-list">
            {notes.map((note, index) => {
              const isLast = index === notes.length - 1 && !hasMore
              return (
                <div key={note.id} className="pr-contract-note">
                  <div className="pr-contract-note-rail">
                    <span className="pr-contract-note-dot" />
                    {!isLast && <span className="pr-contract-note-line" />}
                  </div>
                  <div className="pr-contract-note-body">
                    <p className="pr-contract-note-text">{note.body}</p>
                    <p className="pr-contract-note-meta">
                      {note.author_name ? `${note.author_name} · ` : ''}
                      {formatDateTime(note.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {notesLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--pr-text-muted)',
              padding: '12px 0 0',
            }}
          >
            <span className="pr-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Cargando notas…
          </div>
        )}

        {hasMore && !notesLoading && (
          <button
            type="button"
            className="pr-btn ghost sm"
            style={{ marginTop: 14 }}
            onClick={() => setNotesPage((p) => p + 1)}
          >
            Cargar más
          </button>
        )}
      </motion.div>

      {/* Sign modal */}
      {signOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !signSubmitting && setSignOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13, 14, 17,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="pr-card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 460 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="pr-card-head-icon pr-accent-cyan">
                  <FileSignature size={14} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pr-text-primary)' }}>
                  Firmar contrato
                </div>
              </div>
              <button
                type="button"
                className="pr-btn ghost sm icon-only"
                onClick={() => !signSubmitting && setSignOpen(false)}
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>

            <p
              style={{
                fontSize: 13,
                color: 'var(--pr-text-muted)',
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              Confirma tu nombre o razón social y acepta los términos para activar el
              servicio.
            </p>

            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--pr-text-muted)',
                marginBottom: 6,
              }}
            >
              Nombre o razón social
            </label>
            <input
              type="text"
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
              disabled={signSubmitting}
              placeholder="Ej. Acme S.L."
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                background: 'var(--pr-bg-input)',
                color: 'var(--pr-text-primary)',
                border: '1px solid var(--pr-border)',
                outline: 'none',
                marginBottom: 14,
              }}
            />

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: 13,
                color: 'var(--pr-text-primary)',
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <input
                type="checkbox"
                checked={signAccept}
                onChange={(e) => setSignAccept(e.target.checked)}
                disabled={signSubmitting}
                style={{ marginTop: 2 }}
              />
              <span>Acepto los términos y condiciones del contrato.</span>
            </label>

            {signError && (
              <p style={{ fontSize: 12, color: '#FF5C7A', marginBottom: 12 }}>{signError}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="pr-btn ghost sm"
                onClick={() => setSignOpen(false)}
                disabled={signSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="pr-btn primary sm"
                onClick={handleSignSubmit}
                disabled={!signName.trim() || !signAccept || signSubmitting}
              >
                <Check size={13} />
                {signSubmitting ? 'Firmando…' : 'Confirmar firma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1100,
            background:
              toast.type === 'success'
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(255, 23, 68,0.15)',
            border: `1px solid ${
              toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(255, 23, 68,0.4)'
            }`,
            color: toast.type === 'success' ? '#34D399' : '#FF5C7A',
            padding: '10px 14px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 10px 30px rgba(13, 14, 17,0.3)',
          }}
        >
          {toast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
