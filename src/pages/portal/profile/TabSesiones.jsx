import { useState } from 'react'
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  MapPin,
  Clock,
  X,
  Check,
  AlertCircle,
  LogOut,
  Loader2,
} from 'lucide-react'
import api from '../../../services/api'
import { useApi } from '../../../hooks/useApi'
import { FormCard } from './components'

function deviceLabel(type) {
  switch (type) {
    case 'desktop':
      return 'Escritorio'
    case 'mobile':
      return 'Móvil'
    case 'tablet':
      return 'Tablet'
    default:
      return 'Dispositivo'
  }
}

function deviceIcon(type) {
  switch (type) {
    case 'desktop':
      return Monitor
    case 'mobile':
      return Smartphone
    case 'tablet':
      return Tablet
    default:
      return Laptop
  }
}

function relativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso)
  if (isNaN(then.getTime())) return ''
  const now = new Date()
  const diffMs = now - then
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffH = Math.round(diffMin / 60)
  const diffD = Math.round(diffH / 24)
  const diffW = Math.round(diffD / 7)
  const diffMo = Math.round(diffD / 30)
  const diffY = Math.round(diffD / 365)
  if (diffSec < 60) return 'hace unos segundos'
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin === 1 ? '' : 's'}`
  if (diffH < 24) return `hace ${diffH} hora${diffH === 1 ? '' : 's'}`
  if (diffD < 7) return `hace ${diffD} día${diffD === 1 ? '' : 's'}`
  if (diffW < 5) return `hace ${diffW} semana${diffW === 1 ? '' : 's'}`
  if (diffMo < 12) return `hace ${diffMo} mes${diffMo === 1 ? '' : 'es'}`
  return `hace ${diffY} año${diffY === 1 ? '' : 's'}`
}

export default function TabSesiones({ profile, onShowToast }) {
  const { data, loading, error, refetch, setData } = useApi('/client/profile/sessions')
  const [closingId, setClosingId] = useState(null)
  const [closingOthers, setClosingOthers] = useState(false)

  const showToast = (msg, type = 'success') => {
    if (typeof onShowToast === 'function') onShowToast(msg, type)
  }

  const sessions = Array.isArray(data) ? data : []

  const handleCloseSession = async (session) => {
    if (!window.confirm('¿Cerrar esta sesión?')) return
    setClosingId(session.id)
    try {
      await api.delete(`/client/profile/sessions/${session.id}`)
      // Optimistic remove
      setData((prev) => {
        const list = Array.isArray(prev) ? prev : []
        return list.filter((s) => s.id !== session.id)
      })
      showToast('Sesión cerrada', 'success')
    } catch (err) {
      if (err?.status === 400) {
        showToast(
          'Para cerrar tu sesión actual, usa el botón Cerrar sesión',
          'error'
        )
      } else {
        showToast(
          err?.data?.message || err?.message || 'No se pudo cerrar la sesión',
          'error'
        )
      }
    } finally {
      setClosingId(null)
    }
  }

  const handleCloseOthers = async () => {
    if (!window.confirm('¿Cerrar todas las sesiones excepto la actual?')) return
    setClosingOthers(true)
    try {
      await api.post('/client/profile/sessions/close-others', {})
      showToast('Sesiones cerradas', 'success')
      await refetch()
    } catch (err) {
      showToast(
        err?.data?.message || err?.message || 'No se pudieron cerrar las sesiones',
        'error'
      )
    } finally {
      setClosingOthers(false)
    }
  }

  return (
    <div
      className="pf-tab-content"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <FormCard
        icon={Laptop}
        iconAccent="purple"
        title="Sesiones activas"
        subtitle="Dispositivos donde tu cuenta está conectada"
      >
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 0',
              color: 'var(--pf-text-muted)',
              gap: 8,
            }}
          >
            <Loader2 size={16} className="pf-spin" />
            <span style={{ fontSize: 13 }}>Cargando sesiones…</span>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '24px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#f87171',
                fontSize: 13,
              }}
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="pf-btn pf-ghost pf-sm"
              onClick={() => refetch()}
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: 'var(--pf-text-muted)',
              fontSize: 13,
            }}
          >
            No hay sesiones activas.
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.map((session) => {
              const Icon = deviceIcon(session.device_type)
              const titleParts = [
                deviceLabel(session.device_type),
                session.os,
                session.browser,
              ].filter(Boolean)
              const title = titleParts.join(' · ')
              const isCurrent = !!session.is_current
              const isClosing = closingId === session.id

              return (
                <div
                  key={session.id}
                  className={`pf-session-row ${isCurrent ? 'current' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div className="pf-session-icon">
                    <Icon size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--pf-text-primary)',
                        marginBottom: 6,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={title}
                    >
                      {title || 'Dispositivo desconocido'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--pf-text-muted)',
                      }}
                    >
                      {session.location && (
                        <span className="pf-chip">
                          <MapPin size={11} />
                          {session.location}
                        </span>
                      )}
                      {session.ip_address && (
                        <span className="pf-chip">{session.ip_address}</span>
                      )}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Clock size={11} />
                        {isCurrent
                          ? 'Activa ahora'
                          : relativeTime(session.last_activity)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 6,
                      flexShrink: 0,
                    }}
                  >
                    {isCurrent ? (
                      <>
                        <span
                          className="pf-badge green"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Check size={10} /> Sesión actual
                        </span>
                        {session.created_at && (
                          <span
                            className="pf-chip"
                            style={{ color: 'var(--pf-text-muted)' }}
                          >
                            Creada {relativeTime(session.created_at)}
                          </span>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="pf-btn pf-danger pf-sm"
                        onClick={() => handleCloseSession(session)}
                        disabled={isClosing}
                      >
                        {isClosing ? (
                          <Loader2 size={13} className="pf-spin" />
                        ) : (
                          <X size={13} />
                        )}
                        Cerrar sesión
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </FormCard>

      <FormCard
        icon={LogOut}
        iconAccent="red"
        title="Acciones"
        subtitle="Cierra sesiones de otros dispositivos por seguridad"
      >
        <button
          type="button"
          className="pf-btn pf-danger"
          onClick={handleCloseOthers}
          disabled={closingOthers || loading || !!error}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {closingOthers ? (
            <Loader2 size={14} className="pf-spin" />
          ) : (
            <LogOut size={14} />
          )}
          Cerrar todas las demás sesiones
        </button>
      </FormCard>
    </div>
  )
}
