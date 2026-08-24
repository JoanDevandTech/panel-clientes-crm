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
import { useAuth } from '../../hooks/useAuth'
import { getAccessToken, BASE_URL } from '../../services/api'
import { clientCurrency, detectCurrency, formatMoney, resolveCurrency } from '../../utils/money'
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
  { key: 'open', label: 'Pendientes' },
  { key: 'paid', label: 'Pagadas' },
  { key: 'overdue', label: 'Vencidas' },
]

const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const currentYear = new Date().getFullYear()
const years = [currentYear, currentYear - 1, currentYear - 2]

// Totales de KPI y gráfico: cifra redonda, sin decimales.
function formatAmountShort(amount, currency) {
  return formatMoney(amount ?? 0, currency, { decimals: 0 })
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
  const { client } = useAuth()
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

  const { data: summaryData } = useApi('/client/invoices/summary', {
    params: { year: selectedYear },
  })

  const { data: monthlyData } = useApi('/client/invoices/monthly', {
    params: { year: selectedYear },
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

  // Fallback (client-side) totals — usados si el endpoint /summary no responde
  // o no devuelve un campo concreto. Defensivo.
  const fallbackKpis = useMemo(() => {
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

  const kpis = useMemo(() => {
    const s = summaryData || {}
    const pick = (...keys) => {
      for (const k of keys) {
        if (s[k] != null) return Number(s[k])
      }
      return null
    }
    const totalBilled = pick('invoiced', 'total_invoiced', 'billed', 'total') ?? fallbackKpis.totalBilled
    const totalPaid = pick('paid', 'total_paid', 'collected') ?? fallbackKpis.totalPaid
    const pending = pick('pending', 'total_pending', 'open') ?? fallbackKpis.pending
    const overdue = pick('overdue', 'total_overdue') ?? fallbackKpis.overdue
    const pendingCount = pick('pending_count', 'open_count') ?? fallbackKpis.pendingCount
    const overdueCount = pick('overdue_count') ?? fallbackKpis.overdueCount
    const count = pick('count', 'invoices_count') ?? allInvoices.length
    return { totalBilled, totalPaid, pending, overdue, pendingCount, overdueCount, count }
  }, [summaryData, fallbackKpis, allInvoices.length])

  // Respaldo cuando una factura no trae moneda propia.
  const fallbackCurrency = clientCurrency(client)

  // Moneda de los agregados (KPIs y gráfico). Si las facturas del año mezclan
  // monedas, `mixed` queda a true: sumarlas no significa nada, así que en ese
  // caso no mostramos el total en vez de etiquetarlo con una moneda inventada.
  const { currency: rowsCurrency, mixed: mixedCurrency } = useMemo(
    () => detectCurrency(allInvoices),
    [allInvoices],
  )
  const totalsCurrency = mixedCurrency
    ? null
    : resolveCurrency(summaryData?.currency, rowsCurrency, fallbackCurrency)
  const totalValue = (amount) =>
    mixedCurrency ? '—' : formatAmountShort(amount, totalsCurrency)

  const tabCounts = useMemo(() => {
    const c = { all: allInvoices.length, open: 0, paid: 0, overdue: 0 }
    for (const inv of allInvoices) {
      if (isPaid(inv)) c.paid += 1
      else if (isInvoiceOverdue(inv)) c.overdue += 1
      else if (inv.status === 'sent' || inv.status === 'partially_paid') c.open += 1
    }
    return c
  }, [allInvoices])

  const chart = useMemo(() => {
    // Soporta dos formatos: array simple de 12 entradas o { months: [...] }
    const raw = Array.isArray(monthlyData)
      ? monthlyData
      : Array.isArray(monthlyData?.months)
        ? monthlyData.months
        : null

    if (raw && raw.length > 0) {
      // Normaliza a buckets de 12 meses con month/billed/paid
      const buckets = monthsShort.map((m, idx) => {
        const entry = raw.find((r) => {
          const mn = Number(r.month ?? r.month_number ?? r.m)
          if (Number.isFinite(mn)) return mn === idx + 1
          return false
        })
        return {
          month: m,
          billed: Number(entry?.invoiced ?? entry?.billed ?? entry?.total ?? 0),
          paid: Number(entry?.paid ?? entry?.collected ?? 0),
        }
      })
      return buckets
    }

    // Fallback client-side si /monthly no responde
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
  }, [monthlyData, allInvoices, selectedYear])

  const hasChartData = chart.some((c) => c.billed > 0 || c.paid > 0)
  const maxChart = Math.max(...chart.map((c) => c.billed), 1)
  const paymentRate = (() => {
    const s = summaryData || {}
    if (s.payment_rate != null) return Math.round(Number(s.payment_rate))
    return kpis.totalBilled
      ? Math.round((kpis.totalPaid / kpis.totalBilled) * 100)
      : 0
  })()

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
        <p style={{ color: '#FF5C7A', marginBottom: 16 }}>{error}</p>
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
              Tu historial completo y tu salud financiera con {import.meta.env.VITE_BRAND_NAME || 'Krom'}.
              {mixedCurrency &&
                ' Tus facturas de este año están en varias monedas, así que no mostramos totales agregados.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              className="pr-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y} style={{ background: 'var(--pr-bg-primary)' }}>
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
            value={totalValue(kpis.totalBilled)}
            label={`Facturado ${selectedYear}`}
            sub={`${kpis.count} ${kpis.count === 1 ? 'factura emitida' : 'facturas emitidas'}`}
          />
          <KpiTile
            icon={CheckCircle2}
            accent="green"
            value={totalValue(kpis.totalPaid)}
            label="Cobrado"
            sub={`${paymentRate}% de lo facturado`}
          />
          <KpiTile
            icon={Clock}
            accent="amber"
            value={totalValue(kpis.pending)}
            label="Pendiente"
            sub={`${kpis.pendingCount} ${kpis.pendingCount === 1 ? 'factura por cobrar' : 'facturas por cobrar'}`}
          />
          <KpiTile
            icon={AlertTriangle}
            accent="red"
            value={totalValue(kpis.overdue)}
            label="Vencidas"
            sub={kpis.overdueCount > 0 ? `${kpis.overdueCount} ${kpis.overdueCount === 1 ? 'requiere atención' : 'requieren atención'}` : 'Sin vencidos'}
          />
        </div>

        <div className="pr-card" style={{ padding: 20 }}>
          <div className="pr-card-head" style={{ marginBottom: 14 }}>
            <div className="pr-card-head-icon pr-accent-cyan">
              <TrendingUp size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="pr-card-head-title">Facturación mensual</div>
              <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 2 }}>
                Cobrado vs pendiente · {selectedYear}
              </div>
            </div>
          </div>
          {hasChartData ? (
            <div className="inv-chart">
              {chart.map((c, i) => {
                const paidH = maxChart ? (c.paid / maxChart) * 100 : 0
                const pendH = maxChart ? ((c.billed - c.paid) / maxChart) * 100 : 0
                return (
                  <div
                    key={i}
                    className="inv-chart-col"
                    title={`${c.month}: ${formatAmountShort(c.billed, totalsCurrency)} facturado, ${formatAmountShort(c.paid, totalsCurrency)} cobrado`}
                  >
                    <div className="inv-chart-col-bars">
                      {pendH > 0 && (
                        <div
                          className="inv-chart-bar-pending"
                          style={{
                            height: `${pendH}%`,
                          }}
                        />
                      )}
                      {paidH > 0 && (
                        <div
                          className="inv-chart-bar-paid"
                          style={{
                            height: `${paidH}%`,
                          }}
                        />
                      )}
                    </div>
                    <div className="inv-chart-label">{c.month}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '32px 8px', textAlign: 'center', color: 'var(--pr-text-muted)', fontSize: 12 }}>
              Sin datos suficientes para mostrar el gráfico de {selectedYear}.
            </div>
          )}
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
                    const projectName = inv.project_name || inv.project?.name || ''
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
                          {projectName && (
                            <div className="project-title" style={{ fontSize: 13, fontWeight: 500, color: 'var(--pr-text-primary)', marginBottom: 2 }}>
                              {projectName}
                            </div>
                          )}
                          {concept && (
                            <div className="project-sub" style={{ fontSize: 11, color: 'var(--pr-text-muted)' }}>
                              {concept}
                            </div>
                          )}
                          {!projectName && !concept && (
                            <span style={{ color: 'var(--pr-text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>{formatShortDate(inv.issue_date)}</td>
                        <td className={`due-date ${dueClass}`}>{formatShortDate(inv.due_date)}</td>
                        <td className="total">
                          {formatMoney(inv.total, resolveCurrency(inv.currency, fallbackCurrency))}
                        </td>
                        <td>
                          <StatusBadge status={overdue && !paid ? 'overdue' : inv.status} />
                          {paid && (inv.paid_at || inv.payments?.[0]?.payment_date) && (
                            <div className="inv-paid-meta">
                              Pagada {formatShortDate(inv.paid_at || inv.payments?.[0]?.payment_date)}
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
              const projectName = inv.project_name || inv.project?.name || ''
              const concept = inv.concept || inv.description || inv.notes || ''
              return (
                <motion.div key={inv.id} variants={fadeUp}>
                  <Link to={`/portal/invoices/${inv.id}`} className="inv-mobile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--pr-font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--pr-text-primary)' }}>
                        {inv.invoice_number}
                      </span>
                      <StatusBadge status={overdue && !paid ? 'overdue' : inv.status} />
                    </div>
                    {projectName && (
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--pr-text-primary)' }}>
                        {projectName}
                      </div>
                    )}
                    {concept && (
                      <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 2 }}>
                        {concept}
                      </div>
                    )}
                    <div className="inv-mobile-row">
                      <span className="label">Emisión</span>
                      <span className="value">{formatShortDate(inv.issue_date)}</span>
                    </div>
                    <div className="inv-mobile-row">
                      <span className="label">Vencimiento</span>
                      <span className={`value ${overdue ? 'overdue' : ''}`} style={overdue ? { color: '#FF5C7A', fontWeight: 600 } : undefined}>
                        {formatShortDate(inv.due_date)}
                      </span>
                    </div>
                    <div className="inv-mobile-row">
                      <span className="label">Total</span>
                      <span className="value strong">
                        {formatMoney(inv.total, resolveCurrency(inv.currency, fallbackCurrency))}
                      </span>
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
