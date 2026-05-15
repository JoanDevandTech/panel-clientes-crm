import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'wouter'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Download,
  FileSignature,
  FileText,
  Flag,
  Folder,
  Key,
  Laptop,
  Loader2,
  MessageSquare,
  Receipt,
  Search,
  Ticket,
  User,
} from 'lucide-react'
import { api } from '../../services/api'
import './activity.css'

/* -------- Tipos del backend → presentación visual ----------
   El endpoint devuelve { type, message, date, ref?, ... }.
   Mapeamos a icono + acento + label de filtro.
   Si llega un type desconocido cae al default "activity".
----------------------------------------------------------- */
const typeMap = {
  ticket_comment: { icon: MessageSquare, color: 'green', label: 'Mensaje' },
  ticket: { icon: Ticket, color: 'blue', label: 'Ticket' },
  invoice: { icon: Receipt, color: 'amber', label: 'Factura' },
  quote: { icon: Clipboard, color: 'blue', label: 'Presupuesto' },
  contract: { icon: FileSignature, color: 'purple', label: 'Contrato' },
  document: { icon: FileText, color: 'cyan', label: 'Documento' },
  deliverable: { icon: Download, color: 'cyan', label: 'Entregable' },
  milestone: { icon: Flag, color: 'purple', label: 'Hito' },
  session: { icon: Laptop, color: 'blue', label: 'Sesión' },
  credential: { icon: Key, color: 'amber', label: 'Acceso' },
  account: { icon: User, color: 'gray', label: 'Cuenta' },
  activity: { icon: Activity, color: 'gray', label: 'Actividad' },
}

const FILTERS = [
  { key: 'all', label: 'Todo' },
  { key: 'ticket_comment', label: 'Mensajes' },
  { key: 'invoice', label: 'Facturas' },
  { key: 'quote', label: 'Presupuestos' },
  { key: 'contract', label: 'Contratos' },
  { key: 'milestone', label: 'Hitos' },
  { key: 'document', label: 'Documentos' },
  { key: 'session', label: 'Sesiones' },
]

const PER_PAGE = 20

