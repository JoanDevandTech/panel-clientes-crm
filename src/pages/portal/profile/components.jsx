import { useState, useEffect, useRef } from 'react'
import { Check, AlertCircle, ChevronDown, X, Camera, MapPin, Calendar, Trophy, FileDown, Edit, CheckCircle } from 'lucide-react'

/* ============== Primitivas de formulario ============== */

export function Field({ label, hint, hintState, required, children }) {
  return (
    <div className="pf-field">
      <label className="pf-field-label">
        {label}
        {required && <span className="pf-req">*</span>}
      </label>
      {children}
      {hint && (
        <span className={`pf-field-hint ${hintState === 'error' ? 'pf-error-hint' : hintState === 'valid' ? 'pf-valid-hint' : ''}`}>
          {hint}
        </span>
      )}
    </div>
  )
}

export function TextInput({
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  readonly,
  valid,
  error,
  suffix,
  prefixIcon,
  autoComplete,
}) {
  return (
    <div className="pf-field-input-wrap">
      {prefixIcon && <span className="pf-field-prefix-icon">{prefixIcon}</span>}
      <input
        type={type}
        readOnly={readonly}
        value={value ?? ''}
        autoComplete={autoComplete}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`pf-field-input ${prefixIcon ? 'pf-with-prefix-icon' : ''} ${readonly ? 'pf-readonly' : ''} ${valid ? 'pf-valid' : ''} ${error ? 'pf-error' : ''}`}
      />
      {suffix && <span className="pf-field-suffix">{suffix}</span>}
    </div>
  )
}

export function Textarea({ value, onChange, onBlur, placeholder, rows = 3 }) {
  return (
    <textarea
      className="pf-field-input"
      rows={rows}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  )
}

export function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      className={`pf-toggle ${value ? 'on' : ''}`}
      onClick={() => !disabled && onChange?.(!value)}
      aria-pressed={!!value}
      disabled={disabled}
    >
      <span className="pf-toggle-knob" />
    </button>
  )
}

export function ToggleRow({ title, sub, value, onChange, icon: Icon, color, disabled }) {
  return (
    <div className="pf-toggle-row">
      {Icon && (
        <div className={`pf-card-head-icon pf-accent-${color || 'cyan'}`} style={{ width: 32, height: 32, flexShrink: 0 }}>
          <Icon size={15} />
        </div>
      )}
      <div className="pf-toggle-row-text">
        <div className="pf-toggle-row-title">{title}</div>
        {sub && <div className="pf-toggle-row-sub">{sub}</div>}
      </div>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  )
}

export function RadioGroup({ value, onChange, options }) {
  return (
    <div className="pf-radio-group">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          className={`pf-radio-card ${value === o.value ? 'checked' : ''}`}
          onClick={() => onChange?.(o.value)}
        >
          <span className="pf-radio-card-dot" />
          <span>
            <div className="pf-radio-card-title">{o.label}</div>
            {o.sub && <div className="pf-radio-card-sub">{o.sub}</div>}
          </span>
        </button>
      ))}
    </div>
  )
}

export function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      className="pf-field-input"
      style={{
        cursor: 'pointer',
        appearance: 'none',
        paddingRight: 32,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23F8F9FA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
      }}
    >
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o
        const l = typeof o === 'object' ? o.label : o
        return (
          <option key={v} value={v} style={{ background: 'var(--pr-bg-surface)' }}>
            {l}
          </option>
        )
      })}
    </select>
  )
}

export function VerifyBadge({ verified, onVerify }) {
  if (verified) {
    return (
      <span className="pf-vbadge verified">
        <Check size={10} /> Verificado
      </span>
    )
  }
  return (
    <button type="button" className="pf-vbadge pending" onClick={onVerify}>
      <AlertCircle size={10} /> Verificar
    </button>
  )
}

export function SubHead({ children }) {
  return <div className="pf-subhead">{children}</div>
}

export function FormCard({ icon: Icon, iconAccent = 'cyan', title, subtitle, action, children }) {
  return (
    <div className="pf-card">
      <div className="pf-card-head">
        {Icon && (
          <div className={`pf-card-head-icon pf-accent-${iconAccent}`}>
            <Icon size={16} />
          </div>
        )}
        <div>
          <div className="pf-card-head-title">{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--pf-text-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      {children}
    </div>
  )
}

/* ============== Header del perfil ============== */

function getInitials(user) {
  const fn = user?.name || user?.first_name || ''
  const ln = user?.last_name || ''
  if (fn || ln) return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || '?'
  if (user?.email) return user.email.charAt(0).toUpperCase()
  return '?'
}

function fullName(user) {
  if (!user) return ''
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim()
  }
  return user.name || ''
}

