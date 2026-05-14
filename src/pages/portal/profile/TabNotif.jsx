import { useMemo, useState } from 'react'
import {
  Bell,
  MessageSquare,
  Flag,
  Download,
  Receipt,
  ClipboardList,
  Repeat,
  Sparkles,
  Settings,
  BellOff,
  Globe,
  Mail,
  Smartphone,
  MessageCircle,
} from 'lucide-react'
import { apiRequest } from '../../../services/api'
import { Toggle, FormCard } from './components'

const ROWS = [
  { id: 'new_message', label: 'Nuevos mensajes en proyectos', icon: MessageSquare, color: 'green' },
  { id: 'milestone_completed', label: 'Hitos completados', icon: Flag, color: 'purple' },
  { id: 'new_deliverable', label: 'Nuevos entregables', icon: Download, color: 'cyan' },
  { id: 'invoice_pending', label: 'Facturas pendientes', icon: Receipt, color: 'amber' },
  { id: 'new_budget', label: 'Presupuestos nuevos', icon: ClipboardList, color: 'blue' },
  { id: 'contract_changed', label: 'Cambios en contratos', icon: Repeat, color: 'purple' },
  { id: 'marketing', label: 'Newsletter y novedades', icon: Sparkles, color: 'cyan' },
  { id: 'maintenance', label: 'Mantenimiento programado', icon: Settings, color: 'amber' },
]

const CHANNELS = ['panel', 'email', 'whatsapp']

const PAUSE_OPTIONS = [
  { duration: '1h', label: '1 hora', variant: 'ghost' },
  { duration: '8h', label: '8 horas', variant: 'ghost' },
  { duration: '24h', label: '24 horas', variant: 'ghost' },
  { duration: 'until_resume', label: 'Hasta que reanude', variant: 'primary' },
]

function defaultPrefs() {
  const obj = {}
  for (const r of ROWS) {
    obj[r.id] = { panel: false, email: false, whatsapp: false }
  }
  return obj
}

function normalizePrefs(raw) {
  const base = defaultPrefs()
  if (!raw || typeof raw !== 'object') return base
  for (const r of ROWS) {
    const incoming = raw[r.id]
    if (incoming && typeof incoming === 'object') {
      base[r.id] = {
        panel: !!incoming.panel,
        email: !!incoming.email,
        whatsapp: !!incoming.whatsapp,
      }
    }
  }
  return base
}

function formatPausedUntil(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return d.toLocaleString('es-ES')
  }
}

export default function TabNotif({ profile, onShowToast, updateProfilePartial }) {
  const initialPrefs = useMemo(
    () => normalizePrefs(profile?.notification_preferences),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [prefs, setPrefs] = useState(initialPrefs)
  const [dnd, setDnd] = useState(profile?.dnd || { paused_until: null })
  const [busyPause, setBusyPause] = useState(false)
  const [busyResume, setBusyResume] = useState(false)

  const showToast = (msg, type = 'success') => {
    if (typeof onShowToast === 'function') onShowToast(msg, type)
  }

  const isPaused = !!dnd?.paused_until

  const toggleChannel = async (eventId, channel, value) => {
    const previous = prefs
    const currentEventPrefs = prefs[eventId] || { panel: false, email: false, whatsapp: false }
    const nextEventPrefs = { ...currentEventPrefs, [channel]: value }
    const nextPrefs = { ...prefs, [eventId]: nextEventPrefs }
    setPrefs(nextPrefs)

    try {
      await apiRequest('/client/profile/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ [eventId]: nextEventPrefs }),
      })
      if (typeof updateProfilePartial === 'function') {
        updateProfilePartial({ notification_preferences: nextPrefs })
      }
    } catch (err) {
      setPrefs(previous)
      showToast(err?.data?.message || err?.message || 'No se pudo actualizar la preferencia', 'error')
    }
  }

  const handlePause = async (duration) => {
    setBusyPause(true)
    try {
      const res = await apiRequest('/client/profile/notifications/pause', {
        method: 'POST',
        body: JSON.stringify({ duration }),
      })
      const pausedUntil =
        res?.data?.paused_until ?? res?.paused_until ?? res?.data?.dnd?.paused_until ?? null
      const nextDnd = { paused_until: pausedUntil }
      setDnd(nextDnd)
      if (typeof updateProfilePartial === 'function') {
        updateProfilePartial({ dnd: nextDnd })
      }
      showToast('Notificaciones pausadas', 'success')
    } catch (err) {
      showToast(err?.data?.message || err?.message || 'No se pudo pausar', 'error')
    } finally {
      setBusyPause(false)
    }
  }

  const handleResume = async () => {
    setBusyResume(true)
    try {
      await apiRequest('/client/profile/notifications/resume', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const nextDnd = { paused_until: null }
      setDnd(nextDnd)
      if (typeof updateProfilePartial === 'function') {
        updateProfilePartial({ dnd: nextDnd })
      }
      showToast('Notificaciones reanudadas', 'success')
    } catch (err) {
      showToast(err?.data?.message || err?.message || 'No se pudo reanudar', 'error')
    } finally {
      setBusyResume(false)
    }
  }

  const channelHeaders = [
    { id: 'panel', label: 'Panel', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  ]

  return (
    <div className="pf-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isPaused && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 18px',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 12,
          }}
        >
          <BellOff size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pf-text-primary)' }}>
              Notificaciones pausadas
            </div>
            <div style={{ fontSize: 12, color: 'var(--pf-text-muted)', marginTop: 2 }}>
              Hasta {formatPausedUntil(dnd.paused_until)}
            </div>
          </div>
          <button
            type="button"
            className="pf-btn pf-primary pf-sm"
            onClick={handleResume}
            disabled={busyResume}
          >
            <Bell size={13} />
            Reanudar ahora
          </button>
        </div>
      )}

      <FormCard
        icon={BellOff}
        iconAccent="amber"
        title="Pausar todo"
        subtitle="Silencia todas las notificaciones temporalmente"
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PAUSE_OPTIONS.map((opt) => (
            <button
              key={opt.duration}
              type="button"
              className={`pf-btn pf-${opt.variant} pf-sm`}
              onClick={() => handlePause(opt.duration)}
              disabled={busyPause}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FormCard>

      <FormCard icon={Bell} iconAccent="purple" title="Notificaciones por evento">
        <div style={{ overflowX: 'auto' }}>
          <table className="pf-notif-matrix">
            <thead>
              <tr>
                <th>Evento</th>
                {channelHeaders.map((c) => {
                  const Icon = c.icon
                  return (
                    <th key={c.id}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={12} />
                        {c.label}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const Icon = row.icon
                const eventPrefs = prefs[row.id] || { panel: false, email: false, whatsapp: false }
                return (
                  <tr key={row.id}>
                    <td>
                      <span className={`pf-notif-row-icon pf-accent-${row.color}`}>
                        <Icon size={14} />
                      </span>
                      {row.label}
                    </td>
                    {CHANNELS.map((channel) => (
                      <td key={channel}>
                        <Toggle
                          value={!!eventPrefs[channel]}
                          onChange={(v) => toggleChannel(row.id, channel, v)}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </FormCard>
    </div>
  )
}
