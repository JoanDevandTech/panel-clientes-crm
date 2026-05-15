import { useCallback, useEffect, useState } from 'react'
import {
  Flag,
  Download,
  MessageSquare,
  Key,
  Image,
  Activity,
  ChevronRight,
} from 'lucide-react'
import { api } from '../../../services/api'

const FILTERS = [
  { key: 'all',          label: 'Todos' },
  { key: 'milestones',   label: 'Hitos' },
  { key: 'deliverables', label: 'Entregables' },
  { key: 'messages',     label: 'Mensajes' },
  { key: 'credentials',  label: 'Credenciales' },
  { key: 'screenshots',  label: 'Capturas' },
]

const PER_PAGE = 30

const accentMap = {
  purple: 'pd-accent-purple',
  cyan: 'pd-accent-cyan',
  amber: 'pd-accent-amber',
  green: 'pd-accent-green',
  blue: 'pd-accent-blue',
  red: 'pd-accent-red',
}

function categoryFromType(type) {
  if (!type) return 'default'
  if (type.startsWith('milestone_')) return 'milestone'
  if (type.startsWith('deliverable_')) return 'deliverable'
  if (type.startsWith('message_')) return 'message'
  if (type.startsWith('credential_')) return 'credential'
  if (type.startsWith('screenshot_')) return 'screenshot'
  return 'default'
}

function colorForCategory(category) {
  switch (category) {
    case 'milestone':   return 'purple'
    case 'deliverable': return 'cyan'
    case 'message':     return 'green'
    case 'credential':  return 'amber'
    case 'screenshot':  return 'blue'
    default:            return 'purple'
  }
}

function iconForEvent(event) {
  const slug = event?.icon
  const type = event?.type || ''
  switch (slug) {
    case 'check-circle':
    case 'flag':
      return Flag
    case 'download':
      return Download
    case 'message-square':
      return MessageSquare
    case 'key':
      return Key
    case 'image':
      return Image
    default:
      break
  }
  if (type === 'milestone_completed') return Flag
  const category = categoryFromType(type)
  switch (category) {
    case 'milestone':   return Flag
    case 'deliverable': return Download
    case 'message':     return MessageSquare
    case 'credential':  return Key
    case 'screenshot':  return Image
    default:            return Activity
  }
}

function relativeTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'ahora'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'hace unos segundos'
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`
  const weeks = Math.floor(days / 7)
  if (days < 30) return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
  const months = Math.floor(days / 30)
  if (days < 365) return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function actorLine(event) {
  const actor = event?.actor
  const time = relativeTime(event?.created_at)
  if (!actor) return time
  const name = actor.is_staff ? 'Equipo' : (actor.name || 'Cliente')
  return time ? `${name} · ${time}` : name
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid #a855f7',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'pd-spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes pd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function TabActividad({ projectId }) {
  const [filter, setFilter] = useState('all')
  const [events, setEvents] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const fetchPage = useCallback(
    async (pageNumber, { append = false } = {}) => {
      if (!projectId) return
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: String(pageNumber),
          per_page: String(PER_PAGE),
          type: filter,
        })
        const response = await api.get(
          `/client/projects/${projectId}/activity?${params.toString()}`,
        )
        const items = Array.isArray(response?.data) ? response.data : []
        setEvents((prev) => (append ? [...prev, ...items] : items))
        setMeta(response?.meta ?? null)
      } catch (err) {
        setError(err?.message || 'Error al cargar la actividad.')
      } finally {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [projectId, filter],
  )

  // Recarga inicial / al cambiar filtro o proyecto
  useEffect(() => {
    setPage(1)
    setEvents([])
    setMeta(null)
    fetchPage(1, { append: false })
  }, [fetchPage])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchPage(next, { append: true })
  }

  const handleRetry = () => {
    setPage(1)
    fetchPage(1, { append: false })
  }

  const hasMore = !!meta && meta.current_page < meta.last_page
  const total = meta?.total ?? events.length

  return (
    <div className="pd-tab-content">
      <div className="pd-section-head">
        <div>
          <h2 className="pd-section-title">Actividad reciente</h2>
          <p className="pd-section-sub">Línea de tiempo de todo lo ocurrido en este proyecto</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className="pd-chip"
            onClick={() => setFilter(f.key)}
            style={
              filter === f.key
                ? {
                    background: 'rgba(168,85,247,0.15)',
                    borderColor: 'rgba(168,85,247,0.35)',
                    color: '#c084fc',
                  }
                : undefined
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div
          className="pd-card"
          style={{
            padding: 24,
            textAlign: 'center',
            borderColor: 'rgba(239,68,68,0.35)',
            background: 'rgba(239,68,68,0.08)',
          }}
        >
          <p style={{ color: '#f87171', marginBottom: 16, fontSize: 13 }}>{error}</p>
          <button type="button" className="pd-btn pd-btn-ghost pd-sm" onClick={handleRetry}>
            Reintentar
          </button>
        </div>
      ) : events.length === 0 && filter === 'all' ? (
        <div className="pd-card">
          <div className="pd-empty-state">
            <div className="pd-empty-state-art"><Activity size={36} /></div>
            <div>
              <p className="pd-empty-state-title">Sin actividad reciente</p>
              <p className="pd-empty-state-desc">
                A medida que avance el proyecto verás aquí cada hito, entregable y mensaje.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 8 }}>
          {events.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 24,
                color: 'var(--pd-text-muted)',
                fontSize: 13,
              }}
            >
              Sin eventos para este filtro.
            </div>
          ) : (
            events.map((event, i) => {
              const Icon = iconForEvent(event)
              const category = categoryFromType(event.type)
              const color = colorForCategory(category)
              return (
                <div
                  key={event.id ?? `${event.type}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    borderRadius: 8,
                    transition: 'background 200ms',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className={`pd-card-head-icon ${accentMap[color] || 'pd-accent-purple'}`}
                    style={{ width: 32, height: 32, flexShrink: 0 }}
                  >
                    <Icon size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--pd-text-primary)' }}>
                      {event.description}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--pd-text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {actorLine(event)}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--pd-text-faint)' }} />
                </div>
              )
            })
          )}

          {hasMore && (
            <div style={{ textAlign: 'center', padding: 12 }}>
              <button
                type="button"
                className="pd-btn pd-btn-ghost pd-sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </button>
            </div>
          )}

          <div
            style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--pd-text-muted)',
              fontSize: 12,
            }}
          >
            Mostrando {events.length} de {total} eventos
          </div>
        </div>
      )}
    </div>
  )
}