function GRADIENT_PRESETS() {
  // Espejo de GRADIENTS en AvatarModal.jsx — los slugs son contrato con la API.
  return {
    'purple-cyan': 'linear-gradient(135deg, #0D0E11 0%, #111319 45%, #0E3A44 78%, #00E5FF 100%)',
    sunset: 'linear-gradient(135deg, #F59E0B 0%, #FF1744 50%, #EC4899 100%)',
    ocean: 'linear-gradient(135deg, #0EA5E9 0%, #00E5FF 50%, #14B8A6 100%)',
    forest: 'linear-gradient(135deg, #166534 0%, #14b8a6 50%, #0c4a6e 100%)',
    aurora: 'linear-gradient(135deg, #0D0E11 0%, #00E5FF 50%, #10B981 100%)',
    crimson: 'linear-gradient(135deg, #7F1D1D 0%, #FF1744 50%, #F59E0B 100%)',
    gold: 'linear-gradient(135deg, #B45309 0%, #F59E0B 50%, #FDE047 100%)',
    mint: 'linear-gradient(135deg, #047857 0%, #10B981 50%, #6EE7B7 100%)',
    lavender: 'linear-gradient(135deg, #101218 0%, #0E3A44 50%, #7FF0FF 100%)',
    midnight: 'linear-gradient(135deg, #0D0E11 0%, #15171D 50%, #262A33 100%)',
    coral: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
    slate: 'linear-gradient(135deg, #111319 0%, #2A2E38 50%, #5B6068 100%)',
  }
}

