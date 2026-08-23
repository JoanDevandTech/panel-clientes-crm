import { useEffect, useRef, useState } from 'react'
import {
  Lock,
  Shield,
  Download,
  FileText,
  AlertTriangle,
  X,
  Check,
  Trash2,
  Loader2,
} from 'lucide-react'
import api from '../../../services/api'
import { useApi } from '../../../hooks/useApi'
import { Toggle, ToggleRow, FormCard, Modal, TextInput } from './components'

const CONSENT_INFO = {
  testimonial: {
    title: 'Permitir uso de mi caso como testimonio público',
    sub: 'Podremos citar tu nombre y empresa al hablar del proyecto',
  },
  logo_display: {
    title: 'Permitir mostrar mi logo en la sección "Clientes"',
    sub: 'Aparecerás en la página de clientes del sitio web',
  },
  marketing: {
    title: 'Recibir comunicaciones de marketing',
    sub: 'Newsletter, novedades, lanzamientos',
  },
  analytics: {
    title: 'Análisis y mejora del servicio',
    sub: 'Datos anónimos para mejorar el producto',
  },
}

const CONSENT_KEYS = Object.keys(CONSENT_INFO)

function formatLongDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  try {
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return d.toLocaleString()
  }
}

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  try {
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return d.toLocaleDateString()
  }
}

function buildConsentMap(consents) {
  const map = {}
  CONSENT_KEYS.forEach((k) => {
    map[k] = { granted: false, granted_at: null }
  })
  if (Array.isArray(consents)) {
    consents.forEach((c) => {
      if (c && CONSENT_KEYS.includes(c.consent_type)) {
        map[c.consent_type] = {
          granted: !!c.granted,
          granted_at: c.granted_at || null,
        }
      }
    })
  }
  return map
}

