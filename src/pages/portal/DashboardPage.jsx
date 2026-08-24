import { useMemo, useState } from 'react'
import { Link } from 'wouter'
import {
  Bell,
  Plus,
  TrendingUp,
  FolderKanban,
  Flag,
  LifeBuoy,
  Receipt,
  FileSignature,
  CreditCard,
  ChevronRight,
  Sparkles,
  ClipboardList,
  Upload,
  Search,
  MessageSquare,
  Activity,
  Download,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  Calendar,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { clientCurrency, formatMoney, resolveCurrency } from '../../utils/money'
import './dashboard.css'

/* ============================== helpers ============================== */

// Los KPIs del dashboard se muestran redondeados (sin decimales); el detalle
// de un importe concreto (próxima factura, próximo cobro) sí los lleva.
function formatRound(amount, currency) {
  return formatMoney(amount ?? 0, currency, { decimals: 0 })
}

function formatDateLong(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getRelative(dateString) {
  if (!dateString) return ''
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'ayer'
  if (diffD < 7) return `hace ${diffD} días`
  const diffW = Math.floor(diffD / 7)
  if (diffW < 4) return `hace ${diffW} sem`
  const diffMo = Math.floor(diffD / 30)
  return `hace ${diffMo} ${diffMo === 1 ? 'mes' : 'meses'}`
}

function getDaysUntil(dateString) {
  if (!dateString) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dateString)
  d.setHours(0, 0, 0, 0)
  return Math.round((d - now) / 86400000)
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('')
}

function greetingFor(date = new Date()) {
  const h = date.getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

// Sparkline: acento único cian; los semánticos armonizados con el fondo Krom.
const ACCENT_HEX = {
  cyan: '#00E5FF',
  amber: 'var(--pr-accent-amber)',
  green: 'var(--pr-accent-green)',
  red: '#FF1744',
  blue: 'var(--pr-accent-blue)',
  gray: 'rgba(248,249,250,0.55)',
}

/* ============================== sparkline ============================== */

function Sparkline({ data, color, width = 120, height = 40 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')
  const id = `sp-${color.replace(/[^\w]/g, '')}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function TrendChip({ trend }) {
  if (!trend) return null
  const colorMap = { up: '#34D399', down: '#34D399', neutral: 'var(--pr-text-muted)' }
  return (
    <span className="dash-trend-chip" style={{ color: colorMap[trend.dir] }}>
      {trend.dir === 'up' && <TrendingUp size={11} />}
      {trend.dir === 'down' && <TrendingUp size={11} style={{ transform: 'scaleY(-1)' }} />}
      <strong>{trend.value}</strong>
      {trend.caption && <span className="caption">{trend.caption}</span>}
    </span>
  )
}

/* ============================== KPI ============================== */

function KPICard({ icon: Icon, accent = 'cyan', value, label, sub, trend, spark }) {
  return (
    <div className="dash-kpi">
      <div className="dash-kpi-head">
        <div className={`pr-card-head-icon pr-accent-${accent}`}>
          <Icon size={16} />
        </div>
        <TrendChip trend={trend} />
      </div>
      <div className="dash-kpi-value">{value}</div>
      <div className="dash-kpi-label">{label}</div>
      {sub && <div className="dash-kpi-sub">{sub}</div>}
      {spark && spark.length > 1 && (
        <div className="dash-kpi-spark">
          <Sparkline data={spark} color={ACCENT_HEX[accent] || ACCENT_HEX.cyan} />
        </div>
      )}
    </div>
  )
}

/* ============================== loading / error ============================== */

function LoadingState() {
  return (
    <div className="pr-loading">
      <span className="pr-spinner" />
    </div>
  )
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="pr-empty">
      <div className="pr-empty-art">
        <AlertTriangle size={28} />
      </div>
      <h3 className="pr-empty-title">No pudimos cargar el dashboard</h3>
      <p className="pr-empty-desc">{error || 'Inténtalo de nuevo en unos segundos.'}</p>
      <button type="button" className="pr-btn primary" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  )
}

/* ============================== page ============================== */

export default function DashboardPage() {
  const { client } = useAuth()
  const { data, loading, error, refetch } = useApi('/client/dashboard')
  const [toasts, setToasts] = useState([])

  const showToast = (msg) => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts, { id, msg }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 2400)
  }

  const today = useMemo(() => new Date(), [])
  const dateStr = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const firstName = useMemo(() => {
    if (!client) return 'Cliente'
    if (client.first_name) return client.first_name
    if (client.name) return String(client.name).split(' ')[0]
    if (client.email) return String(client.email).split('@')[0]
    return 'Cliente'
  }, [client])

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const d = data || {}
  const tickets = d.tickets || {}
  const projects = d.projects || {}
  const invoices = d.invoices || {}
  const quotes = d.quotes || {}
  const recurring = d.recurring_services || {}
  const recentActivity = Array.isArray(d.recent_activity) ? d.recent_activity : []
  // El dashboard llega ya agregado (sin moneda por fila): si el backend no
  // manda la moneda del resumen, usamos la del cliente autenticado.
  const currency = resolveCurrency(d.currency, invoices.currency, clientCurrency(client))
  const recentProjects = Array.isArray(projects.recent) ? projects.recent : []
  const recentMessages = Array.isArray(d.recent_messages) ? d.recent_messages : []
  const upcomingMilestones = Array.isArray(d.upcoming_milestones) ? d.upcoming_milestones : []

  /* ---- KPIs derivados del backend real ---- */
  const nextInvoiceDays = invoices.next_due ? getDaysUntil(invoices.next_due.due_date) : null

  const kpis = [
    {
      key: 'projects',
      icon: FolderKanban,
      accent: 'cyan',
      value: projects.active ?? 0,
      label: 'Proyectos activos',
      sub: recentProjects.length
        ? `${recentProjects.length} con actividad reciente`
        : 'Sin proyectos activos',
      spark: [2, 3, 2, 2, 3, 2, projects.active ?? 0],
    },
    {
      key: 'tickets',
      icon: LifeBuoy,
      accent: 'cyan',
      value: tickets.open ?? 0,
      label: 'Tickets abiertos',
      sub: tickets.resolved_this_month != null
        ? `${tickets.resolved_this_month} resueltos este mes`
        : 'Soporte al día',
      spark: [4, 3, 5, 4, 3, 2, tickets.open ?? 0],
    },
    {
      key: 'quotes',
      icon: ClipboardList,
      accent: 'amber',
      value: quotes.pending ?? 0,
      label: 'Presupuestos por revisar',
      sub: quotes.pending_amount
        ? `${formatRound(quotes.pending_amount, resolveCurrency(quotes.currency, currency))} en juego`
        : 'Nada pendiente',
      spark: [1, 2, 2, 3, 2, 3, quotes.pending ?? 0],
    },
    {
      key: 'pending',
      icon: Receipt,
      accent: invoices.pending_amount > 0 ? 'red' : 'green',
      value: formatRound(invoices.pending_amount ?? 0, currency),
      label: 'Pendiente de pago',
      sub: invoices.next_due
        ? `Vence ${nextInvoiceDays != null ? `en ${nextInvoiceDays} días` : formatDateLong(invoices.next_due.due_date)}`
        : 'Sin facturas pendientes',
      spark: [0, 0, Number(invoices.pending_amount) || 0, 0, 0, Number(invoices.pending_amount) || 0],
    },
  ]

  /* ---- Pending actions: las construimos a partir de quotes/invoices/recurring ---- */
  const pendingActions = []

  if (invoices.next_due) {
    pendingActions.push({
      id: `inv-${invoices.next_due.id}`,
      priority: nextInvoiceDays != null && nextInvoiceDays <= 7 ? 'high' : 'medium',
      icon: CreditCard,
      accent: 'red',
      title: `Factura pendiente de pago`,
      desc: `${formatMoney(invoices.next_due.amount, resolveCurrency(invoices.next_due.currency, currency))} · vence ${formatDateLong(invoices.next_due.due_date)}`,
      due: nextInvoiceDays != null
        ? nextInvoiceDays <= 0
          ? 'Vencida'
          : `${nextInvoiceDays} días`
        : 'Próximamente',
      cta: 'Ver factura',
      href: `/portal/invoices/${invoices.next_due.id}`,
    })
  }

  ;(quotes.latest || []).slice(0, 3).forEach((q) => {
    const days = getDaysUntil(q.valid_until)
    pendingActions.push({
      id: `q-${q.id}`,
      priority: days != null && days <= 5 ? 'high' : 'medium',
      icon: FileSignature,
      accent: 'cyan',
      title: `Presupuesto ${q.quote_number} por revisar`,
      desc: q.title || (q.valid_until ? `Válido hasta ${formatDateLong(q.valid_until)}` : 'Pendiente de tu aprobación'),
      due: days != null ? (days <= 0 ? 'Caduca hoy' : `${days} días`) : 'Sin caducidad',
      cta: 'Revisar',
      href: `/portal/quotes/${q.id}`,
    })
  })

  ;(recurring.expiring_soon || []).slice(0, 2).forEach((c, idx) => {
    const days = getDaysUntil(c.end_date)
    pendingActions.push({
      id: `c-${c.id || idx}`,
      priority: days != null && days <= 14 ? 'high' : 'low',
      icon: FileSignature,
      accent: 'amber',
      title: `Contrato ${c.contract_number} por renovar`,
      desc: `Expira el ${formatDateLong(c.end_date)}`,
      due: days != null ? (days <= 0 ? 'Vencido' : `${days} días`) : 'Próximamente',
      cta: 'Ver contrato',
      href: c.id ? `/portal/contracts/${c.id}` : '/portal/contracts',
    })
  })

  const highPriority = pendingActions.filter((a) => a.priority === 'high').length

  /* ---- Quick links: estáticos, navegación interna ---- */
  const quickLinks = [
    { label: 'Abrir ticket', icon: LifeBuoy, accent: 'amber', desc: 'Cuéntanos un problema o duda', href: '/portal/tickets/new' },
    { label: 'Ver presupuestos', icon: ClipboardList, accent: 'cyan', desc: 'Revisa y aprueba propuestas', href: '/portal/quotes' },
    { label: 'Subir documento', icon: Upload, accent: 'cyan', desc: 'Compártenos un brief o archivo', href: '/portal/documents' },
    { label: 'Buscar', icon: Search, accent: 'blue', desc: 'Recibos, contratos, briefs…', href: '/portal/documents' },
  ]

  return (
    <div>
      {/* ============== Welcome header ============== */}
      <div className="dash-welcome">
        <div>
          <div className="dash-welcome-date">{dateStr}</div>
          <h1 className="dash-welcome-title">
            {greetingFor(today)}, {firstName}
          </h1>
          {highPriority > 0 ? (
            <p className="dash-welcome-sub">
              Tienes <strong className="urgent">{highPriority} {highPriority === 1 ? 'tarea urgente' : 'tareas urgentes'}</strong> esperando
              {invoices.next_due && nextInvoiceDays != null
                ? ` · próxima factura vence en ${nextInvoiceDays} días`
                : ''}
            </p>
          ) : (
            <p className="dash-welcome-sub">Aquí tienes el resumen de tu actividad.</p>
          )}
        </div>
        <div className="dash-welcome-actions">
          <button type="button" className="pr-btn ghost sm">
            <Bell size={14} />
            {tickets.open != null && tickets.open > 0 ? tickets.open : 0}
          </button>
          <Link href="/portal/tickets/new" className="pr-btn primary sm">
            <Plus size={14} />
            Nuevo ticket
          </Link>
        </div>
      </div>

      {/* ============== KPI strip ============== */}
      <div className="dash-kpi-row">
        {kpis.map((k) => (
          <KPICard key={k.key} {...k} />
        ))}
      </div>

      {/* ============== Pending actions + Financial summary ============== */}
      <div className="dash-grid">
        <div className="dash-card-flush">
          <div className="dash-card-flush-head">
            <div className="pr-card-head-icon pr-accent-amber">
              <Bell size={16} />
            </div>
            <div className="head-meta">
              <div className="head-title">Tu atención</div>
              <div className="head-sub">
                {pendingActions.length === 0
                  ? 'Todo al día, nada pendiente'
                  : `${pendingActions.length} ${pendingActions.length === 1 ? 'acción pendiente' : 'acciones pendientes'} · ordenadas por urgencia`}
              </div>
            </div>
            {highPriority > 0 && (
              <span className="pr-badge red">
                <span className="pr-badge-dot" />
                {highPriority} {highPriority === 1 ? 'urgente' : 'urgentes'}
              </span>
            )}
          </div>
          {pendingActions.length === 0 ? (
            <div className="pr-empty" style={{ padding: '40px 24px' }}>
              <div className="pr-empty-art">
                <CheckCircle2 size={28} style={{ color: 'var(--pr-accent-green)' }} />
              </div>
              <h3 className="pr-empty-title">Sin acciones pendientes</h3>
              <p className="pr-empty-desc">No tienes facturas, presupuestos ni contratos esperando tu respuesta.</p>
            </div>
          ) : (
            pendingActions.map((a) => {
              const Icon = a.icon
              return (
                <div key={a.id} className="dash-action-row">
                  <span className={`dash-action-prio ${a.priority}`} />
                  <div
                    className={`pr-card-head-icon pr-accent-${a.accent}`}
                    style={{ width: 36, height: 36, flexShrink: 0 }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="dash-action-body">
                    <div className="dash-action-title">{a.title}</div>
                    <div className="dash-action-desc">{a.desc}</div>
                  </div>
                  <div className="dash-action-side">
                    <div className={`dash-action-due ${a.priority === 'high' ? 'urgent' : ''}`}>
                      {a.due}
                    </div>
                    <Link
                      href={a.href}
                      className={`dash-action-cta ${a.priority === 'high' ? 'danger' : ''}`}
                    >
                      {a.cta}
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <FinancialSummary invoices={invoices} currency={currency} />
      </div>

      {/* ============== Active projects ============== */}
      <div style={{ marginBottom: 16 }}>
        <div className="dash-card-flush">
          <div className="dash-card-flush-head">
            <div className="pr-card-head-icon pr-accent-cyan">
              <FolderKanban size={16} />
            </div>
            <div className="head-meta">
              <div className="head-title">Tus proyectos</div>
              <div className="head-sub">
                {recentProjects.length
                  ? `${recentProjects.length} con actividad · click para ver detalle`
                  : 'Sin proyectos activos'}
              </div>
            </div>
            <Link href="/portal/projects">Ver todos →</Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="pr-empty" style={{ padding: '40px 24px' }}>
              <div className="pr-empty-art">
                <FolderKanban size={28} />
              </div>
              <h3 className="pr-empty-title">Aún no tienes proyectos</h3>
              <p className="pr-empty-desc">Cuando arranquemos un proyecto contigo aparecerá aquí con su progreso y equipo.</p>
            </div>
          ) : (
            <div className="dash-projects-grid">
              {recentProjects.map((p) => (
                <ProjectTile key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============== Próximos hitos + Mensajes recientes ============== */}
      {(upcomingMilestones.length > 0 || recentMessages.length > 0) && (
        <div className="dash-grid-half">
          {upcomingMilestones.length > 0 && (
            <UpcomingMilestonesCard milestones={upcomingMilestones} />
          )}
          {recentMessages.length > 0 && (
            <RecentMessagesCard messages={recentMessages} />
          )}
        </div>
      )}

      {/* ============== Recurring services + Quotes overview ============== */}
      {(recurring.active_count > 0 || (quotes.latest && quotes.latest.length > 0)) && (
        <div className="dash-grid-half">
          <RecurringCard recurring={recurring} currency={currency} />
          <QuotesOverviewCard quotes={quotes} currency={currency} />
        </div>
      )}

      {/* ============== Recent activity + Quick links ============== */}
      <div className="dash-grid">
        <div className="dash-card-flush">
          <div className="dash-card-flush-head">
            <div className="pr-card-head-icon pr-accent-blue">
              <Activity size={16} />
            </div>
            <div className="head-meta">
              <div className="head-title">Actividad reciente</div>
              <div className="head-sub">
                {recentActivity.length
                  ? `Últimas ${recentActivity.length} acciones del equipo`
                  : 'Sin movimientos recientes'}
              </div>
            </div>
            <Link href="/portal/activity">Ver todo →</Link>
          </div>
          {recentActivity.length === 0 ? (
            <div className="pr-empty" style={{ padding: '40px 24px' }}>
              <div className="pr-empty-art">
                <Activity size={28} />
              </div>
              <p className="pr-empty-desc">Aún no hay actividad para mostrar.</p>
            </div>
          ) : (
            <div className="dash-activity-list">
              {recentActivity.slice(0, 6).map((a, i) => {
                const meta = activityMeta(a.type)
                const Icon = meta.icon
                return (
                  <div key={i} className="dash-activity-row">
                    <div
                      className={`pr-card-head-icon pr-accent-${meta.accent}`}
                      style={{ width: 28, height: 28, flexShrink: 0 }}
                    >
                      <Icon size={13} />
                    </div>
                    <div className="dash-activity-text">{a.message}</div>
                    <div className="dash-activity-time">{getRelative(a.date)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="pr-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div className="pr-card-head-icon pr-accent-cyan">
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Atajos</div>
              <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 2 }}>
                Acciones rápidas
              </div>
            </div>
          </div>
          <div className="dash-quick-grid">
            {quickLinks.map((q) => {
              const Icon = q.icon
              return (
                <Link key={q.label} href={q.href} className="dash-quick-tile">
                  <div
                    className={`pr-card-head-icon pr-accent-${q.accent}`}
                    style={{ width: 32, height: 32 }}
                  >
                    <Icon size={14} />
                  </div>
                  <div>
                    <div className="dash-quick-label">{q.label}</div>
                    <div className="dash-quick-desc">{q.desc}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============== Toasts ============== */}
      <div className="pr-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="pr-toast">
            <CheckCircle2 size={14} /> {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================== sub components ============================== */

function ProjectTile({ project }) {
  const statusBadge = projectStatusBadge(project.phase || project.status)
  const phaseLabel = project.phase_label || statusBadge.label
  const team = Array.isArray(project.team)
    ? project.team
    : Array.isArray(project.team_members)
      ? project.team_members
      : []
  const teamInitials = team
    .map((m) => (typeof m === 'string' ? m : (m?.initials || getInitials(m?.name))))
    .filter(Boolean)
    .slice(0, 4)

  const nextLine = project.next_milestone
    ? project.next_milestone
    : project.estimated_end_date
      ? `Estimado ${formatDateLong(project.estimated_end_date)}`
      : null

  return (
    <Link href={`/portal/projects/${project.id}`} className="dash-project-card">
      <div className="dash-project-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="dash-project-name">{project.name}</div>
          {project.description && (
            <div className="dash-project-sub">{project.description}</div>
          )}
        </div>
        <span className={`pr-badge ${statusBadge.color}`} style={{ fontSize: 10, padding: '2px 8px' }}>
          <span className="pr-badge-dot solo" />
          {phaseLabel}
        </span>
      </div>
      <div>
        <div className="dash-project-progress-row">
          <span className="dash-project-progress-label">Progreso</span>
          <span className="dash-project-progress-value">{project.progress ?? 0}%</span>
        </div>
        <div className="pr-progress-bar" style={{ height: 4 }}>
          <div className="pr-progress-bar-fill" style={{ width: `${project.progress ?? 0}%` }} />
        </div>
      </div>
      <div className="dash-project-foot">
        {teamInitials.length > 0 && (
          <div className="dash-avatars">
            {teamInitials.map((m, i) => (
              <div key={i} className="dash-avatar">{m}</div>
            ))}
          </div>
        )}
        {nextLine && <div className="dash-project-next">{nextLine}</div>}
      </div>
    </Link>
  )
}

function projectStatusBadge(status) {
  const map = {
    in_progress: { label: 'En progreso', color: 'cyan' },
    in_development: { label: 'En desarrollo', color: 'cyan' },
    review: { label: 'Revisión', color: 'amber' },
    completed: { label: 'Completado', color: 'green' },
    paused: { label: 'Pausado', color: 'gray' },
    cancelled: { label: 'Cancelado', color: 'red' },
    preliminary: { label: 'Preliminar', color: 'blue' },
    maintenance: { label: 'Mantenimiento', color: 'cyan' },
  }
  return map[status] || { label: status || 'Activo', color: 'gray' }
}

function activityMeta(type) {
  const map = {
    ticket_reply: { icon: MessageSquare, accent: 'green' },
    ticket_resolved: { icon: CheckCircle2, accent: 'green' },
    invoice_created: { icon: Receipt, accent: 'amber' },
    invoice_paid: { icon: CheckCircle2, accent: 'green' },
    project_update: { icon: FolderKanban, accent: 'cyan' },
    milestone: { icon: Flag, accent: 'cyan' },
    quote_created: { icon: ClipboardList, accent: 'amber' },
    contract_signed: { icon: FileSignature, accent: 'cyan' },
    document_uploaded: { icon: Download, accent: 'cyan' },
    message: { icon: MessageSquare, accent: 'green' },
  }
  return map[type] || { icon: Activity, accent: 'blue' }
}

/* ============================== Upcoming milestones ============================== */

function UpcomingMilestonesCard({ milestones }) {
  const list = Array.isArray(milestones) ? milestones.slice(0, 4) : []
  if (list.length === 0) return null

  const thisWeek = list.filter((m) => {
    const days = getDaysUntil(m.date)
    return days != null && days >= 0 && days <= 7
  }).length
  const upcoming = list.length - thisWeek

  return (
    <div className="dash-card-flush">
      <div className="dash-card-flush-head">
        <div className="pr-card-head-icon pr-accent-cyan">
          <Calendar size={16} />
        </div>
        <div className="head-meta">
          <div className="head-title">Próximos hitos</div>
          <div className="head-sub">
            {thisWeek > 0
              ? `${thisWeek} esta semana${upcoming > 0 ? ` · ${upcoming} próximos` : ''}`
              : `${list.length} ${list.length === 1 ? 'próximo' : 'próximos'}`}
          </div>
        </div>
      </div>
      <div>
        {list.map((m, i) => {
          const dt = m.date ? new Date(m.date) : null
          const day = dt ? String(dt.getDate()).padStart(2, '0') : '--'
          const month = dt
            ? dt.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
            : ''
          const dayOfWeek = dt
            ? dt.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')
            : ''
          const isCurrent = m.status === 'current'
          return (
            <div
              key={m.id || i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 20px',
                borderBottom: i < list.length - 1 ? '1px solid var(--pr-border)' : 'none',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: isCurrent ? 'var(--pr-cyan-bg)' : 'rgba(248,249,250,0.04)',
                  border: isCurrent ? '1px solid var(--pr-cyan-border)' : '1px solid var(--pr-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--pr-text-muted)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {month}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: isCurrent ? 'var(--pr-accent-cyan)' : 'var(--pr-text-primary)',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {day}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                  {m.title || 'Hito sin título'}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--pr-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {[m.project, dayOfWeek].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================== Recent messages ============================== */

function RecentMessagesCard({ messages }) {
  const list = Array.isArray(messages) ? messages.slice(0, 4) : []
  if (list.length === 0) return null
  const unread = list.filter((m) => m.unread).length

  return (
    <div className="dash-card-flush">
      <div className="dash-card-flush-head">
        <div className="pr-card-head-icon pr-accent-green">
          <MessageSquare size={16} />
        </div>
        <div className="head-meta">
          <div className="head-title">Mensajes recientes</div>
          <div className="head-sub">
            {unread > 0
              ? `${unread} sin leer`
              : `${list.length} ${list.length === 1 ? 'mensaje' : 'mensajes'}`}
          </div>
        </div>
      </div>
      <div>
        {list.map((m, i) => {
          const initials = m.avatar || getInitials(m.author)
          return (
            <div
              key={m.id || i}
              style={{
                display: 'flex',
                gap: 12,
                padding: '14px 20px',
                borderBottom: i < list.length - 1 ? '1px solid var(--pr-border)' : 'none',
                position: 'relative',
              }}
            >
              {m.unread && (
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 4,
                    height: 28,
                    background: 'var(--pr-accent-cyan)',
                  }}
                />
              )}
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--pr-bg-card-hover)',
                  border: '1px solid var(--pr-border-strong)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--pr-font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--pr-accent-cyan)',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: m.unread ? 600 : 500 }}>
                    {m.author || 'Sin autor'}
                  </span>
                  {m.time && (
                    <span style={{ fontSize: 11, color: 'var(--pr-text-muted)', flexShrink: 0 }}>
                      {m.time}
                    </span>
                  )}
                </div>
                {m.project && (
                  <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginBottom: 4 }}>
                    {m.project}
                  </div>
                )}
                {m.preview && (
                  <div
                    style={{
                      fontSize: 12,
                      color: m.unread ? 'var(--pr-text-primary)' : 'var(--pr-text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.preview}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================== Financial summary ============================== */

function FinancialSummary({ invoices, currency }) {
  const ys = invoices?.year_summary
  const hasYear = ys && (ys.invoiced || ys.paid || ys.pending)
  const monthly = Array.isArray(invoices?.monthly_history) ? invoices.monthly_history : null

  const totalInvoiced = monthly
    ? monthly.reduce((s, f) => s + (Number(f.invoiced) || 0), 0)
    : Number(ys?.invoiced) || 0
  const totalPaid = monthly
    ? monthly.reduce((s, f) => s + (Number(f.paid) || 0), 0)
    : Number(ys?.paid) || 0
  const pending = monthly ? totalInvoiced - totalPaid : Number(ys?.pending) || 0

  return (
    <div className="pr-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="pr-card-head-icon pr-accent-green">
          <CreditCard size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Resumen financiero</div>
          <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 2 }}>
            {monthly ? 'Últimos 6 meses' : ys ? `Año ${ys.year}` : 'Sin datos del año'}
          </div>
        </div>
        <Link
          href="/portal/invoices"
          style={{ fontSize: 12, color: 'var(--pr-accent-cyan)', textDecoration: 'none' }}
        >
          Ver facturas →
        </Link>
      </div>

      {hasYear || monthly ? (
        <>
          <div className="dash-fin-stats">
            <div>
              <div className="label">Facturado</div>
              <div className="value">{formatRound(totalInvoiced, currency)}</div>
            </div>
            <div>
              <div className="label">Cobrado</div>
              <div className="value green">{formatRound(totalPaid, currency)}</div>
            </div>
            <div>
              <div className="label">Pendiente</div>
              <div className={`value ${pending > 0 ? 'amber' : ''}`}>{formatRound(pending, currency)}</div>
            </div>
          </div>

          {monthly && monthly.length > 0 ? (
            <FinancialBars history={monthly} />
          ) : (
            <div style={{ borderTop: '1px solid var(--pr-border)', paddingTop: 12 }}>
              <div className="pr-progress-bar">
                <div
                  className="pr-progress-bar-fill"
                  style={{
                    width: `${totalInvoiced ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 0}%`,
                    background: 'var(--pr-accent-green)',
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 8 }}>
                {totalInvoiced
                  ? `${Math.round((totalPaid / totalInvoiced) * 100)}% cobrado`
                  : 'Sin facturación este año'}
              </div>
            </div>
          )}

          <div className="dash-fin-legend">
            <span><i style={{ background: 'var(--pr-accent-green)' }} /> Cobrado</span>
            <span><i style={{ background: 'var(--pr-accent-amber)' }} /> Pendiente</span>
          </div>
        </>
      ) : (
        <div className="pr-empty" style={{ padding: '24px 12px' }}>
          <div className="pr-empty-art">
            <CreditCard size={28} />
          </div>
          <p className="pr-empty-desc">Aún no hay facturas emitidas este año.</p>
        </div>
      )}
    </div>
  )
}

function FinancialBars({ history }) {
  const max = Math.max(...history.map((f) => Number(f.invoiced) || 0), 1)
  return (
    <div className="dash-fin-bars">
      {history.map((f, i) => {
        const invoiced = Number(f.invoiced) || 0
        const paid = Number(f.paid) || 0
        const pendH = max ? ((invoiced - paid) / max) * 80 : 0
        const paidH = max ? (paid / max) * 80 : 0
        return (
          <div key={i} className="dash-fin-bar-col">
            <div className="dash-fin-bar-stack">
              {pendH > 0 && (
                <div className="dash-fin-bar-pending" style={{ height: pendH }} />
              )}
              {paidH > 0 && (
                <div className="dash-fin-bar-paid" style={{ height: paidH }} />
              )}
            </div>
            <div className="dash-fin-bar-month">{f.month}</div>
          </div>
        )
      })}
    </div>
  )
}

/* ============================== Recurring services ============================== */

function RecurringCard({ recurring, currency }) {
  if (!recurring || !recurring.active_count) return null
  return (
    <div className="pr-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="pr-card-head-icon pr-accent-cyan">
          <Repeat size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Servicios recurrentes</div>
          <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 2 }}>
            {recurring.active_count} {recurring.active_count === 1 ? 'activo' : 'activos'}
          </div>
        </div>
        <Link
          href="/portal/contracts"
          style={{ fontSize: 12, color: 'var(--pr-accent-cyan)', textDecoration: 'none' }}
        >
          Ver todos →
        </Link>
      </div>

      {recurring.next_billing && (
        <div className="dash-recurring">
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10,
              color: 'var(--pr-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}>
              Próximo cobro
            </div>
            <div style={{ fontSize: 13, color: 'var(--pr-text-secondary)', marginTop: 2 }}>
              {formatDateLong(recurring.next_billing.date)}
            </div>
          </div>
          <span className="dash-recurring-amount">
            {formatMoney(
              recurring.next_billing.total,
              resolveCurrency(recurring.next_billing.currency, recurring.currency, currency),
            )}
          </span>
        </div>
      )}

      {(recurring.expiring_soon || []).length > 0 && (
        <div style={{ marginTop: 8 }}>
          {recurring.expiring_soon.map((c, i) => (
            <div key={i} className="dash-recurring-warn">
              <AlertTriangle size={14} />
              <span>
                {c.contract_number} expira el {formatDateLong(c.end_date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================== Quotes overview ============================== */

function QuotesOverviewCard({ quotes, currency }) {
  const list = Array.isArray(quotes?.latest) ? quotes.latest : []
  if (list.length === 0 && !(quotes?.pending > 0)) return null

  return (
    <div className="pr-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="pr-card-head-icon pr-accent-amber">
          <ClipboardList size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Presupuestos por revisar</div>
          <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 2 }}>
            {quotes.pending ?? list.length} {(quotes.pending ?? list.length) === 1 ? 'pendiente' : 'pendientes'}
            {quotes.pending_amount
              ? ` · ${formatRound(quotes.pending_amount, resolveCurrency(quotes.currency, currency))} en total`
              : ''}
          </div>
        </div>
        <Link
          href="/portal/quotes"
          style={{ fontSize: 12, color: 'var(--pr-accent-cyan)', textDecoration: 'none' }}
        >
          Ver todos →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.slice(0, 3).map((q) => (
          <Link
            key={q.id}
            href={`/portal/quotes/${q.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(248,249,250,0.04)',
              border: '1px solid var(--pr-border)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all var(--pr-t-base)',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--pr-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {q.quote_number}{q.title ? ` — ${q.title}` : ''}
              </div>
              {q.valid_until && (
                <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 2 }}>
                  Válido hasta {formatDateLong(q.valid_until)}
                </div>
              )}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              marginLeft: 12,
              flexShrink: 0,
            }}>
              {formatMoney(q.total, resolveCurrency(q.currency, quotes.currency, currency))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