export function PerfilHeader({ profile, onOpenAvatarModal, onOpenBannerModal }) {
  const user = profile?.user || {}
  const completion = profile?.completeness?.total_percentage ?? 0

  let bannerStyle = {}
  if (user.cover_url) {
    bannerStyle = {
      backgroundImage: `url(${user.cover_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  } else if (user.cover_type === 'gradient' && user.cover_value) {
    const presets = GRADIENT_PRESETS()
    if (presets[user.cover_value]) bannerStyle = { background: presets[user.cover_value] }
  } else if (user.cover_type === 'color' && user.cover_value) {
    bannerStyle = { background: user.cover_value }
  }

  const ringR = 71
  const ringC = 2 * Math.PI * ringR

  return (
    <div style={{ marginBottom: 24 }}>
      <div className={`pf-banner ${user.cover_url ? 'pf-banner-image' : ''}`} style={bannerStyle}>
        <button type="button" className="pf-banner-edit" onClick={onOpenBannerModal}>
          <Camera size={13} /> Cambiar portada
        </button>
      </div>

      <div className="pf-identity-row">
        <div className="pf-avatar-wrap">
          <svg className="pf-completion-ring" viewBox="0 0 148 148">
            <circle cx="74" cy="74" r={ringR} fill="none" stroke="rgba(248,249,250,0.08)" strokeWidth="3" />
            <circle
              cx="74"
              cy="74"
              r={ringR}
              fill="none"
              stroke="var(--pr-accent-cyan)"
              strokeWidth="3"
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - completion / 100)}
              strokeLinecap="round"
              transform="rotate(-90 74 74)"
              style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.4,0,0.2,1)' }}
            />
          </svg>
          <div className="pf-avatar" onClick={onOpenAvatarModal}>
            {user.avatar_url ? <img src={user.avatar_url} alt={fullName(user)} /> : getInitials(user)}
            <span className="pf-avatar-cam" aria-label="Cambiar foto">
              <Camera size={16} strokeWidth={2} />
            </span>
          </div>
        </div>

        <div className="pf-identity-text">
          <h1 className="pf-name">
            {fullName(user) || 'Sin nombre'}
            {user.email_verified_at && <CheckCircle size={20} style={{ color: '#34D399' }} />}
          </h1>
          <p className="pf-role">
            {user.job_title || ''}
            {user.job_title && user.company ? ' · ' : ''}
            {user.company || ''}
          </p>
          <div className="pf-chips">
            {(profile?.address?.city || profile?.address?.region || profile?.address?.country) && (
              <span className="pf-chip">
                <MapPin size={11} />
                {[profile.address.city, profile.address.region].filter(Boolean).join(', ')}
              </span>
            )}
            {user.client_since && (
              <span className="pf-chip">
                <Calendar size={11} /> Cliente desde {user.client_since}
              </span>
            )}
            {user.completed_projects_count != null && (
              <span className="pf-chip">
                <Trophy size={11} /> {user.completed_projects_count} proyectos completados
              </span>
            )}
          </div>
        </div>

        <div className="pf-header-actions">
          <button type="button" className="pf-btn pf-ghost pf-sm">
            <FileDown size={14} /> vCard
          </button>
          <button type="button" className="pf-btn pf-primary pf-sm">
            <Edit size={13} /> Editar perfil
          </button>
        </div>
      </div>

      <CompletionBar completion={profile?.completeness} onJumpTab={null} />
    </div>
  )
}

export function CompletionBar({ completion, onJumpTab }) {
  const [expanded, setExpanded] = useState(false)
  const total = completion?.total_percentage ?? 0
  const breakdown = completion?.breakdown || {}
  const suggestions = completion?.suggestions || []

  const colorByPct = (pct) => {
    if (pct >= 90) return 'var(--pr-accent-green)'
    if (pct >= 60) return 'var(--pr-accent-amber)'
    return 'var(--pr-accent-red)'
  }

  const breakdownLabels = {
    personal_info: 'Personal',
    email_verified: 'Email verificado',
    personal_address: 'Dirección',
    fiscal_data: 'Datos fiscales',
    billing_preferences: 'Facturación',
    two_factor: '2FA',
    social_account: 'SSO',
  }

  const parts = Object.entries(breakdown).map(([key, val]) => ({
    key,
    label: breakdownLabels[key] || key,
    pct: val.percentage ?? 0,
    color: colorByPct(val.percentage ?? 0),
  }))

  return (
    <div>
      <div className="pf-completion-bar">
        <div className="pf-completion-bar-num">{total}%</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Perfil completado al {total}%</div>
            {parts.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                style={{ fontSize: 12, color: 'var(--pf-cyan)', display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                {expanded ? 'Ocultar desglose' : 'Ver desglose'}
                <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
              </button>
            )}
          </div>
          <div className="pf-completion-bar-track">
            <div className="pf-completion-bar-fill" style={{ width: `${total}%` }} />
          </div>
          {suggestions.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--pf-text-muted)', marginTop: 6 }}>
              💼 {suggestions[0].message}
              {suggestions[0].tab && onJumpTab && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => onJumpTab(suggestions[0].tab)}
                    style={{ color: 'var(--pf-cyan)', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0, font: 'inherit' }}
                  >
                    Saltar al tab →
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {expanded && parts.length > 0 && (
        <div className="pf-card" style={{ padding: 16, marginBottom: 20, marginTop: -12, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {parts.map((p) => (
              <div key={p.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--pf-text-secondary)' }}>{p.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: p.color, fontVariantNumeric: 'tabular-nums' }}>
                    {p.pct}%
                  </span>
                </div>
                <div style={{ height: 4, background: 'rgba(248,249,250,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${p.pct}%`, background: p.color, height: '100%', transition: 'width 600ms var(--pf-ease)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function PerfilTabs({ tabs, active, onChange }) {
  return (
    <nav className="pf-tabs" aria-label="Secciones de perfil">
      <div className="pf-tabs-inner">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = active === t.key
          return (
            <button
              key={t.key}
              type="button"
              className={`pf-tab ${isActive ? 'pf-active' : ''}`}
              onClick={() => onChange(t.key)}
            >
              <Icon size={15} />
              <span>{t.label}</span>
              {t.flag === 'incomplete' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pr-accent-amber)' }} />
              )}
              {t.flag === 'warn' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pf-red)' }} />
              )}
              {isActive && <span className="pf-tab-indicator" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ============== Modal genérico ============== */

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="pf-modal-backdrop" onClick={onClose}>
      <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pf-modal-head">
          <div className="pf-modal-head-title">{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--pf-text-muted)', cursor: 'pointer', padding: 4 }}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="pf-modal-body">{children}</div>
        {footer && <div className="pf-modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

/* ============== Code input (6 dígitos) ============== */

export function CodeInput({ length = 6, value, onChange }) {
  const refs = useRef([])
  const arr = (value || '').split('').slice(0, length)
  while (arr.length < length) arr.push('')

  const setDigit = (i, char) => {
    const cleaned = (char || '').replace(/[^0-9]/g, '').slice(0, 1)
    const next = [...arr]
    next[i] = cleaned
    const joined = next.join('').slice(0, length)
    onChange?.(joined)
    if (cleaned && i < length - 1) {
      refs.current[i + 1]?.focus()
    }
  }

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !arr[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
  }

  return (
    <div className="pf-code-inputs">
      {arr.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
        />
      ))}
    </div>
  )
}
