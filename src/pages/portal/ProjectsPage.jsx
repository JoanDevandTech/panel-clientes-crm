import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'wouter'
import {
  ArrowLeft,
  Download,
  Plus,
  Search,
  FolderKanban,
  Calendar,
  MessageSquare,
  CreditCard,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Flag,
  Users,
  Activity,
  Ticket,
  ChevronRight,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import './projects-list.css'

/* ============================================================
   Mappings backend ↔ UI
   ============================================================ */

// El backend hoy devuelve `status` (in_progress | completed | paused | cancelled)
// y, en detalle, `phase` (preliminary | in_development | in_progress | review |
// completed | maintenance | paused | cancelled). Aquí soportamos ambos.
const PHASE_META = {
  preliminary:    { label: 'Preliminar',    badge: 'blue' },
  in_development: { label: 'En desarrollo', badge: 'cyan' },
  in_progress:    { label: 'En progreso',   badge: 'cyan' },
  review:         { label: 'Revisión',      badge: 'amber' },
  completed:      { label: 'Completado',    badge: 'green' },
  maintenance:    { label: 'Mantenimiento', badge: 'cyan' },
  paused:         { label: 'Pausado',       badge: 'gray' },
  cancelled:      { label: 'Cancelado',     badge: 'red' },
}

const ACTIVE_PHASES = new Set(['in_progress', 'in_development', 'review', 'preliminary'])

const HEALTH_META = {
  good:    { Icon: CheckCircle2, defaultLabel: 'En plazo' },
  warning: { Icon: AlertCircle,  defaultLabel: 'Atención' },
  risk:    { Icon: AlertTriangle, defaultLabel: 'Riesgo' },
}

const COVER_PALETTE = [
  { hue: 280 }, { hue: 145 }, { hue: 32 },
  { hue: 195 }, { hue: 260 }, { hue: 0  }, { hue: 200 },
]

// Krom: los avatares no se colorean por persona — superficie + borde + inicial en mono.
const AVATAR_BG = 'var(--pr-bg-card-hover)'

/* ====================== Helpers ====================== */

function hashStr(s = '') {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function deriveCover(p) {
  if (p?.cover && (p.cover.hue != null || p.cover.glyph)) return p.cover
  const seed = hashStr(p?.code || p?.name || String(p?.id ?? ''))
  const palette = COVER_PALETTE[seed % COVER_PALETTE.length]
  const initials = (p?.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '·'
  return { hue: palette.hue, glyph: initials }
}

function deriveTeam(p) {
  const members = Array.isArray(p?.team) ? p.team : []
  return members.map((m, idx) => ({
    name: m.name || m.full_name || 'Miembro',
    avatar:
      m.avatar ||
      (m.name || m.full_name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join(''),
    color: m.color || AVATAR_BG,
  }))
}

function getPhaseKey(p) {
  return p?.phase || p?.status || 'in_progress'
}

function deriveHealth(p) {
  const kind = p?.health || 'good'
  return {
    kind,
    label: p?.healthLabel || HEALTH_META[kind]?.defaultLabel || '—',
  }
}

function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null
  const a = new Date(fromIso).getTime()
  const b = new Date(toIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86_400_000)
}

function deriveDaysRemaining(p) {
  if (typeof p?.daysRemaining === 'number' || p?.daysRemaining === null) return p.daysRemaining
  const phase = getPhaseKey(p)
  const target =
    phase === 'completed'
      ? p?.warranty_until
      : p?.estimated_end_date || p?.estimated_date || p?.warranty_until
  return daysBetween(new Date().toISOString(), target)
}

function fmtDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function deriveBudget(p) {
  if (p?.budget && typeof p.budget === 'object') return p.budget
  return null
}

function deriveMilestones(p) {
  const m = p?.milestones_summary || p?.milestones
  if (m && typeof m === 'object' && m.total != null) return m
  return null
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

/* ====================== KPI tile ====================== */

function KpiTile({ Icon, accent, value, label, sub }) {
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

/* ====================== Filter bar ====================== */

function FilterBar({ filter, onChange, query, onQuery, sort, onSort, groups, sortOptions }) {
  return (
    <div className="pr-filterbar">
      <div className="pr-filterbar-tabs">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => onChange(g.key)}
            className={`pr-filter-tab ${filter === g.key ? 'active' : ''}`}
          >
            {g.label}
            <span className="pr-filter-tab-count">{g.count}</span>
          </button>
        ))}
      </div>
      <div className="pr-filterbar-right">
        <div className="pr-search" style={{ width: 240 }}>
          <Search size={14} />
          <input
            placeholder="Buscar por nombre o código…"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
        <select className="pr-select" value={sort} onChange={(e) => onSort(e.target.value)}>
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value} style={{ background: 'var(--pr-bg-primary)' }}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

/* ====================== Project card ====================== */

function ProgressWithMarkers({ progress, milestones, deliverables, phase }) {
  const total = milestones?.total ?? 0
  const done = milestones?.done ?? 0
  const current = milestones?.current ?? 0
  const late = milestones?.late ?? 0

  return (
    <div>
      <div className="pl-progress-head">
        <div className="pl-progress-meta">
          {total > 0 ? (
            <span className="accent">
              {done}/{total} hitos completados
            </span>
          ) : (
            <span className="accent">Progreso</span>
          )}
          {current > 0 && (
            <>
              <span className="sep">·</span>
              <span className="warn">{current} en curso</span>
            </>
          )}
          {late > 0 && (
            <>
              <span className="sep">·</span>
              <span className="risk">{late} desplazado</span>
            </>
          )}
          {typeof deliverables === 'number' && (
            <>
              <span className="sep">·</span>
              <span>{deliverables} entregables</span>
            </>
          )}
        </div>
        <div className="pl-progress-pct">{progress}%</div>
      </div>
      {total > 0 ? (
        <div className="pl-segments">
          {Array.from({ length: total }).map((_, i) => {
            const isDone = i < done
            const isCurrent = i === done && current > 0
            const isLate = i === total - 1 && late > 0 && phase !== 'completed'
            const cls = isLate ? 'late' : isCurrent ? 'current' : isDone ? 'done' : ''
            return <div key={i} className={`pl-seg ${cls}`} />
          })}
        </div>
      ) : (
        <div className="pr-progress-bar">
          <div className="pr-progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }) {
  const phaseKey = getPhaseKey(project)
  const phase = PHASE_META[phaseKey] ?? { label: project?.phase_label || project?.status_label || 'En curso', badge: 'gray' }
  const phaseLabel = project?.phase_label || phase.label
  const cover = deriveCover(project)
  const team = deriveTeam(project)
  const lead = project?.lead || team[0]?.name
  const health = deriveHealth(project)
  const HealthIcon = HEALTH_META[health.kind]?.Icon || CheckCircle2
  const days = deriveDaysRemaining(project)
  const progress = project?.progress_percentage ?? project?.progress ?? 0
  const milestones = deriveMilestones(project)
  const deliverables = project?.deliverables_count ?? project?.deliverables
  const budget = deriveBudget(project)
  const budgetPct = budget?.total ? Math.round((budget.paid / budget.total) * 100) : 0
  const alerts = Array.isArray(project?.alerts) ? project.alerts : []
  const code = project?.code || `PROJ-${String(project?.id ?? '').padStart(4, '0')}`
  const sub = project?.sub || project?.short_description || project?.category

  const showDelivery = days != null && phaseKey !== 'maintenance' && phaseKey !== 'completed'
  const showWarranty = phaseKey === 'completed' && days != null

  return (
    <Link to={`/portal/projects/${project?.id}`} className="pl-card">
      <div
        className="pl-cover"
        style={{
          background: 'var(--pr-bg-card-hover)',
          backgroundImage: `linear-gradient(135deg, rgba(0, 229, 255, ${0.05 + (cover.hue % 5) * 0.02}) 0%, transparent 62%)`,
        }}
      >
        <div className="pl-cover-glyph">{cover.glyph}</div>
        {project?.pinned && (
          <div className="pl-cover-pin">
            <Bookmark size={14} fill="currentColor" />
          </div>
        )}
      </div>

      <div className="pl-body">
        <div className="pl-toprow">
          <div className="pl-title-block">
            <div className="pl-title-row">
              <h3 className="pl-title">{project?.name}</h3>
              <span className={`pr-badge ${phase.badge}`}>
                <span className="pr-badge-dot" />
                {phaseLabel}
              </span>
              <span className={`pl-health ${health.kind}`}>
                <HealthIcon size={10} strokeWidth={2} />
                {health.label}
              </span>
            </div>
            <div className="pl-meta">
              {sub && <span>{sub}</span>}
              {sub && <span className="pl-meta-sep">·</span>}
              <span className="pl-code">{code}</span>
            </div>
          </div>

          <div className="pl-deadline">
            {showDelivery && (
              <div>
                <div className="pl-deadline-label">Entrega en</div>
                <div className={`pl-deadline-value ${days <= 30 ? 'warn' : ''}`}>
                  {days}
                  <span className="pl-deadline-value-unit">días</span>
                </div>
              </div>
            )}
            {showWarranty && (
              <div>
                <div className="pl-deadline-label">Garantía</div>
                <div className="pl-deadline-value good">
                  {days}
                  <span className="pl-deadline-value-unit">días</span>
                </div>
              </div>
            )}
            <span className="pl-open-btn">
              Abrir <ChevronRight size={12} />
            </span>
          </div>
        </div>

        <ProgressWithMarkers
          progress={progress}
          milestones={milestones}
          deliverables={deliverables}
          phase={phaseKey}
        />

        <div className="pl-bottom">
          <div>
            <div className="pl-cell-label">
              <Flag size={11} /> Próximo hito
            </div>
            {project?.nextMilestone || project?.next_milestone ? (
              (() => {
                const nm = project.nextMilestone || project.next_milestone
                const inDays = nm.inDays ?? nm.in_days
                return (
                  <>
                    <div className="pl-cell-primary">{nm.title || nm.name}</div>
                    <div className="pl-cell-secondary">
                      {nm.date ? fmtDate(nm.date) || nm.date : '—'}
                      {inDays != null && (
                        <>
                          {' · '}
                          <span className={inDays <= 7 ? 'warn' : ''}>en {inDays} días</span>
                        </>
                      )}
                    </div>
                  </>
                )
              })()
            ) : phaseKey === 'completed' ? (
              <div className="pl-cell-secondary">
                Entregado el{' '}
                <strong style={{ color: 'var(--pr-text-primary)', fontWeight: 500 }}>
                  {fmtDate(project?.deliveredDate || project?.delivered_at) || '—'}
                </strong>
              </div>
            ) : (
              <div className="pl-cell-empty">—</div>
            )}
          </div>

          <div>
            <div className="pl-cell-label">
              <Users size={11} /> Equipo
            </div>
            {team.length > 0 ? (
              <div className="pl-team-row">
                <div className="pl-avatars">
                  {team.slice(0, 4).map((m, i) => (
                    <div key={i} title={m.name} className="pl-avatar" style={{ background: m.color }}>
                      {m.avatar}
                    </div>
                  ))}
                  {team.length > 4 && <div className="pl-avatar more">+{team.length - 4}</div>}
                </div>
                {lead && (
                  <div className="pl-team-lead">
                    Lead: <strong>{lead}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="pl-cell-empty">Sin asignar</div>
            )}
          </div>

          <div>
            <div className="pl-cell-label">
              <CreditCard size={11} /> {budget?.recurring ? 'Mensual' : 'Presupuesto'}
            </div>
            {budget ? (
              <>
                <div className="pl-money">{Number(budget.total).toLocaleString('es-ES')} €</div>
                <div className="pl-money-row">
                  <div className="pl-money-bar">
                    <div
                      className={`pl-money-bar-fill ${budgetPct >= 100 ? 'full' : ''}`}
                      style={{ width: `${Math.min(budgetPct, 100)}%` }}
                    />
                  </div>
                  <span className="pl-money-pct">{budgetPct}%</span>
                </div>
              </>
            ) : (
              <div className="pl-cell-empty">—</div>
            )}
          </div>

          <div>
            <div className="pl-cell-label">
              <Activity size={11} /> Última actividad
            </div>
            {project?.lastActivity || project?.last_activity ? (
              <>
                <div className="pl-cell-primary">
                  {project.lastActivity || project.last_activity}
                </div>
                <div className="pl-activity-tags">
                  <span className="ts">
                    {project.lastActivityAt || fmtDate(project.last_activity_at) || ''}
                  </span>
                  {(project.unreadMessages ?? project.unread_messages ?? 0) > 0 && (
                    <span className="msgs">
                      <MessageSquare size={11} />
                      {project.unreadMessages ?? project.unread_messages}
                    </span>
                  )}
                  {(project.openTickets ?? project.open_tickets ?? 0) > 0 && (
                    <span className="tickets">
                      <Ticket size={11} />
                      {project.openTickets ?? project.open_tickets}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="pl-cell-empty">Sin actividad reciente</div>
            )}
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="pl-alerts">
            {alerts.map((al, i) => {
              const kind = al.kind === 'risk' ? 'risk' : al.kind === 'warn' ? 'warn' : 'info'
              const Ico = kind === 'risk' ? AlertTriangle : kind === 'warn' ? AlertCircle : Info
              return (
                <div key={i} className={`pl-alert ${kind}`}>
                  <Ico size={13} strokeWidth={2} />
                  <span className="text">{al.text || al.message}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Link>
  )
}

/* ============================================================
   Page
   ============================================================ */

export default function ProjectsPage() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')

  const { data, loading, error, refetch } = useApi('/client/projects')
  const { data: summaryData, error: summaryError } = useApi('/client/projects/summary')

  const projects = useMemo(() => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    return []
  }, [data])

  const groups = useMemo(() => {
    const isActive = (p) => ACTIVE_PHASES.has(getPhaseKey(p))
    return [
      { key: 'all',         label: 'Todos',         count: projects.length },
      { key: 'active',      label: 'Activos',       count: projects.filter(isActive).length },
      { key: 'completed',   label: 'Completados',   count: projects.filter((p) => getPhaseKey(p) === 'completed').length },
      { key: 'maintenance', label: 'Mantenimiento', count: projects.filter((p) => getPhaseKey(p) === 'maintenance').length },
      { key: 'paused',      label: 'Pausados',      count: projects.filter((p) => getPhaseKey(p) === 'paused').length },
    ]
  }, [projects])

  const kpi = useMemo(() => {
    const fallback = () => {
      const active = projects.filter((p) => ACTIVE_PHASES.has(getPhaseKey(p))).length
      const upcoming = projects.filter((p) => {
        const phase = getPhaseKey(p)
        if (phase === 'completed' || phase === 'maintenance') return false
        const d = deriveDaysRemaining(p)
        return d != null && d <= 30
      }).length
      const unread = projects.reduce(
        (sum, p) => sum + (p.unreadMessages ?? p.unread_messages ?? 0),
        0
      )
      const openTickets = projects.reduce(
        (sum, p) => sum + (p.openTickets ?? p.open_tickets ?? 0),
        0
      )
      const totalBudget = projects.reduce((sum, p) => {
        const b = deriveBudget(p)
        return sum + (b?.total ?? 0)
      }, 0)
      const totalPaid = projects.reduce((sum, p) => {
        const b = deriveBudget(p)
        return sum + (b?.paid ?? 0)
      }, 0)
      return { active, upcoming, unread, openTickets, totalBudget, totalPaid }
    }

    if (summaryError || !summaryData) return fallback()
    const s = summaryData?.data ?? summaryData
    const local = fallback()
    return {
      active: s.active ?? local.active,
      upcoming: s.upcoming_deadlines ?? local.upcoming,
      unread: s.unread_messages ?? local.unread,
      openTickets: s.open_tickets ?? local.openTickets,
      totalBudget: s.total_budget ?? local.totalBudget,
      totalPaid: s.total_paid ?? local.totalPaid,
    }
  }, [projects, summaryData, summaryError])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = projects.filter((p) => {
      const phase = getPhaseKey(p)
      if (filter === 'active') return ACTIVE_PHASES.has(phase)
      if (filter === 'completed') return phase === 'completed'
      if (filter === 'maintenance') return phase === 'maintenance'
      if (filter === 'paused') return phase === 'paused'
      return true
    })
    if (q) {
      rows = rows.filter((p) => {
        const code = (p?.code || '').toLowerCase()
        const name = (p?.name || '').toLowerCase()
        return name.includes(q) || code.includes(q)
      })
    }
    rows = [...rows].sort((a, b) => {
      if (sort === 'name') return (a?.name || '').localeCompare(b?.name || '')
      if (sort === 'progress') {
        return (
          (b?.progress_percentage ?? b?.progress ?? 0) -
          (a?.progress_percentage ?? a?.progress ?? 0)
        )
      }
      if (sort === 'deadline') {
        const da = deriveDaysRemaining(a) ?? Infinity
        const db = deriveDaysRemaining(b) ?? Infinity
        return da - db
      }
      return 0
    })
    return [...rows.filter((p) => p?.pinned), ...rows.filter((p) => !p?.pinned)]
  }, [projects, filter, query, sort])

  const hasPinned = filtered.some((p) => p?.pinned)
  const showPinnedHeader = hasPinned && filter === 'all' && !query
  const pinnedCount = filtered.filter((p) => p?.pinned).length

  if (loading) {
    return (
      <div className="pr-loading">
        <div className="pr-spinner" />
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
          <p className="pr-empty-title">No se pudieron cargar los proyectos</p>
          <p className="pr-empty-desc">{error}</p>
        </div>
        <button type="button" className="pr-btn primary" onClick={refetch}>
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="pr-page-header">
        <Link href="/portal" className="pr-page-crumb">
          <ArrowLeft size={14} /> Volver al dashboard
        </Link>
        <div className="pr-page-header-row">
          <div>
            <h1 className="pr-page-title">Proyectos</h1>
            <p className="pr-page-sub">
              Todo lo que estamos construyendo para ti, en un vistazo.
            </p>
          </div>
          <div className="pl-actions">
            <button type="button" className="pr-btn ghost sm">
              <Download size={14} /> Exportar
            </button>
            <Link href="/portal/tickets/new" className="pr-btn primary sm">
              <Plus size={14} /> Solicitar nuevo proyecto
            </Link>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="pl-kpi-grid">
        <KpiTile
          Icon={FolderKanban}
          accent="cyan"
          value={kpi.active}
          label="Proyectos activos"
          sub={`de ${projects.length} totales`}
        />
        <KpiTile
          Icon={Calendar}
          accent="amber"
          value={kpi.upcoming}
          label="Entregas próximas"
          sub="en los próximos 30 días"
        />
        <KpiTile
          Icon={MessageSquare}
          accent="cyan"
          value={kpi.unread}
          label="Mensajes sin leer"
          sub="en todos tus proyectos"
        />
        <KpiTile
          Icon={CreditCard}
          accent="green"
          value={`${(kpi.totalPaid / 1000).toFixed(1)}k €`}
          label="Pagado este año"
          sub={`de ${(kpi.totalBudget / 1000).toFixed(1)}k € presupuestado`}
        />
      </div>

      {/* Filters */}
      <FilterBar
        filter={filter}
        onChange={setFilter}
        query={query}
        onQuery={setQuery}
        sort={sort}
        onSort={setSort}
        groups={groups}
        sortOptions={[
          { value: 'recent',   label: 'Actividad reciente' },
          { value: 'deadline', label: 'Entrega más próxima' },
          { value: 'progress', label: 'Mayor progreso' },
          { value: 'name',     label: 'A-Z' },
        ]}
      />

      {/* List */}
      {filtered.length === 0 ? (
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art">
              <Search size={32} />
            </div>
            <div>
              <p className="pr-empty-title">Sin resultados</p>
              <p className="pr-empty-desc">
                No encontramos proyectos que coincidan con tu búsqueda o filtro.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {showPinnedHeader && (
            <div className="pl-pinned-label">
              <Bookmark size={11} style={{ color: '#FBBF24' }} /> Destacados
            </div>
          )}
          <motion.div
            className="pl-list"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            key={`${filter}-${sort}-${query}`}
          >
            {filtered.map((p, idx) => (
              <div key={p?.id ?? idx}>
                {showPinnedHeader && idx === pinnedCount && pinnedCount > 0 && (
                  <div className="pl-pinned-label divider">Todos los proyectos</div>
                )}
                <motion.div variants={fadeUp}>
                  <ProjectCard project={p} />
                </motion.div>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