export default function TabPrivacidad({ profile, onShowToast, updateProfilePartial }) {
  const showToast = (msg, type = 'success') => {
    if (typeof onShowToast === 'function') onShowToast(msg, type)
  }

  const consentMap = buildConsentMap(profile?.consents)

  const [savingConsents, setSavingConsents] = useState(false)
  const [cancellingDeletion, setCancellingDeletion] = useState(false)
  const [showDeletionModal, setShowDeletionModal] = useState(false)
  const [showDataModal, setShowDataModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [])

  const handleToggleConsent = async (key, nextValue) => {
    const body = {}
    CONSENT_KEYS.forEach((k) => {
      body[k] = k === key ? nextValue : consentMap[k].granted
    })

    setSavingConsents(true)
    try {
      const res = await api.put('/client/profile/consents', body)
      const updatedConsents =
        res?.data?.consents ||
        res?.consents ||
        CONSENT_KEYS.map((k) => ({
          consent_type: k,
          granted: body[k],
          granted_at:
            k === key
              ? nextValue
                ? new Date().toISOString()
                : null
              : consentMap[k].granted_at,
        }))
      if (typeof updateProfilePartial === 'function') {
        updateProfilePartial({ consents: updatedConsents })
      }
      showToast('Preferencias actualizadas', 'success')
    } catch (err) {
      showToast(
        err?.data?.message || err?.message || 'No se pudieron guardar los consentimientos',
        'error'
      )
    } finally {
      setSavingConsents(false)
    }
  }

  const handleCancelDeletion = async () => {
    setCancellingDeletion(true)
    try {
      await api.delete('/client/profile/deletion-request')
      if (typeof updateProfilePartial === 'function') {
        updateProfilePartial({ deletion_request: null })
      }
      showToast('Eliminación cancelada', 'success')
    } catch (err) {
      showToast(
        err?.data?.message || err?.message || 'No se pudo cancelar la eliminación',
        'error'
      )
    } finally {
      setCancellingDeletion(false)
    }
  }

  const startExportPolling = (requestId) => {
    if (!requestId) return
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/client/profile/data-export/${requestId}`)
        const data = res?.data ?? res
        const status = data?.status
        if (status === 'ready') {
          clearInterval(pollRef.current)
          pollRef.current = null
          if (data?.file_url) {
            showToast(
              `Tu archivo está listo. Descárgalo desde: ${data.file_url}`,
              'success'
            )
          } else {
            showToast('Tu archivo de datos está listo', 'success')
          }
        } else if (status === 'expired') {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }, 5000)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.post('/client/profile/data-export', {})
      const data = res?.data ?? res
      showToast('Generando archivo, te avisaremos por email', 'success')
      if (data?.request_id) {
        startExportPolling(data.request_id)
      }
    } catch (err) {
      showToast(
        err?.data?.message || err?.message || 'No se pudo iniciar la exportación',
        'error'
      )
    } finally {
      setExporting(false)
    }
  }

  const deletionScheduled = profile?.deletion_request?.scheduled_for || null

  return (
    <div
      className="pf-tab-content"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {deletionScheduled && (
        <div
          className="pf-danger-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: 'rgba(255, 23, 68, 0.15)',
              color: '#FF5C7A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="pf-danger-title" style={{ marginBottom: 4 }}>
              Tu cuenta será eliminada el {formatLongDate(deletionScheduled)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--pf-text-muted)' }}>
              Puedes cancelar la solicitud durante el periodo de gracia.
            </div>
          </div>
          <button
            type="button"
            className="pf-btn pf-ghost pf-sm"
            onClick={handleCancelDeletion}
            disabled={cancellingDeletion}
          >
            {cancellingDeletion ? (
              <Loader2 size={13} className="pf-spin" />
            ) : (
              <X size={13} />
            )}
            Cancelar eliminación
          </button>
        </div>
      )}

      <FormCard
        icon={Shield}
        iconAccent="cyan"
        title="Consentimientos"
        subtitle="Decide cómo podemos usar tus datos"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {CONSENT_KEYS.map((key) => {
            const info = CONSENT_INFO[key]
            const c = consentMap[key]
            const sub = (
              <>
                {info.sub}
                {c.granted && c.granted_at && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: 'var(--pf-text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Check size={11} style={{ color: '#34D399' }} />
                    Activo desde {formatShortDate(c.granted_at)}
                  </div>
                )}
              </>
            )
            return (
              <ToggleRow
                key={key}
                title={info.title}
                sub={sub}
                value={c.granted}
                disabled={savingConsents}
                onChange={(next) => handleToggleConsent(key, next)}
              />
            )
          })}
        </div>
      </FormCard>

      <FormCard
        icon={FileText}
        iconAccent="cyan"
        title="Tus datos"
        subtitle="Conoce qué información almacenamos y descárgala"
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="pf-btn pf-ghost"
            onClick={() => setShowDataModal(true)}
          >
            <FileText size={14} /> Ver qué datos almacenamos
          </button>
          <button
            type="button"
            className="pf-btn pf-primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 size={14} className="pf-spin" />
            ) : (
              <Download size={14} />
            )}
            Descargar mis datos
          </button>
        </div>
      </FormCard>

      <div className="pf-danger-card">
        <h3 className="pf-danger-title">
          <Trash2 size={16} />
          Eliminar cuenta
        </h3>
        <p
          style={{
            fontSize: 13,
            color: 'var(--pf-text-secondary)',
            margin: '0 0 16px',
            lineHeight: 1.5,
          }}
        >
          Una vez eliminada, todos tus datos serán borrados permanentemente tras un periodo de
          gracia de 30 días. Durante ese tiempo puedes cancelar la solicitud.
        </p>
        <button
          type="button"
          className="pf-btn pf-danger"
          onClick={() => setShowDeletionModal(true)}
          disabled={!!deletionScheduled}
          title={deletionScheduled ? 'Ya hay una solicitud activa' : undefined}
        >
          <Trash2 size={14} /> Solicitar eliminación de cuenta
        </button>
      </div>

      {showDeletionModal && (
        <DeletionModal
          onClose={() => setShowDeletionModal(false)}
          onShowToast={showToast}
          onScheduled={(payload) => {
            if (typeof updateProfilePartial === 'function') {
              updateProfilePartial({
                deletion_request: {
                  scheduled_for: payload?.scheduled_for,
                  request_id: payload?.request_id,
                },
              })
            }
          }}
        />
      )}

      {showDataModal && <DataStoredModal onClose={() => setShowDataModal(false)} />}
    </div>
  )
}

function DeletionModal({ onClose, onShowToast, onScheduled }) {
  const [confirmation, setConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)

  const isReady = confirmation === 'ELIMINAR' && password.length > 0

  const handleSubmit = async () => {
    if (!isReady) return
    setBusy(true)
    setErrors({})
    setGeneralError(null)
    try {
      const res = await api.post('/client/profile/deletion-request', {
        password,
        confirmation_text: 'ELIMINAR',
      })
      const data = res?.data ?? res
      onShowToast?.('Eliminación programada', 'success')
      onScheduled?.({
        scheduled_for: data?.scheduled_for,
        request_id: data?.request_id,
      })
      onClose()
    } catch (err) {
      if (err?.status === 422) {
        const fieldErrors = err?.data?.errors || {}
        const flat = {}
        Object.entries(fieldErrors).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : String(v)
        })
        setErrors(flat)
        if (!Object.keys(flat).length) {
          setGeneralError(
            err?.data?.message || 'Datos inválidos. Revisa el formulario.'
          )
        }
      } else {
        setGeneralError(
          err?.data?.message || err?.message || 'No se pudo solicitar la eliminación'
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Eliminar cuenta"
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button
            type="button"
            className="pf-btn pf-ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="pf-btn pf-danger"
            onClick={handleSubmit}
            disabled={!isReady || busy}
          >
            {busy ? <Loader2 size={13} className="pf-spin" /> : <Trash2 size={13} />}
            Confirmar eliminación
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: 12,
            background: 'rgba(255, 23, 68, 0.08)',
            border: '1px solid rgba(255, 23, 68, 0.25)',
            color: '#FF5C7A',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Esta acción no se puede deshacer fácilmente. Se eliminará tu cuenta y todos los
            datos asociados tras 30 días.
          </span>
        </div>

        <div className="pf-field">
          <label className="pf-field-label">
            Escribe <strong>ELIMINAR</strong> para confirmar
          </label>
          <TextInput
            value={confirmation}
            onChange={setConfirmation}
            placeholder="ELIMINAR"
            autoComplete="off"
            error={!!errors.confirmation_text}
          />
          {errors.confirmation_text && (
            <span className="pf-field-hint pf-error-hint">{errors.confirmation_text}</span>
          )}
        </div>

        <div className="pf-field">
          <label className="pf-field-label">Tu contraseña</label>
          <TextInput
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            prefixIcon={<Lock size={14} />}
            error={!!errors.password}
          />
          {errors.password && (
            <span className="pf-field-hint pf-error-hint">{errors.password}</span>
          )}
        </div>

        {generalError && (
          <div style={{ fontSize: 12, color: '#FF5C7A' }}>{generalError}</div>
        )}
      </div>
    </Modal>
  )
}

function DataStoredModal({ onClose }) {
  const { data, loading, error, refetch } = useApi('/client/profile/data-stored')
  const categories = Array.isArray(data?.categories)
    ? data.categories
    : Array.isArray(data)
    ? data
    : []

  return (
    <Modal
      title="Datos que almacenamos sobre ti"
      onClose={onClose}
      footer={
        <button type="button" className="pf-btn pf-ghost" onClick={onClose}>
          Cerrar
        </button>
      }
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
          <span style={{ fontSize: 13 }}>Cargando datos…</span>
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
          <div style={{ color: '#FF5C7A', fontSize: 13 }}>{error}</div>
          <button
            type="button"
            className="pf-btn pf-ghost pf-sm"
            onClick={() => refetch()}
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div
          style={{
            padding: '24px 0',
            textAlign: 'center',
            color: 'var(--pf-text-muted)',
            fontSize: 13,
          }}
        >
          No hay datos categorizados disponibles.
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {categories.map((cat, idx) => {
            const fields = Array.isArray(cat?.fields) ? cat.fields : []
            return (
              <div
                key={cat?.category || idx}
                style={{
                  padding: 14,
                  background: 'rgba(248, 249, 250,0.02)',
                  border: '1px solid var(--pf-border)',
                }}
              >
                <h4
                  style={{
                    margin: '0 0 10px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--pf-text-primary)',
                  }}
                >
                  {cat?.label || cat?.category || 'Categoría'}
                </h4>

                {fields.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    {fields.map((f, i) => (
                      <span key={i} className="pf-badge gray">
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {cat?.purpose && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--pf-text-secondary)',
                      marginBottom: 4,
                    }}
                  >
                    <strong>Propósito:</strong> {cat.purpose}
                  </div>
                )}

                {cat?.retention && (
                  <div style={{ fontSize: 12, color: 'var(--pf-text-muted)' }}>
                    Retención: {cat.retention}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
