import { useEffect, useRef, useState } from 'react'
import {
  Layers,
  Server,
  Cloud,
  Database,
  Wifi,
  CreditCard,
  Lock,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  ChevronRight,
  RotateCcw,
  Shield,
  Plus,
  Key,
} from 'lucide-react'
import { useApi } from '../../../hooks/useApi'
import api from '../../../services/api'

const SERVICE_VARIANTS = {
  wordpress: { bg: 'linear-gradient(135deg, #2563eb, #1e40af)', Icon: Layers },
  cms: { bg: 'linear-gradient(135deg, #2563eb, #1e40af)', Icon: Layers },
  hosting: { bg: 'linear-gradient(135deg, #059669, #047857)', Icon: Server },
  ftp: { bg: 'linear-gradient(135deg, #0891b2, #0e7490)', Icon: Cloud },
  db: { bg: 'linear-gradient(135deg, #9333ea, #7e22ce)', Icon: Database },
  cdn: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', Icon: Wifi },
  payments: { bg: 'linear-gradient(135deg, #7c3aed, #5b21b6)', Icon: CreditCard },
  other: { bg: 'linear-gradient(135deg, #475569, #334155)', Icon: Layers },
}

function getServiceType(cred) {
  return cred?.service_type || cred?.serviceType || 'other'
}

function getServiceName(cred) {
  return cred?.service_name || cred?.service || 'Servicio'
}

function getAccessUrl(cred) {
  return cred?.access_url || cred?.url || ''
}

function extractDomain(url) {
  if (!url) return ''
  try {
    const target = url.startsWith('http') ? url : `https://${url}`
    const parsed = new URL(target)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function rotationLabel(cred) {
  if (cred?.days_since_rotation != null) {
    const days = cred.days_since_rotation
    if (days === 0) return 'hoy'
    if (days === 1) return 'hace 1 día'
    return `hace ${days} días`
  }
  if (cred?.last_rotated_at) {
    return cred.last_rotated_at
  }
  return null
}

// Background fire-and-forget. Nunca bloqueamos UI ni mostramos error.
function logCopyAction(projectId, credentialId, action) {
  if (!projectId || !credentialId) return
  api
    .post(`/client/projects/${projectId}/credentials/${credentialId}/log-copy`, { action })
    .catch(() => {})
}

function ServiceLogo({ cred, size = 56 }) {
  const variant = SERVICE_VARIANTS[getServiceType(cred)] || SERVICE_VARIANTS.other
  const Icon = variant.Icon
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: variant.bg,
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        color: 'white',
        flexShrink: 0,
      }}
    >
      <Icon size={size * 0.48} strokeWidth={2} />
    </div>
  )
}

function CredentialCard({ cred, onOpen }) {
  const subtitle = extractDomain(getAccessUrl(cred)) || 'Cuenta principal'
  const rotation = rotationLabel(cred)
  return (
    <button
      type="button"
      className="pd-card pd-hoverable"
      onClick={() => onOpen(cred)}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: 'var(--pd-bg-card)',
        width: '100%',
        color: 'inherit',
        font: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ServiceLogo cred={cred} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getServiceName(cred)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--pd-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--pd-text-muted)' }} />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingTop: 12,
          borderTop: '1px solid var(--pd-border)',
          fontSize: 11,
          color: 'var(--pd-text-muted)',
        }}
      >
        {rotation && (
          <>
            <RotateCcw size={11} />
            <span>Última rotación {rotation}</span>
          </>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#fbbf24' }}>
          <Lock size={11} /> Cifrado
        </span>
      </div>
    </button>
  )
}

/* ===================== Login chrome variants ===================== */

