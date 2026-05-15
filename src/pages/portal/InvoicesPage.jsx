import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'wouter'
import {
  Receipt,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Download,
  Eye,
  CreditCard,
  Loader2,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getAccessToken, BASE_URL } from '../../services/api'
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

const tabs = [
  { key: 'all', label: 'Todas' },
  { key: 'sent', label: 'Pendientes' },
  { key: 'paid', label: 'Pagadas' },
  { key: 'overdue', label: 'Vencidas' },
]

const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const currentYear = new Date().getFullYear()
const years = [currentYear, currentYear - 1, currentYear - 2]

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function formatAmountShort(amount) {
  return Number(amount || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €'
}

function formatShortDate(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  return `${String(d.getDate()).padStart(2, '0')} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`
}

function isInvoiceOverdue(inv) {
  if (inv.status === 'overdue') return true
  if (inv.status !== 'sent' && inv.status !== 'partially_paid') return false
  if (!inv.due_date) return false
  return new Date(inv.due_date) < new Date(new Date().toDateString())
}

function isPaid(inv) {
  return inv.status === 'paid'
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] ?? fallbackStatus
  const Ico = cfg.icon
  return (
    <span className={`pr-badge ${cfg.cls}`}>
      <Ico size={11} strokeWidth={2.4} />
      {cfg.label}
    </span>
  )
}

