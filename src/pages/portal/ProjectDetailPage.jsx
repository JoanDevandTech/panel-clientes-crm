import { useEffect, useMemo, useState } from 'react'
import { Link, useRoute } from 'wouter'
import {
  ArrowLeft,
  AlertCircle,
  Download,
  Share2,
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle,
  Shield,
  Layers,
  Flag,
  Key,
  Image,
  MessageSquare,
  FileText,
  Activity,
  Lock,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import './project-detail/project-detail.css'

import TabResumen from './project-detail/TabResumen'
import TabHitos from './project-detail/TabHitos'
import TabEntregables from './project-detail/TabEntregables'
import TabCredenciales from './project-detail/TabCredenciales'
import TabCapturas from './project-detail/TabCapturas'
import TabMensajes from './project-detail/TabMensajes'
import TabNotas from './project-detail/TabNotas'
import TabActividad from './project-detail/TabActividad'

const PHASES = {
  preliminary: { label: 'Preliminar', badge: 'blue' },
  in_development: { label: 'En desarrollo', badge: 'cyan' },
  in_progress: { label: 'En progreso', badge: 'cyan' },
  review: { label: 'Revisión', badge: 'amber' },
  completed: { label: 'Completado', badge: 'green' },
  maintenance: { label: 'Mantenimiento', badge: 'cyan' },
  paused: { label: 'Pausado', badge: 'gray' },
  cancelled: { label: 'Cancelado', badge: 'red' },
}

// Backend devuelve tabs en inglés; aquí mapeamos a UI en español.
const TAB_META = {
  summary: { label: 'Resumen', Icon: Layers },
  milestones: { label: 'Hitos', Icon: Flag, countKey: 'milestones_total' },
  deliverables: { label: 'Entregables', Icon: Download, countKey: 'deliverables_count' },
  credentials: { label: 'Credenciales', Icon: Key, countKey: 'credentials_count', premium: true },
  screenshots: { label: 'Capturas', Icon: Image, countKey: 'screenshots_count' },
  messages: { label: 'Mensajes', Icon: MessageSquare },
  notes: { label: 'Notas', Icon: FileText },
  activity: { label: 'Actividad', Icon: Activity },
}

// Por defecto mostramos todas las tabs (credenciales incluido).
// Cada tab maneja su propio empty state si no hay datos. Si el backend
// quiere ocultar alguna tab por permisos/fase, debe enviar `available_tabs`
// en el resource de /client/projects/{id}.
const DEFAULT_TABS = [
  'summary',
  'milestones',
  'deliverables',
  'credentials',
  'screenshots',
  'messages',
  'notes',
  'activity',
]

function defaultPhaseLabel(phaseKey, fallback) {
  return PHASES[phaseKey]?.label || fallback || 'En progreso'
}

function StatusBadge({ phaseKey, fallbackLabel }) {
  const phase = PHASES[phaseKey] || { label: defaultPhaseLabel(phaseKey, fallbackLabel), badge: 'gray' }
  return (
    <span className={`pd-badge ${phase.badge}`}>
      <span className="pd-badge-dot" />
      {phase.label}
    </span>
  )
}

function ProjectHeader({ project, stats, descExpanded, onToggleDesc }) {
  const phaseKey = project?.phase
  const progress = project?.progress_percentage ?? 0

  const milestoneCount = stats?.milestones_total ?? 0
  const deliverableCount = stats?.deliverables_count ?? 0
  const credentialCount = stats?.credentials_count ?? 0
  const teamCount = project?.team_members?.length ?? 0

  const description = project?.description || ''
  const longDescription = project?.long_description || project?.full_description
  const hasLong = Boolean(longDescription)

  return (
    <div style={{ marginBottom: 24 }}>
      <Link href="/portal/projects" className="pd-proj-crumb">
        <ArrowLeft size={14} /> Volver a proyectos
      </Link>

      <div className="pd-proj-titlebar">
        <div className="pd-proj-title-group">
          <h1 className="pd-proj-title">{project?.name}</h1>
          <StatusBadge phaseKey={phaseKey} fallbackLabel={project?.status_label} />
        </div>
        <div className="pd-proj-actions">
          <Link href="/portal/tickets/new" className="pd-btn pd-btn-ghost pd-sm">
            <AlertCircle size={14} /> Reportar problema
          </Link>
          {project?.download_all_url && (
            <a
              href={project.download_all_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pd-btn pd-btn-ghost pd-sm"
            >
              <Download size={14} /> Descargar todo
            </a>
          )}
          <button
            type="button"
            className="pd-btn pd-btn-ghost pd-sm"
            onClick={() => {
              if (navigator.share) {
                navigator
                  .share({ title: project?.name, url: window.location.href })
                  .catch(() => {})
              } else if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href).catch(() => {})
              }
            }}
          >
            <Share2 size={14} /> Compartir
          </button>
          <button type="button" className="pd-btn pd-icon-only pd-btn-ghost pd-sm" aria-label="Más opciones">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {description && (
        <p className="pd-proj-desc">
          {description}
          {descExpanded && hasLong && <span> {longDescription}</span>}
          {hasLong && (
            <button type="button" className="pd-proj-desc-more" onClick={onToggleDesc}>
              {descExpanded ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </p>
      )}

      <div className="pd-proj-stats">
        {milestoneCount > 0 && (
          <>
            <strong>
              {milestoneCount} {milestoneCount === 1 ? 'hito' : 'hitos'}
            </strong>
            <span className="pd-dot">·</span>
          </>
        )}
        {deliverableCount > 0 && (
          <>
            <strong>
              {deliverableCount} {deliverableCount === 1 ? 'entregable' : 'entregables'}
            </strong>
            <span className="pd-dot">·</span>
          </>
        )}
        {credentialCount > 0 && (
          <>
            <strong>
              {credentialCount} {credentialCount === 1 ? 'credencial' : 'credenciales'}
            </strong>
            <span className="pd-dot">·</span>
          </>
        )}
        {teamCount > 0 && (
          <span>
            {teamCount} {teamCount === 1 ? 'miembro del equipo' : 'miembros del equipo'}
          </span>
        )}
      </div>

      <div className="pd-proj-progress">
        <div className="pd-proj-progress-head">
          <span className="pd-proj-progress-label">Progreso general</span>
          <span className="pd-proj-progress-value">{progress}%</span>
        </div>
        <div className="pd-progress-bar">
          <div className="pd-progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="pd-proj-dates">
        {project?.start_date && (
          <span className="pd-chip">
            <Calendar size={13} /> Inicio:{' '}
            <strong style={{ color: 'var(--pd-text-primary)', marginLeft: 4 }}>
              {project.start_date}
            </strong>
          </span>
        )}
        {project?.estimated_date && (
          <span className="pd-chip">
            <Clock size={13} /> Estimado:{' '}
            <strong style={{ color: 'var(--pd-text-primary)', marginLeft: 4 }}>
              {project.estimated_date}
            </strong>
          </span>
        )}
        {project?.delivered_at && (
          <span
            className="pd-chip"
            style={{ color: '#34D399', borderColor: 'var(--pd-green-border)', background: 'var(--pd-green-bg)' }}
          >
            <CheckCircle size={13} /> Entregado:{' '}
            <strong style={{ color: '#34D399', marginLeft: 4 }}>{project.delivered_at}</strong>
          </span>
        )}
        {project?.warranty_until && (
          <span
            className="pd-chip"
            style={{ color: '#FBBF24', borderColor: 'var(--pd-amber-border)', background: 'var(--pd-amber-bg)' }}
          >
            <Shield size={13} /> Garantía hasta:{' '}
            <strong style={{ color: '#FBBF24', marginLeft: 4 }}>{project.warranty_until}</strong>
          </span>
        )}
      </div>
    </div>
  )
}

function TabsBar({ visibleTabs, active, onChange, stats, unreadMessages }) {
  return (
    <nav className="pd-tabs" aria-label="Secciones del proyecto">
      <div className="pd-tabs-inner">
        {visibleTabs.map((key) => {
          const meta = TAB_META[key]
          if (!meta) return null
          const Icon = meta.Icon
          const isActive = active === key
          const count = meta.countKey ? stats?.[meta.countKey] : null
          const showNotif = key === 'messages' && unreadMessages > 0 && !isActive
          return (
            <button
              key={key}
              type="button"
              className={`pd-tab ${isActive ? 'pd-active' : ''}`}
              onClick={() => onChange(key)}
            >
              <Icon size={15} />
              <span>{meta.label}</span>
              {meta.premium && <Lock size={12} style={{ color: 'var(--pd-amber)' }} />}
              {showNotif && <span className="pd-tab-notif" />}
              {count != null && count > 0 && <span className="pd-tab-count">{count}</span>}
              {isActive && <span className="pd-tab-indicator" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function ToastStack({ toasts }) {
  return (
    <div className="pd-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="pd-toast">
          <CheckCircle size={14} /> {t.msg}
        </div>
      ))}
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
          border: '2px solid var(--pr-accent-cyan)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'pd-spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes pd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ProjectDetailPage() {
  const [, params] = useRoute('/portal/projects/:id')
  const id = params?.id

  const { data, loading, error, refetch } = useApi(`/client/projects/${id}`, {
    immediate: !!id,
  })

  // El backend puede devolver { project, available_tabs, unread_messages_count, stats }
  // o, en versiones antiguas, el objeto del proyecto directamente.
  const payload = data?.data ?? data
  const project = payload?.project ?? payload
  const stats = payload?.stats ?? null
  const unreadMessages = payload?.unread_messages_count ?? 0
  const availableTabs = useMemo(() => {
    if (Array.isArray(payload?.available_tabs) && payload.available_tabs.length > 0) {
      return payload.available_tabs
    }
    return DEFAULT_TABS
  }, [payload])

  const [activeTab, setActiveTab] = useState(availableTabs[0])
  const [descExpanded, setDescExpanded] = useState(false)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0])
    }
  }, [availableTabs, activeTab])

  const showToast = (msg) => {
    const tid = Date.now() + Math.random()
    setToasts((ts) => [...ts, { id: tid, msg }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== tid)), 2400)
  }

  if (loading) {
    return (
      <div className="project-detail-page">
        <Link href="/portal/projects" className="pd-proj-crumb">
          <ArrowLeft size={14} /> Volver a proyectos
        </Link>
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="project-detail-page">
        <Link href="/portal/projects" className="pd-proj-crumb">
          <ArrowLeft size={14} /> Volver a proyectos
        </Link>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ color: '#FF5C7A', marginBottom: 16 }}>{error}</p>
          <button type="button" className="pd-btn pd-btn-primary" onClick={refetch}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <Link href="/portal/projects" className="pd-proj-crumb">
          <ArrowLeft size={14} /> Volver a proyectos
        </Link>
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--pd-text-muted)' }}>
          Proyecto no encontrado.
        </div>
      </div>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <TabResumen
            project={project}
            stats={stats}
            onJumpTab={setActiveTab}
            onShowToast={showToast}
          />
        )
      case 'milestones':
        return <TabHitos projectId={id} />
      case 'deliverables':
        return <TabEntregables projectId={id} onShowToast={showToast} />
      case 'credentials':
        return <TabCredenciales projectId={id} onShowToast={showToast} />
      case 'screenshots':
        return <TabCapturas projectId={id} />
      case 'messages':
        return <TabMensajes projectId={id} onShowToast={showToast} />
      case 'notes':
        return <TabNotas projectId={id} onShowToast={showToast} />
      case 'activity':
        return <TabActividad projectId={id} />
      default:
        return null
    }
  }

  return (
    <div className="project-detail-page">
      <ProjectHeader
        project={project}
        stats={stats}
        descExpanded={descExpanded}
        onToggleDesc={() => setDescExpanded((v) => !v)}
      />
      <TabsBar
        visibleTabs={availableTabs}
        active={activeTab}
        onChange={setActiveTab}
        stats={stats}
        unreadMessages={unreadMessages}
      />
      {renderTab()}
      <ToastStack toasts={toasts} />
    </div>
  )
}