function LoginCMS({ cred, children }) {
  return (
    <div
      style={{
        background: '#f4f6fa',
        color: '#1f2937',
        minHeight: 540,
        display: 'grid',
        placeItems: 'center',
        padding: '40px 24px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <ServiceLogo cred={cred} size={60} />
          <div style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginTop: 12, letterSpacing: 0.5 }}>
            PANEL DE ADMINISTRACIÓN
          </div>
        </div>
        <div style={{ background: 'white', padding: 24, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          {children}
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 18, textAlign: 'center' }}>
            {getServiceName(cred)}
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginHosting({ cred, children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        minHeight: 540,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: 'linear-gradient(155deg, #064e3b 0%, #022c22 100%)',
          color: 'white',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ServiceLogo cred={cred} size={48} />
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 24 }}>Panel de hosting</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, maxWidth: 240, lineHeight: 1.5 }}>
          Gestiona dominios, correos, bases de datos y backups desde un único panel.
        </div>
        <div style={{ marginTop: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>v6.2 · ES</div>
      </div>
      <div
        style={{
          background: '#f9fafb',
          color: '#111827',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Inicia sesión</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 24 }}>{getServiceName(cred)}</div>
        {children}
      </div>
    </div>
  )
}

function LoginFTP({ cred, children }) {
  return (
    <div
      style={{
        background: '#0c0d10',
        color: '#d4d4d8',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        minHeight: 540,
        padding: 32,
      }}
    >
      <div style={{ background: '#000', border: '1px solid #2a2a2e', borderRadius: 8, overflow: 'hidden' }}>
        <div
          style={{
            background: '#18181b',
            padding: '8px 14px',
            borderBottom: '1px solid #2a2a2e',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          <div style={{ marginLeft: 12, fontSize: 11, color: '#71717a' }}>sftp — secure file transfer</div>
        </div>
        <div style={{ padding: '20px 18px', fontSize: 13, lineHeight: 1.7 }}>
          <div style={{ color: '#10b981' }}>$ sftp connect</div>
          <div style={{ color: '#71717a', marginTop: 4 }}>
            Connecting to <span style={{ color: '#67e8f9' }}>{getAccessUrl(cred)}</span>
          </div>
          <div style={{ color: '#71717a', marginTop: 4 }}>
            Server fingerprint: SHA256:xK9... <span style={{ color: '#10b981' }}>verified ✓</span>
          </div>
          <div style={{ marginTop: 14 }}>{children}</div>
        </div>
      </div>
    </div>
  )
}

function LoginDB({ cred, children }) {
  return (
    <div
      style={{
        background: '#eef0f4',
        color: '#1f2937',
        fontFamily: "'Inter', system-ui, sans-serif",
        minHeight: 540,
        padding: 36,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div
          style={{
            background: '#5e72e4',
            color: 'white',
            padding: '14px 20px',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <ServiceLogo cred={cred} size={28} />
          Acceso a base de datos
        </div>
        <div
          style={{
            background: 'white',
            padding: 24,
            borderRadius: '0 0 6px 6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {children}
          <div
            style={{
              marginTop: 14,
              padding: 10,
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 4,
              fontSize: 11,
              color: '#92400e',
            }}
          >
            ⚠ Acceso restringido a IPs en lista blanca.
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginCDN({ cred, children }) {
  return (
    <div
      style={{
        background:
          'radial-gradient(ellipse 800px 500px at 30% 20%, rgba(245,158,11,0.12), transparent 60%), #0f1419',
        color: 'white',
        minHeight: 540,
        display: 'grid',
        placeItems: 'center',
        padding: 40,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <ServiceLogo cred={cred} size={42} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>CDN / DNS Console</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Edge security &amp; routing</div>
          </div>
        </div>
        <div style={{ padding: 4 }}>{children}</div>
        <div style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Cuenta verificada · Doble factor requerido
        </div>
      </div>
    </div>
  )
}

function LoginPayments({ cred, children }) {
  return (
    <div
      style={{
        background: 'linear-gradient(170deg, #faf5ff 0%, #f0f4ff 100%)',
        color: '#1f2937',
        minHeight: 540,
        display: 'grid',
        placeItems: 'center',
        padding: 40,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <ServiceLogo cred={cred} size={48} />
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 14 }}>Pasarela de pagos</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Dashboard · Modo Live</div>
        </div>
        <div
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.08)',
            border: '1px solid #ede9fe',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

const LOGIN_CHROME = {
  wordpress: LoginCMS,
  cms: LoginCMS,
  hosting: LoginHosting,
  ftp: LoginFTP,
  db: LoginDB,
  cdn: LoginCDN,
  payments: LoginPayments,
  other: LoginCMS,
}

/* ===================== Field input ===================== */

function LoginField({
  label,
  value,
  placeholder = '—',
  secret,
  showSecret,
  onToggleSecret,
  dark = false,
  terminal = false,
  url = false,
  copyDisabled = false,
  onOpenUrl,
  onCopy,
  readOnly = false,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (copyDisabled || !value) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value || '').catch(() => {})
    }
    setCopied(true)
    onCopy?.(label)
    setTimeout(() => setCopied(false), 1800)
  }

  const displayValue = value || placeholder
  const hasValue = !!value

  if (terminal) {
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, color: '#67e8f9', fontFamily: 'inherit', fontSize: 13, wordBreak: 'break-all' }}>
            {secret && !showSecret ? '••••••••••••••••' : displayValue}
          </div>
          {secret && (
            <button
              type="button"
              onClick={onToggleSecret}
              style={{ color: '#71717a', padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label={showSecret ? 'Ocultar' : 'Mostrar'}
            >
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleCopy}
              disabled={copyDisabled || !hasValue}
              style={{
                color: copied ? '#10b981' : '#71717a',
                padding: 4,
                background: 'transparent',
                border: 'none',
                cursor: copyDisabled || !hasValue ? 'not-allowed' : 'pointer',
                opacity: copyDisabled || !hasValue ? 0.4 : 1,
              }}
              aria-label="Copiar"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </div>
    )
  }

  const bg = dark ? 'rgba(255,255,255,0.05)' : '#f9fafb'
  const border = dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'
  const textColor = dark ? 'white' : '#111827'
  const labelColor = dark ? 'rgba(255,255,255,0.65)' : '#6b7280'
  const iconBtnColor = dark ? 'rgba(255,255,255,0.55)' : '#6b7280'

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: labelColor, marginBottom: 6 }}>
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 6,
          padding: '8px 12px',
          gap: 8,
          fontFamily: secret ? 'ui-monospace, monospace' : 'inherit',
        }}
      >
        <div
          style={{
            flex: 1,
            color: hasValue ? textColor : (dark ? 'rgba(255,255,255,0.35)' : '#9ca3af'),
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {secret && !showSecret ? '••••••••••••••••' : displayValue}
        </div>
        {url && (
          <button
            type="button"
            onClick={onOpenUrl}
            style={{ color: iconBtnColor, padding: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}
            title="Abrir login"
            aria-label="Abrir en nueva pestaña"
          >
            <ExternalLink size={14} />
          </button>
        )}
        {secret && (
          <button
            type="button"
            onClick={onToggleSecret}
            style={{ color: iconBtnColor, padding: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}
            title={showSecret ? 'Ocultar' : 'Mostrar'}
            aria-label={showSecret ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={handleCopy}
            disabled={copyDisabled || !hasValue}
            style={{
              color: copied ? '#10b981' : iconBtnColor,
              padding: 2,
              background: 'transparent',
              border: 'none',
              cursor: copyDisabled || !hasValue ? 'not-allowed' : 'pointer',
              opacity: copyDisabled || !hasValue ? 0.4 : 1,
            }}
            title="Copiar"
            aria-label="Copiar al portapapeles"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

/* ===================== Modal ===================== */

function CredentialModal({ cred, projectId, onClose, onShowToast }) {
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [revealed, setRevealed] = useState(null) // { username, password, extra_fields }
  const [revealing, setRevealing] = useState(false)
  const timerRef = useRef(null)

  const accessUrl = getAccessUrl(cred)
  const credentialId = cred?.id

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (showPassword) {
      setCountdown(30)
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timerRef.current)
            setShowPassword(false)
            setRevealed(null)
            return 30
          }
          return c - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [showPassword])

  const serviceType = getServiceType(cred)
  const Chrome = LOGIN_CHROME[serviceType] || LoginCMS
  const isTerminal = serviceType === 'ftp'
  const isDark = serviceType === 'cdn'

  const handleCopy = (field) => {
    onShowToast?.(`${field} copiado al portapapeles`)
  }

  const openExternal = () => {
    if (!accessUrl) return
    const target = accessUrl.startsWith('http') ? accessUrl : `https://${accessUrl}`
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  const togglePassword = async () => {
    if (showPassword) {
      // ocultar manualmente: limpiamos secretos en memoria
      setShowPassword(false)
      setRevealed(null)
      return
    }
    if (revealing) return
    if (!projectId || !credentialId) return
    setRevealing(true)
    try {
      const res = await api.post(`/client/projects/${projectId}/credentials/${credentialId}/reveal`)
      const payload = res?.data ?? res
      setRevealed({
        username: payload?.username ?? '',
        password: payload?.password ?? '',
        extra_fields: payload?.extra_fields ?? {},
      })
      setShowPassword(true)
    } catch (err) {
      const status = err?.status
      if (status === 403) {
        onShowToast?.('No autorizado a revelar esta credencial.', 'error')
      } else if (status === 429) {
        onShowToast?.('Demasiados intentos. Espera unos minutos.', 'error')
      } else {
        onShowToast?.(err?.message || 'No se pudo revelar la credencial.', 'error')
      }
    } finally {
      setRevealing(false)
    }
  }

  const username = revealed?.username ?? ''
  const password = revealed?.password ?? ''
  const extraFields = revealed?.extra_fields && typeof revealed.extra_fields === 'object'
    ? Object.entries(revealed.extra_fields).filter(([, v]) => v != null && v !== '')
    : []

  const rotation = rotationLabel(cred)

  const formatExtraLabel = (key) =>
    String(key)
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        animation: 'pd-tab-enter 220ms var(--pd-ease)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          background: '#0a0e1a',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--pd-border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 80px rgba(168,85,247,0.15)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--pd-border)',
            background: 'rgba(255,255,255,0.02)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--pd-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <Lock size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
            {accessUrl || getServiceName(cred)}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ color: 'var(--pd-text-muted)', padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <Chrome cred={cred}>
            <LoginField
              label="URL de acceso"
              value={accessUrl}
              url
              dark={isDark}
              terminal={isTerminal}
              onOpenUrl={() => {
                openExternal()
                onShowToast?.('Abriendo login en nueva pestaña…')
              }}
              onCopy={(label) => {
                logCopyAction(projectId, credentialId, 'copied_url')
                handleCopy(label)
              }}
            />
            <LoginField
              label="Usuario"
              value={username}
              dark={isDark}
              terminal={isTerminal}
              copyDisabled={!username}
              onCopy={(label) => {
                logCopyAction(projectId, credentialId, 'copied_username')
                handleCopy(label)
              }}
            />
            <div style={{ position: 'relative' }}>
              <LoginField
                label="Contraseña"
                value={password}
                secret
                showSecret={showPassword}
                onToggleSecret={togglePassword}
                dark={isDark}
                terminal={isTerminal}
                copyDisabled={!password}
                onCopy={(label) => {
                  logCopyAction(projectId, credentialId, 'copied_password')
                  handleCopy(label)
                }}
              />
              {showPassword && (
                <div
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: -6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: countdown <= 10 ? '#ef4444' : '#10b981',
                    background: isDark ? 'rgba(0,0,0,0.6)' : 'white',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: `1px solid ${countdown <= 10 ? '#ef4444' : '#10b981'}40`,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  Auto-ocultar en {countdown}s
                </div>
              )}
              {revealing && (
                <div
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: -6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#a855f7',
                    background: isDark ? 'rgba(0,0,0,0.6)' : 'white',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: '1px solid rgba(168,85,247,0.4)',
                  }}
                >
                  Revelando…
                </div>
              )}
            </div>
            {extraFields.length > 0 &&
              extraFields.map(([key, val]) => (
                <LoginField
                  key={key}
                  label={formatExtraLabel(key)}
                  value={String(val)}
                  secret
                  showSecret={showPassword}
                  onToggleSecret={togglePassword}
                  dark={isDark}
                  terminal={isTerminal}
                  onCopy={(label) => {
                    logCopyAction(projectId, credentialId, 'copied_password')
                    handleCopy(label)
                  }}
                />
              ))}
            {cred.notes && (
              <LoginField
                label="Notas"
                value={cred.notes}
                dark={isDark}
                terminal={isTerminal}
                readOnly
              />
            )}
            <button
              type="button"
              disabled={!accessUrl}
              style={{
                width: '100%',
                padding: '10px 16px',
                marginTop: 6,
                background: isTerminal ? '#10b981' : isDark ? '#a855f7' : '#5b21b6',
                color: 'white',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: accessUrl ? 'pointer' : 'not-allowed',
                opacity: accessUrl ? 1 : 0.5,
                transition: 'filter 200ms',
                border: 'none',
              }}
              onClick={() => {
                if (!accessUrl) return
                openExternal()
                onShowToast?.('Abriendo panel en nueva pestaña…')
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = '')}
            >
              Abrir panel
            </button>
          </Chrome>
        </div>

        <div
          style={{
            padding: '10px 18px',
            background: 'rgba(245, 158, 11, 0.06)',
            borderTop: '1px solid var(--pd-border)',
            fontSize: 11,
            color: 'var(--pd-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Shield size={13} style={{ color: 'var(--pd-amber)' }} />
          Tu acceso queda registrado por seguridad{rotation ? ` · Rotada ${rotation}` : ''}
        </div>
      </div>
    </div>
  )
}

/* ===================== Spinner / states ===================== */

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

/* ===================== Tab ===================== */

export default function TabCredenciales({ projectId, onShowToast }) {
  const { data, loading, error, refetch } = useApi(
    `/client/projects/${projectId}/credentials`,
    { immediate: !!projectId },
  )
  const [openCred, setOpenCred] = useState(null)

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
  const credentials = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : []

  if (credentials.length === 0) {
    return (
      <div className="pd-tab-content">
        <div className="pd-card">
          <div className="pd-empty-state">
            <div className="pd-empty-state-art"><Key size={36} /></div>
            <div>
              <p className="pd-empty-state-title">Aún no hay credenciales disponibles</p>
              <p className="pd-empty-state-desc">
                Cuando entreguemos el proyecto te dejaremos aquí todos los accesos cifrados.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pd-tab-content">
      <div className="pd-section-head">
        <div>
          <h2 className="pd-section-title">Credenciales y accesos</h2>
          <p className="pd-section-sub">
            {credentials.length} {credentials.length === 1 ? 'servicio' : 'servicios'} · todas las contraseñas se piden bajo demanda y se ocultan automáticamente
          </p>
        </div>
        <div className="pd-section-actions">
          <span
            className="pd-chip"
            style={{ color: '#fbbf24', background: 'var(--pd-amber-bg)', borderColor: 'var(--pd-amber-border)' }}
          >
            <Lock size={12} /> Cifrado AES-256
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {credentials.map((c) => (
          <CredentialCard key={c.id ?? getServiceName(c)} cred={c} onOpen={setOpenCred} />
        ))}
      </div>

      <div
        className="pd-card"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(6,182,212,0.04))',
          borderColor: 'rgba(168,85,247,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="pd-card-head-icon pd-accent-purple" style={{ width: 44, height: 44 }}>
            <Key size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>¿Necesitas otro acceso?</div>
            <div style={{ fontSize: 12, color: 'var(--pd-text-muted)' }}>
              Si te falta una credencial o quieres rotar alguna, te abrimos un ticket con todo prerellenado.
            </div>
          </div>
          <button
            type="button"
            className="pd-btn pd-btn-primary pd-sm"
            onClick={() => {
              onShowToast?.('Abriendo ticket de solicitud de acceso…')
              window.location.href = '/portal/tickets/new'
            }}
          >
            <Plus size={13} /> Solicitar acceso
          </button>
        </div>
      </div>

      {openCred && (
        <CredentialModal
          cred={openCred}
          projectId={projectId}
          onClose={() => setOpenCred(null)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  )
}