function getEventDate(e) {
  const raw = e?.date ?? e?.created_at ?? e?.occurred_at
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatExact(date) {
  if (!date) return ''
  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getRelative(date) {
  if (!date) return ''
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  const hrs = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  if (hrs < 24) return `Hace ${hrs} h`
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function getGroupKey(date) {
  if (!date) return 'Anterior'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = date.getTime()
  if (t >= startOfToday) return 'Hoy'
  if (t >= startOfToday - 86400000) return 'Ayer'
  if (t >= startOfToday - 6 * 86400000) return 'Esta semana'
  if (t >= startOfToday - 30 * 86400000) return 'Este mes'
  return 'Anterior'
}

const GROUP_ORDER = ['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Anterior']

function refToHref(e) {
  const ref = e?.ref
  if (ref?.type && ref?.id != null) {
    if (ref.type === 'ticket') return `/portal/tickets/${ref.id}`
    if (ref.type === 'invoice') return `/portal/invoices/${ref.id}`
    if (ref.type === 'quote') return `/portal/quotes/${ref.id}`
    if (ref.type === 'contract') return `/portal/contracts/${ref.id}`
    if (ref.type === 'project') return `/portal/projects/${ref.id}`
  }
  return null
}

function ActivityRow({ event, isLast }) {
  const cfg = typeMap[event.type] ?? typeMap.activity
  const Icon = cfg.icon
  const date = getEventDate(event)
  const href = refToHref(event)
  const important = Boolean(event.important)
  const project = event.project ?? event.context?.project ?? null
  const actor = event.actor?.name ?? event.user ?? null

  const text = (
    <>
      {event.message}
      {important && <span className="act-row-important">● Importante</span>}
    </>
  )

  return (
    <div className="act-row">
      <div className="act-row-node">
        <div className={`act-row-icon pr-accent-${cfg.color}${important ? ` important ${cfg.color}` : ''}`}>
          <Icon size={15} />
        </div>
        {!isLast && <div className="act-row-connector" />}
      </div>

      <div className="act-row-content">
        {href ? (
          <Link href={href} className="act-row-text">{text}</Link>
        ) : (
          <span className="act-row-text">{text}</span>
        )}
        {(project || actor) && (
          <div className="act-row-meta">
            {project && (
              <span className="act-row-meta-item">
                <Folder size={10} />
                {project}
              </span>
            )}
            {project && actor && <span className="act-row-meta-sep">·</span>}
            {actor && (
              <span className="act-row-meta-item">
                <User size={10} />
                {actor}
              </span>
            )}
            {href && (
              <>
                <span className="act-row-meta-sep">·</span>
                <Link href={href} className="act-row-meta-item" style={{ color: 'var(--pr-accent-purple)' }}>
                  Abrir <ChevronRight size={10} />
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <div className="act-row-time" title={formatExact(date)}>
        {getRelative(date)}
      </div>
    </div>
  )
}

export default function ActivityPage() {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [events, setEvents] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  const fetchActivity = useCallback(async (targetPage, append) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        per_page: String(PER_PAGE),
      })
      if (filter !== 'all') params.set('type', filter)
      const response = await api.get(`/client/activity?${params.toString()}`)
      const fresh = response?.data ?? []
      setEvents((prev) => (append ? [...prev, ...fresh] : fresh))
      setMeta(response?.meta ?? null)
    } catch (err) {
      setError(err?.message || 'Error al cargar actividad.')
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [filter])

  // Reset al cambiar filtro
  useEffect(() => {
    setPage(1)
    fetchActivity(1, false)
  }, [filter, fetchActivity])

  const changeFilter = (key) => {
    if (key === filter) return
    setFilter(key)
  }

  const loadMore = () => {
    if (!meta || page >= meta.last_page || loadingMore) return
    const next = page + 1
    setPage(next)
    fetchActivity(next, true)
  }

  // ---------- Filtrado local por búsqueda ----------
  const filtered = useMemo(() => {
    if (!query.trim()) return events
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      const haystack = [
        e.message,
        e.project,
        e.context?.project,
        e.actor?.name,
        e.user,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [events, query])

  // ---------- KPIs sobre eventos cargados ----------
  const kpis = useMemo(() => {
    let today = 0
    let week = 0
    let important = 0
    const projects = new Set()
    const startOfToday = (() => {
      const n = new Date()
      return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()
    })()
    for (const e of events) {
      const d = getEventDate(e)
      if (d) {
        const t = d.getTime()
        if (t >= startOfToday) today += 1
        if (t >= startOfToday - 6 * 86400000) week += 1
      }
      if (e.important) important += 1
      const p = e.project ?? e.context?.project
      if (p) projects.add(p)
    }
    return { today, week, important, projects: projects.size }
  }, [events])

  // ---------- Agrupado por sección ----------
  const grouped = useMemo(() => {
    const map = {}
    for (const e of filtered) {
      const g = getGroupKey(getEventDate(e))
      if (!map[g]) map[g] = []
      map[g].push(e)
    }
    return GROUP_ORDER.filter((g) => map[g]).map((g) => ({ key: g, items: map[g] }))
  }, [filtered])

  // ---------- Counts por filtro (sobre eventos cargados) ----------
  const filterCounts = useMemo(() => {
    const counts = { all: events.length }
    for (const e of events) {
      const k = e.type
      if (!counts[k]) counts[k] = 0
      counts[k] += 1
    }
    return counts
  }, [events])

  return (
    <div>
      {/* ---------- Header ---------- */}
      <div className="pr-page-header">
        <Link href="/portal/dashboard" className="pr-page-crumb">
          <ArrowLeft size={14} /> Volver al dashboard
        </Link>
        <div className="pr-page-header-row">
          <div>
            <h1 className="pr-page-title">Actividad</h1>
            <p className="pr-page-sub">
              Historial completo de eventos en tu cuenta — proyectos, facturación, accesos y seguridad.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="pr-btn ghost sm" disabled title="Próximamente">
              <Download size={14} /> Exportar
            </button>
          </div>
        </div>
      </div>

      {/* ---------- KPIs ---------- */}
      <div className="act-kpi-grid">
        <div className="pr-kpi">
          <div className="pr-kpi-head">
            <div className="pr-kpi-icon pr-accent-purple"><Activity size={14} /></div>
            <div className="pr-kpi-label">Eventos hoy</div>
          </div>
          <div className="pr-kpi-value">{kpis.today}</div>
          <div className="pr-kpi-sub">actividad reciente</div>
        </div>
        <div className="pr-kpi">
          <div className="pr-kpi-head">
            <div className="pr-kpi-icon pr-accent-cyan"><Calendar size={14} /></div>
            <div className="pr-kpi-label">Esta semana</div>
          </div>
          <div className="pr-kpi-value">{kpis.week}</div>
          <div className="pr-kpi-sub">eventos registrados</div>
        </div>
        <div className="pr-kpi">
          <div className="pr-kpi-head">
            <div className="pr-kpi-icon pr-accent-amber"><AlertCircle size={14} /></div>
            <div className="pr-kpi-label">Importantes</div>
          </div>
          <div className="pr-kpi-value">{kpis.important}</div>
          <div className="pr-kpi-sub">requirieron atención</div>
        </div>
        <div className="pr-kpi">
          <div className="pr-kpi-head">
            <div className="pr-kpi-icon pr-accent-green"><Folder size={14} /></div>
            <div className="pr-kpi-label">Proyectos</div>
          </div>
          <div className="pr-kpi-value">{kpis.projects}</div>
          <div className="pr-kpi-sub">con actividad</div>
        </div>
      </div>

      {/* ---------- Filter bar ---------- */}
      <div className="pr-filterbar">
        <div className="pr-filterbar-tabs">
          {FILTERS.map((f) => {
            const count = filterCounts[f.key] ?? 0
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => changeFilter(f.key)}
                className={`pr-filter-tab${filter === f.key ? ' active' : ''}`}
              >
                {f.label}
                <span className="pr-filter-tab-count">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="pr-filterbar-right">
          <div className="pr-search">
            <Search size={14} />
            <input
              type="search"
              placeholder="Buscar eventos…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ---------- Error inline (sin tirar la lista cargada) ---------- */}
      {error && (
        <div className="act-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" className="pr-btn sm" onClick={() => fetchActivity(page, page > 1)}>
            Reintentar
          </button>
        </div>
      )}

      {/* ---------- Loading inicial ---------- */}
      {loading && (
        <div className="pr-loading">
          <span className="pr-spinner" />
        </div>
      )}

      {/* ---------- Empty ---------- */}
      {!loading && !error && filtered.length === 0 && (
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art"><Activity size={32} /></div>
            <div>
              <p className="pr-empty-title">Sin actividad en esta categoría</p>
              <p className="pr-empty-desc">
                Los eventos del equipo y la cuenta aparecerán aquí en cuanto haya movimiento.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Timeline agrupado ---------- */}
      {!loading && filtered.length > 0 && (
        <motion.div
          className="act-groups"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {grouped.map((group) => (
            <motion.div
              key={group.key}
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            >
              <div className="act-group-head">
                <span>{group.key}</span>
                <div className="act-group-head-line" />
                <span className="act-group-head-count">{group.items.length} eventos</span>
              </div>
              <div className="pr-card act-group-card">
                {group.items.map((event, i) => (
                  <ActivityRow
                    key={`${event.type}-${event.id ?? i}-${event.date ?? event.created_at ?? i}`}
                    event={event}
                    isLast={i === group.items.length - 1}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ---------- Load more ---------- */}
      {!loading && meta && page < meta.last_page && (
        <div className="act-loadmore">
          <button
            type="button"
            className="pr-btn"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Cargando…
              </>
            ) : (
              <>
                Cargar más eventos
              </>
            )}
          </button>
        </div>
      )}
      {!loading && meta && page >= meta.last_page && events.length > 0 && (
        <div className="act-end">
          <CheckCircle2 size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          Has visto todo el historial
        </div>
      )}
    </div>
  )
}
