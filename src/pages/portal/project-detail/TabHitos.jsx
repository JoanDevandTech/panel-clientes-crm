import { useState } from 'react'
import {
  Check,
  Clock,
  Circle,
  AlertCircle,
  Calendar,
  CheckCircle,
  FileText,
  ChevronDown,
  TrendingUp,
  Flag,
} from 'lucide-react'
import { useApi } from '../../../hooks/useApi'

const milestoneStatusVisual = {
  completed: {
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    Icon: Check,
    label: 'Completado',
    badge: 'green',
  },
  in_progress: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    Icon: Clock,
    label: 'En progreso',
    badge: 'amber',
  },
  pending: {
    color: 'rgba(255,255,255,0.4)',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
    Icon: Circle,
    label: 'Pendiente',
    badge: 'gray',
  },
  blocked: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    Icon: AlertCircle,
    label: 'Bloqueado',
    badge: 'red',
  },
}

const VALID_STATUSES = ['completed', 'in_progress', 'pending', 'blocked']

function normaliseStatus(m) {
  const s = m?.status
  if (VALID_STATUSES.includes(s)) return s
  // Compatibilidad con respuestas antiguas
  if (s === 'done') return 'completed'
  if (s === 'current') return 'in_progress'
  if (m?.completed) return 'completed'
  return 'pending'
}

function isOnTime(realDate, dueDate) {
  if (!realDate || !dueDate) return true
  return new Date(realDate) <= new Date(dueDate)
}

// El backend no expone un campo de progreso por hito todavía,
// así que lo derivamos del status para alimentar la barra de la UI.
function progressFromStatus(status) {
  switch (status) {
    case 'completed':
      return 100
    case 'in_progress':
      return 50
    case 'blocked':
      return 25
    default:
      return 0
  }
}

function MilestoneNode({ m, isLast, expanded, onToggle }) {
  const status = normaliseStatus(m)
  const v = milestoneStatusVisual[status] || milestoneStatusVisual.pending
  const Icon = v.Icon
  const realDate = m.completed_date
  const dueDate = m.estimated_date
  const onTime = isOnTime(realDate, dueDate)
  const progress = progressFromStatus(status)
  const deliverables = Array.isArray(m.linked_deliverables) ? m.linked_deliverables : []

  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '48px 1fr', gap: 16 }}>
      {!isLast && (
        <div
          style={{
            position: 'absolute',
            left: 23,
            top: 48,
            bottom: -16,
            width: 2,
            background:
              status === 'completed'
                ? 'linear-gradient(180deg, #10b981 0%, rgba(168,85,247,0.4) 100%)'
                : 'rgba(255,255,255,0.08)',
            borderRadius: 1,
          }}
        />
      )}

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: v.bg,
          border: `1.5px solid ${v.border}`,
          display: 'grid',
          placeItems: 'center',
          color: v.color,
          flexShrink: 0,
          zIndex: 1,
          boxShadow: status === 'in_progress' ? `0 0 20px ${v.color}40` : 'none',
        }}
      >
        <Icon size={20} strokeWidth={2} />
      </div>

      <div className="pd-card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{m.title}</h3>
          <span className={`pd-badge ${v.badge}`}>
            <span className="pd-badge-dot solo" />
            {v.label}
          </span>
        </div>
        {m.description && (
          <p style={{ fontSize: 13, color: 'var(--pd-text-secondary)', margin: '0 0 12px' }}>{m.description}</p>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {dueDate && (
            <span className="pd-chip">
              <Calendar size={12} /> Est. {dueDate}
            </span>
          )}
          {realDate && (
            <span
              className="pd-chip"
              style={{
                color: onTime ? '#34d399' : '#fbbf24',
                borderColor: onTime ? 'var(--pd-green-border)' : 'var(--pd-amber-border)',
                background: onTime ? 'var(--pd-green-bg)' : 'var(--pd-amber-bg)',
              }}
            >
              <CheckCircle size={12} /> Real {realDate}
            </span>
          )}
          {deliverables.length > 0 && (
            <span className="pd-chip">
              <FileText size={12} /> {deliverables.length} entregables
            </span>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 100 }}>
                <div className="pd-progress-bar" style={{ height: 5 }}>
                  <div className="pd-progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--pd-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {progress}%
              </span>
            </div>
            {deliverables.length > 0 && (
              <button
                className="pd-btn pd-icon-only pd-btn-ghost pd-sm"
                type="button"
                onClick={onToggle}
                aria-label="Expandir hito"
              >
                <ChevronDown
                  size={14}
                  style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
                />
              </button>
            )}
          </div>
        </div>

        {expanded && deliverables.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--pd-border)' }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--pd-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              Archivos asociados
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {deliverables.map((d, i) => (
                <a
                  key={d.id ?? i}
                  className="pd-chip"
                  href={d.thumbnail_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText size={12} /> {d.title || `Entregable ${i + 1}`}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
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

export default function TabHitos({ projectId }) {
  const { data, loading, error, refetch } = useApi(
    `/client/projects/${projectId}/milestones`,
    { immediate: !!projectId },
  )
  const [expanded, setExpanded] = useState({})

  if (loading) {
    return (
      <div className="pd-tab-content">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pd-tab-content">
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
          <button type="button" className="pd-btn pd-btn-ghost pd-sm" onClick={refetch}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const payload = data?.data ?? data
  const milestones = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []

  if (milestones.length === 0) {
    return (
      <div className="pd-tab-content">
        <div className="pd-card">
          <div className="pd-empty-state">
            <div className="pd-empty-state-art"><Flag size={36} /></div>
            <div>
              <p className="pd-empty-state-title">Aún no hay hitos definidos</p>
              <p className="pd-empty-state-desc">Tu equipo los publicará al iniciar el desarrollo.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const total = milestones.length
  const done = milestones.filter((m) => normaliseStatus(m) === 'completed').length
  const onTime = milestones.every((m) => isOnTime(m.completed_date, m.estimated_date))
  const allCompleted = done === total

  return (
    <div className="pd-tab-content">
      <div className="pd-section-head">
        <div>
          <h2 className="pd-section-title">Hitos del proyecto</h2>
          <p className="pd-section-sub">
            {total} {total === 1 ? 'hito' : 'hitos'}
            {allCompleted && onTime
              ? ' · todos completados a tiempo'
              : ` · ${done} completados`}
          </p>
        </div>
        {allCompleted && onTime && (
          <div className="pd-section-actions">
            <span
              className="pd-chip"
              style={{ color: '#34d399', borderColor: 'var(--pd-green-border)', background: 'var(--pd-green-bg)' }}
            >
              <TrendingUp size={12} /> 100% on time
            </span>
          </div>
        )}
      </div>

      <div>
        {milestones.map((m, i) => (
          <MilestoneNode
            key={m.id ?? i}
            m={m}
            isLast={i === milestones.length - 1}
            expanded={!!expanded[m.id ?? i]}
            onToggle={() => setExpanded((e) => ({ ...e, [m.id ?? i]: !e[m.id ?? i] }))}
          />
        ))}
      </div>
    </div>
  )
}