function KpiTile({ icon: Icon, accent, value, label, sub }) {
  return (
    <div className="pr-kpi">
      <div className="pr-kpi-head">
        <div className={`pr-kpi-icon pr-accent-${accent}`}>
          <Icon size={14} />
        </div>
        <div className="pr-kpi-label">{label}</div>
      </div>
      <div className="pr-kpi-value">{value}</div>
      {sub && <div className="pr-kpi-sub">{sub}</div>}
    </div>
  )
}

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [query, setQuery] = useState('')
  const [, setLocation] = useLocation()
  const [downloading, setDownloading] = useState(null)

  const { data, loading, error, refetch } = useApi('/client/invoices', {
    params: {
      status: activeTab !== 'all' ? activeTab : undefined,
      year: selectedYear,
      sort: '-issue_date',
    },
  })

  const allInvoices = useMemo(() => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    return []
  }, [data])

  const filteredInvoices = useMemo(() => {
    if (!query.trim()) return allInvoices
    const q = query.toLowerCase()
    return allInvoices.filter((i) => {
      const num = String(i.invoice_number || '').toLowerCase()
      const proj = String(i.project?.name || i.project_name || '').toLowerCase()
      const concept = String(i.concept || i.description || i.notes || '').toLowerCase()
      return num.includes(q) || proj.includes(q) || concept.includes(q)
    })
  }, [allInvoices, query])

  const kpis = useMemo(() => {
    const totals = allInvoices.reduce(
      (acc, inv) => {
        const total = Number(inv.total || 0)
        const paid = isPaid(inv)
        const overdue = isInvoiceOverdue(inv)
        acc.totalBilled += total
        if (paid) {
          acc.totalPaid += total
        } else if (overdue) {
          acc.overdue += total
          acc.overdueCount += 1
        } else {
          acc.pending += total
          acc.pendingCount += 1
        }
        return acc
      },
      { totalBilled: 0, totalPaid: 0, pending: 0, overdue: 0, pendingCount: 0, overdueCount: 0 }
    )
    return totals
  }, [allInvoices])

  const tabCounts = useMemo(() => {
    const c = { all: allInvoices.length, sent: 0, paid: 0, overdue: 0 }
    for (const inv of allInvoices) {
      if (isPaid(inv)) c.paid += 1
      else if (isInvoiceOverdue(inv)) c.overdue += 1
      else if (inv.status === 'sent' || inv.status === 'partially_paid') c.sent += 1
    }
    return c
  }, [allInvoices])

  const chart = useMemo(() => {
    const buckets = monthsShort.map((m) => ({ month: m, billed: 0, paid: 0 }))
    for (const inv of allInvoices) {
      if (!inv.issue_date) continue
      const d = new Date(inv.issue_date)
      if (d.getFullYear() !== Number(selectedYear)) continue
      const idx = d.getMonth()
      const total = Number(inv.total || 0)
      buckets[idx].billed += total
      if (isPaid(inv)) buckets[idx].paid += total
    }
    return buckets
  }, [allInvoices, selectedYear])

  const maxChart = Math.max(...chart.map((c) => c.billed), 1)
  const paymentRate = kpis.totalBilled
    ? Math.round((kpis.totalPaid / kpis.totalBilled) * 100)
    : 0

  const handleDownloadPdf = async (e, invoiceId, invoiceNumber) => {
    e.stopPropagation()
    e.preventDefault()
    setDownloading(invoiceId)
    try {
      const response = await fetch(`${BASE_URL}/client/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${invoiceNumber || invoiceId}.pdf`
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
      <div className="pr-loading">
        <span className="pr-spinner" aria-label="Cargando" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pr-card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#f87171', marginBottom: 16 }}>{error}</p>
        <button onClick={refetch} className="pr-btn primary">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="pr-page-header">
        <div className="pr-page-header-row">
          <div>
            <h1 className="pr-page-title">Facturas</h1>
            <p className="pr-page-sub">
              Tu historial completo y tu salud financiera con Joan Dev &amp; Tech.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              className="pr-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y} style={{ background: '#0a0e1a' }}>
                  Año {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top: KPIs + chart */}
      <div className="inv-top">
        <div className="inv-kpi-grid">
          <KpiTile
            icon={TrendingUp}
            accent="cyan"
            value={`${formatAmountShort(kpis.totalBilled)}`}
            label={`Facturado ${selectedYear}`}
            sub={`${allInvoices.length} ${allInvoices.length === 1 ? 'factura emitida' : 'facturas emitidas'}`}
          />
          <KpiTile
            icon={CheckCircle2}
            accent="green"
            value={formatAmountShort(kpis.totalPaid)}
            label="Cobrado"
            sub={`${paymentRate}% de lo facturado`}
          />
          <KpiTile
            icon={Clock}
            accent="amber"
            value={formatAmountShort(kpis.pending)}
            label="Pendiente"
            sub={`${kpis.pendingCount} ${kpis.pendingCount === 1 ? 'factura por cobrar' : 'facturas por cobrar'}`}
          />
          <KpiTile
            icon={AlertTriangle}
            accent="red"
            value={formatAmountShort(kpis.overdue)}
            label="Vencidas"
            sub={kpis.overdueCount > 0 ? `${kpis.overdueCount} ${kpis.overdueCount === 1 ? 'requiere atención' : 'requieren atención'}` : 'Sin vencidos'}
          />
        </div>

        <div className="pr-card" style={{ padding: 20 }}>
          <div className="pr-card-head" style={{ marginBottom: 14 }}>
            <div className="pr-card-head-icon pr-accent-purple">
              <TrendingUp size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="pr-card-head-title">Facturación mensual</div>
              <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 2 }}>
                Cobrado vs pendiente · {selectedYear}
              </div>
            </div>
          </div>
          <div className="inv-chart">
            {chart.map((c, i) => {
              const paidH = maxChart ? (c.paid / maxChart) * 100 : 0
              const pendH = maxChart ? ((c.billed - c.paid) / maxChart) * 100 : 0
              return (
                <div
                  key={i}
                  className="inv-chart-col"
                  title={`${c.month}: ${formatAmountShort(c.billed)} facturado, ${formatAmountShort(c.paid)} cobrado`}
                >
                  <div className="inv-chart-col-bars">
                    {pendH > 0 && (
                      <div
                        className="inv-chart-bar-pending"
                        style={{
                          height: `${pendH}%`,
                          borderRadius: '4px 4px 0 0',
                        }}
                      />
                    )}
                    {paidH > 0 && (
                      <div
                        className="inv-chart-bar-paid"
                        style={{
                          height: `${paidH}%`,
                          borderRadius: pendH > 0 ? 0 : '4px 4px 0 0',
                        }}
                      />
                    )}
                  </div>
                  <div className="inv-chart-label">{c.month}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="pr-filterbar">
        <div className="pr-filterbar-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`pr-filter-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
              <span className="pr-filter-tab-count">{tabCounts[tab.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="pr-filterbar-right">
          <div className="pr-search">
            <Search size={14} />
            <input
              placeholder="Buscar por número, proyecto o concepto…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table / empty */}
      {filteredInvoices.length === 0 ? (
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art">
              <Receipt size={32} />
            </div>
            <div>
              <p className="pr-empty-title">Sin facturas en esta categoría</p>
              <p className="pr-empty-desc">Cuando emitamos facturas aparecerán aquí.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <motion.div
            className="pr-card inv-table-card hide-on-mobile"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            key={`desk-${activeTab}-${selectedYear}-${query}`}
          >
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Nº Factura</th>
                    <th>Proyecto · Concepto</th>
                    <th>Emisión</th>
                    <th>Vencimiento</th>
                    <th className="right">Total</th>
                    <th>Estado</th>
                    <th className="right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const overdue = isInvoiceOverdue(inv)
                    const paid = isPaid(inv)
                    const dueClass = overdue
                      ? 'overdue'
                      : ''
                    const projectName = inv.project?.name || inv.project_name || '—'
                    const concept = inv.concept || inv.description || inv.notes || ''
                    return (
                      <motion.tr
                        key={inv.id}
                        variants={fadeUp}
                        onClick={() => setLocation(`/portal/invoices/${inv.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="num">{inv.invoice_number}</td>
                        <td className="project-cell">
                          <div className="project-title" style={{ fontSize: 13, fontWeight: 500, color: 'var(--pr-text-primary)', marginBottom: 2 }}>
                            {projectName}
                          </div>
                          {concept && (
                            <div className="project-sub" style={{ fontSize: 11, color: 'var(--pr-text-muted)' }}>
                              {concept}
                            </div>
                          )}
                        </td>
                        <td>{formatShortDate(inv.issue_date)}</td>
                        <td className={`due-date ${dueClass}`}>{formatShortDate(inv.due_date)}</td>
                        <td className="total">{formatAmount(inv.total)}</td>
                        <td>
                          <StatusBadge status={overdue && !paid ? 'overdue' : inv.status} />
                          {paid && inv.payments?.[0]?.payment_date && (
                            <div className="inv-paid-meta">
                              Pagada {formatShortDate(inv.payments[0].payment_date)}
                            </div>
                          )}
                        </td>
                        <td className="actions">
                          <div className="actions-inner" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {!paid && (
                              <button
                                type="button"
                                className="pr-btn primary sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setLocation(`/portal/invoices/${inv.id}`)
                                }}
                              >
                                <CreditCard size={12} /> Pagar
                              </button>
                            )}
                            <button
                              type="button"
                              className="pr-btn ghost sm icon-only"
                              title="Descargar PDF"
                              onClick={(e) => handleDownloadPdf(e, inv.id, inv.invoice_number)}
                              disabled={downloading === inv.id}
                            >
                              {downloading === inv.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Download size={13} />
                              )}
                            </button>
                            <Link
                              to={`/portal/invoices/${inv.id}`}
                              className="pr-btn ghost sm icon-only"
                              title="Ver detalles"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye size={13} />
                            </Link>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Mobile */}
          <motion.div
            className="inv-mobile-list show-on-mobile"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            key={`mob-${activeTab}-${selectedYear}-${query}`}
          >
            {filteredInvoices.map((inv) => {
              const overdue = isInvoiceOverdue(inv)
              const paid = isPaid(inv)
              const projectName = inv.project?.name || inv.project_name || '—'
              return (
                <motion.div key={inv.id} variants={fadeUp}>
                  <Link to={`/portal/invoices/${inv.id}`} className="inv-mobile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 500, color: 'var(--pr-text-primary)' }}>
                        {inv.invoice_number}
                      </span>
                      <StatusBadge status={overdue && !paid ? 'overdue' : inv.status} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--pr-text-primary)' }}>
                      {projectName}
                    </div>
                    <div className="inv-mobile-row">
                      <span className="label">Emisión</span>
                      <span className="value">{formatShortDate(inv.issue_date)}</span>
                    </div>
                    <div className="inv-mobile-row">
                      <span className="label">Vencimiento</span>
                      <span className={`value ${overdue ? 'overdue' : ''}`} style={overdue ? { color: '#f87171', fontWeight: 600 } : undefined}>
                        {formatShortDate(inv.due_date)}
                      </span>
                    </div>
                    <div className="inv-mobile-row">
                      <span className="label">Total</span>
                      <span className="value strong">{formatAmount(inv.total)}</span>
                    </div>
                    <div className="inv-mobile-actions">
                      {!paid && (
                        <span className="pr-btn primary sm" style={{ pointerEvents: 'none' }}>
                          <CreditCard size={12} /> Pagar
                        </span>
                      )}
                      <button
                        type="button"
                        className="pr-btn ghost sm icon-only"
                        title="Descargar PDF"
                        onClick={(e) => handleDownloadPdf(e, inv.id, inv.invoice_number)}
                        disabled={downloading === inv.id}
                      >
                        {downloading === inv.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                      </button>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>

          <style>{`
            .hide-on-mobile { display: block; }
            .show-on-mobile { display: none; }
            @media (max-width: 820px) {
              .hide-on-mobile { display: none; }
              .show-on-mobile { display: flex; }
            }
            .animate-spin { animation: pr-spin 1s linear infinite; }
          `}</style>
        </>
      )}
    </div>
  )
}
