import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'wouter'
import {
  ArrowLeft,
  FileSignature,
  RotateCcw,
  Calendar,
  MoreHorizontal,
  Check,
  AlertCircle,
  Search,
  Server,
  Cloud,
  Code,
  CreditCard,
  Sparkles,
  Download,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { BASE_URL, getAccessToken } from '../../services/api'
import './contracts.css'

/* ---------- helpers ---------- */

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

async function downloadBlob(endpoint, filename) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  })
  if (!res.ok) throw new Error(`Descarga falló (${res.status})`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function formatAmount(amount, currency = 'EUR') {
  const n = Number(amount || 0)
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + (currency === 'EUR' ? ' €' : ` ${currency}`)
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function safePct(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

/* ---------- KPI helper ---------- */

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

/* ---------- Status badge ---------- */

function StatusBadge({ status }) {
  const m = STATUS[status] || STATUS.completed
  return (
    <span className={`pr-badge ${m.cls}`}>
      {m.dot && <span className="pr-badge-dot solo" />}
      {m.label}
    </span>
  )
}

/* ---------- Contract card ---------- */

function ContractCard({ c, onNav }) {
  const { type, accent, Icon } = deriveType(c)
  const status = c.status || 'active'
  const monthlyFee = c.monthly_fee ?? null
  const totalPerCycle = Number(c.total_per_cycle || 0)
  const cyclePct = safePct(c.progress?.cycle_percent)
  const daysToBill = c.progress?.days_until_next_invoice
  const services = useMemo(() => {
    if (Array.isArray(c.items) && c.items.length > 0) {
      return c.items.map((it) => it.description).filter(Boolean).slice(0, 6)
    }
    if (c.items_summary) return [c.items_summary]
    return []
  }, [c])
  const showMonthlyProgress =
    status === 'active' && /mensual|monthly/i.test(c.billing_cycle_label || '') && cyclePct > 0
  const isAutoRenew = c.auto_renew ?? (c.duration_type !== 'fixed')

  const handleClick = () => onNav?.(c.id)
  const stop = (e) => e.stopPropagation()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
      className="pr-card hoverable pr-contract-card"
      style={{ cursor: 'pointer' }}
    >
      {/* Header band */}
      <div className="pr-contract-card-head">
        <div className={`pr-contract-head-icon pr-accent-${accent}`}>
          <Icon size={18} />
        </div>
        <div className="pr-contract-head-info">
          <div className="pr-contract-title-row">
            <h3 className="pr-contract-title">{c.title}</h3>
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
            <span>{c.billing_cycle_label || '—'}</span>
            <span className="pr-dot">·</span>
            <span className="pr-contract-code">{c.contract_number || `#${c.id}`}</span>
          </div>
        </div>
        <div className="pr-contract-actions">
          {status === 'pending_signature' && (
            <button
              className="pr-btn primary sm"
              onClick={(e) => {
                stop(e)
                handleClick()
              }}
            >
              <FileSignature size={13} /> Firmar
            </button>
          )}
          <Link
            to={`/portal/contracts/${c.id}`}
            onClick={stop}
            className="pr-btn ghost sm"
          >
            Ver detalle
          </Link>
          <button className="pr-btn ghost sm icon-only" onClick={stop} aria-label="Más acciones">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Body 3 zones */}
      <div className="pr-contract-body">
        {/* Services */}
        <div className="pr-contract-zone">
          <div className="pr-contract-zone-label">Servicios incluidos</div>
          {services.length > 0 ? (
            <div className="pr-contract-services">
              {services.map((s, i) => (
                <div key={i} className="pr-contract-service-item">
                  <Check size={12} />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--pr-text-muted)' }}>
              Sin desglose disponible
            </div>
          )}
        </div>

        {/* Period + billing */}
        <div className="pr-contract-zone pr-contract-period">
          <div>
            <div className="pr-contract-zone-label">Periodo</div>
            <div className="pr-contract-period-row">
              <Calendar size={12} />
              <span>{formatDate(c.start_date)}</span>
              <span className="pr-arrow">→</span>
              <span>{c.duration_type === 'fixed' ? formatDate(c.end_date) : 'Indefinido'}</span>
            </div>
          </div>

          {status === 'active' && c.next_billing_date && (
            <div>
              <div className="pr-contract-zone-label">Próxima facturación</div>
              <div
                className={`pr-contract-next-billing${
                  daysToBill !== undefined && daysToBill !== null && daysToBill <= 14 ? ' warn' : ''
                }`}
              >
                <div className="pr-contract-next-billing-date">{formatDate(c.next_billing_date)}</div>
                <div className="pr-contract-next-billing-sub">
                  {daysToBill === 0
                    ? 'Se factura hoy'
                    : daysToBill !== undefined && daysToBill !== null
                      ? `En ${daysToBill} día${daysToBill === 1 ? '' : 's'}`
                      : '—'}
                </div>
              </div>
            </div>
          )}

          {showMonthlyProgress && (
            <div>
              <div className="pr-contract-progress-row">
                <span className="pr-contract-progress-label">Uso del ciclo</span>
                <span className="pr-contract-progress-value">{cyclePct}%</span>
              </div>
              <div className="pr-contract-progress-track">
                <div
                  className={`pr-contract-progress-fill${cyclePct >= 90 ? ' high' : ''}`}
                  style={{ width: `${cyclePct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Money + signature */}
        <div className="pr-contract-zone pr-contract-money">
          <div>
            <div className="pr-contract-zone-label">
              {monthlyFee ? 'Cuota mensual' : c.billing_cycle_label || 'Importe'}
            </div>
            <div className="pr-contract-money-amount">
              {formatAmount(monthlyFee ?? totalPerCycle, c.currency).replace(/ €$/, '')}
              <span className="pr-cur">{c.currency === 'EUR' ? '€' : c.currency || ''}</span>
            </div>
            {monthlyFee && (
              <div className="pr-contract-money-sub">
                {formatAmount(monthlyFee * 12, c.currency)} / año
              </div>
            )}
          </div>

          {status === 'pending_signature' ? (
            <div className="pr-contract-warn-pending">
              <AlertCircle size={12} />
              <span>Tu firma desbloqueará el inicio del servicio</span>
            </div>
          ) : c.signed_at || c.signed_by ? (
            <div className="pr-contract-signed">
              <div className="pr-contract-zone-label">Firmado</div>
              {c.signed_by && <div className="pr-contract-signed-name">{c.signed_by}</div>}
              <div className="pr-contract-signed-date">
                {c.signed_at ? `el ${formatDate(c.signed_at)}` : ''}
                {c.document_size ? ` · ${c.document_size}` : ''}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ---------- Page ---------- */

export default function ContractsPage() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [, setLocation] = useLocation()

  const { data: contracts, loading, error, refetch } = useApi('/client/recurring-services')

  const handleExportAll = async () => {
    if (exporting) return
    setExporting(true)
    setExportError(null)
    try {
      await downloadBlob('/client/recurring-services/export-zip', `contratos-${Date.now()}.zip`)
    } catch (e) {
      setExportError(e.message || 'No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  const list = Array.isArray(contracts) ? contracts : []

  const groups = useMemo(() => {
    const count = (k) => list.filter((c) => c.status === k).length
    return [
      { key: 'all', label: 'Todos', count: list.length },
      { key: 'active', label: 'Activos', count: count('active') },
      { key: 'pending_signature', label: 'Pendientes', count: count('pending_signature') },
      { key: 'paused', label: 'Pausados', count: count('paused') },
      { key: 'completed', label: 'Finalizados', count: count('completed') },
      { key: 'cancelled', label: 'Cancelados', count: count('cancelled') },
    ].filter((g) => g.key === 'all' || g.count > 0)
  }, [list])

  const kpi = useMemo(() => {
    const active = list.filter((c) => c.status === 'active')
    const pending = list.filter((c) => c.status === 'pending_signature').length
    const monthlyRecurring = active
      .filter((c) => /mensual|monthly/i.test(c.billing_cycle_label || ''))
      .reduce((s, c) => s + Number(c.total_per_cycle || 0), 0)
    const soonest = active
      .filter((c) => c.progress?.days_until_next_invoice != null)
      .sort(
        (a, b) =>
          Number(a.progress.days_until_next_invoice) -
          Number(b.progress.days_until_next_invoice),
      )[0]
    return {
      total: list.length,
      active: active.length,
      pending,
      monthlyRecurring,
      soonest,
    }
  }, [list])

  const filtered = list
    .filter((c) => filter === 'all' || c.status === filter)
    .filter((c) => {
      if (!query) return true
      const q = query.toLowerCase()
      return (
        (c.title || '').toLowerCase().includes(q) ||
        (c.contract_number || '').toLowerCase().includes(q) ||
        (c.items_summary || '').toLowerCase().includes(q)
      )
    })

  if (loading) {
    return (
      <div className="pr-loading">
        <span className="pr-spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pr-empty">
        <div className="pr-empty-art">
          <AlertCircle size={32} />
        </div>
        <div>
          <p className="pr-empty-title">No pudimos cargar los contratos</p>
          <p className="pr-empty-desc">{error}</p>
        </div>
        <button className="pr-btn primary sm" onClick={refetch}>
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      <Link to="/portal" className="pr-page-crumb">
        <ArrowLeft size={14} /> Volver al dashboard
      </Link>

      <div className="pr-page-header">
        <div className="pr-page-header-row">
          <div>
            <h1 className="pr-page-title">Contratos</h1>
            <p className="pr-page-sub">
              Servicios recurrentes contratados y su ciclo de facturación.
            </p>
          </div>
          {list.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <button
                type="button"
                className="pr-btn ghost sm"
                onClick={handleExportAll}
                disabled={exporting}
              >
                <Download size={13} />
                {exporting ? 'Exportando…' : 'Exportar todos'}
              </button>
              {exportError && (
                <span style={{ fontSize: 11, color: '#FF5C7A' }}>{exportError}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="pr-grid-4" style={{ marginBottom: 20 }}>
        <Kpi
          icon={FileSignature}
          accent="green"
          value={kpi.active}
          label="Contratos activos"
          sub={`de ${kpi.total} totales`}
        />
        <Kpi
          icon={RotateCcw}
          accent="cyan"
          value={`${kpi.monthlyRecurring.toLocaleString('es-ES', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })} €/mes`}
          label="Recurrente mensual"
          sub="suma de mensualidades"
        />
        <Kpi
          icon={Calendar}
          accent="amber"
          value={
            kpi.soonest?.progress?.days_until_next_invoice != null
              ? `${kpi.soonest.progress.days_until_next_invoice}d`
              : '—'
          }
          label="Próxima factura"
          sub={kpi.soonest?.title ? kpi.soonest.title : 'Sin facturas próximas'}
        />
        <Kpi
          icon={AlertCircle}
          accent={kpi.pending > 0 ? 'red' : 'gray'}
          value={kpi.pending}
          label="Pendiente de firmar"
          sub={kpi.pending > 0 ? 'Acción requerida' : 'Sin pendientes'}
        />
      </div>

      {/* Filter bar */}
      <div className="pr-filterbar">
        <div className="pr-filterbar-tabs">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              className={`pr-filter-tab ${filter === g.key ? 'active' : ''}`}
              onClick={() => setFilter(g.key)}
            >
              {g.label}
              <span className="pr-filter-tab-count">{g.count}</span>
            </button>
          ))}
        </div>
        <div className="pr-filterbar-right">
          <div className="pr-search">
            <Search size={14} />
            <input
              placeholder="Buscar por título o nº contrato…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art">
              <FileSignature size={32} />
            </div>
            <div>
              <p className="pr-empty-title">Sin contratos en esta categoría</p>
              <p className="pr-empty-desc">
                Cuando contrates servicios recurrentes aparecerán aquí.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <motion.div
          key={filter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="pr-contract-list"
        >
          {filtered.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <ContractCard
                c={c}
                onNav={(id) => setLocation(`/portal/contracts/${id}`)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
