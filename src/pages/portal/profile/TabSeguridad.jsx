import { useEffect, useMemo, useState } from 'react'
import {
  Shield,
  Mail,
  Phone,
  KeyRound,
  Smartphone,
  Download,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Lock,
  ShieldCheck,
  Bell,
  Loader2,
  Printer,
} from 'lucide-react'
import api, { apiRequest } from '../../../services/api'
import {
  Field,
  TextInput,
  ToggleRow,
  FormCard,
  Modal,
  CodeInput,
} from './components'

/* ---------------- Helpers ---------------- */

function calcPasswordRules(pw) {
  const len = (pw || '').length >= 8
  const upper = /[A-Z]/.test(pw || '')
  const num = /[0-9]/.test(pw || '')
  const special = /[^A-Za-z0-9]/.test(pw || '')
  return { len, upper, num, special }
}

function rulesScore(rules) {
  return [rules.len, rules.upper, rules.num, rules.special].filter(Boolean).length
}

function emptyTwoFactor() {
  return {
    is_enabled: false,
    primary_method: null,
    methods: [
      { method: 'email', is_enabled: false, is_primary: false },
      { method: 'totp', is_enabled: false, is_primary: false },
      { method: 'webauthn', is_enabled: false, is_primary: false },
      { method: 'sms', is_enabled: false, is_primary: false },
    ],
    backup_codes_generated: false,
    backup_codes_remaining: 0,
  }
}

function emptyAlerts() {
  return {
    alert_new_device_login: true,
    alert_password_changed: true,
    alert_fiscal_data_changed: true,
    alert_social_account_linked: true,
  }
}

const METHOD_META = {
  email: {
    icon: Mail,
    color: 'cyan',
    title: 'Código por email',
    sub: 'Recibe un código de 6 dígitos en tu email principal',
  },
  totp: {
    icon: ShieldCheck,
    color: 'cyan',
    title: 'App autenticadora',
    sub: 'Google Authenticator, Authy, 1Password, etc.',
  },
  webauthn: {
    icon: KeyRound,
    color: 'green',
    title: 'Llave física (FIDO2 / WebAuthn)',
    sub: 'YubiKey, Titan Key, Passkeys',
  },
  sms: {
    icon: Smartphone,
    color: 'amber',
    title: 'SMS al teléfono',
    sub: 'Código por SMS al número verificado',
  },
}

const METHOD_ORDER = ['email', 'totp', 'webauthn', 'sms']

function mergeMethods(currentMethods) {
  const map = new Map()
  for (const k of METHOD_ORDER) {
    map.set(k, { method: k, is_enabled: false, is_primary: false })
  }
  if (Array.isArray(currentMethods)) {
    for (const m of currentMethods) {
      if (m && map.has(m.method)) {
        map.set(m.method, { ...map.get(m.method), ...m })
      }
    }
  }
  return METHOD_ORDER.map((k) => map.get(k))
}

/* ---------------- Componente principal ---------------- */

export default function TabSeguridad({ profile, onShowToast, updateProfilePartial }) {
  const twoFactor = profile?.two_factor || emptyTwoFactor()
  const securityAlerts = profile?.security_alerts || emptyAlerts()

  const methods = useMemo(() => mergeMethods(twoFactor.methods), [twoFactor.methods])

  const showToast = (msg, type = 'success') => {
    if (typeof onShowToast === 'function') onShowToast(msg, type)
  }

  /* ---------------- Cambio de contraseña ---------------- */

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState(null)

  const rules = useMemo(() => calcPasswordRules(newPw), [newPw])
  const score = rulesScore(rules)
  const allRulesOk = score === 4
  const matches = newPw.length > 0 && newPw === confirmPw
  const canSubmitPw = !!currentPw && allRulesOk && matches && !pwBusy

  const submitPasswordChange = async () => {
    if (!canSubmitPw) return
    setPwBusy(true)
    setPwError(null)
    try {
      await api.post('/client/profile/password', {
        current_password: currentPw,
        new_password: newPw,
        new_password_confirmation: confirmPw,
      })
      showToast('Contraseña actualizada')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'No se pudo cambiar la contraseña'
      setPwError(msg)
      showToast(msg, 'error')
    } finally {
      setPwBusy(false)
    }
  }

  /* ---------------- Métodos 2FA ---------------- */

  const [methodBusy, setMethodBusy] = useState({})

  const updateTwoFactorLocal = (next) => {
    if (typeof updateProfilePartial === 'function') {
      updateProfilePartial({ two_factor: next })
    }
  }

  const recomputeAggregate = (nextMethods, prev) => {
    const enabledList = nextMethods.filter((m) => m.is_enabled)
    const isEnabled = enabledList.length > 0
    const primaryFromList = enabledList.find((m) => m.is_primary)
    const primaryMethod = primaryFromList ? primaryFromList.method : (enabledList[0]?.method ?? null)
    return {
      ...prev,
      is_enabled: isEnabled,
      primary_method: primaryMethod,
      methods: nextMethods,
    }
  }

  const setMethodState = (methodKey, patch) => {
    const nextMethods = methods.map((m) =>
      m.method === methodKey ? { ...m, ...patch } : m,
    )
    updateTwoFactorLocal(recomputeAggregate(nextMethods, twoFactor))
  }

  const toggleEmail = async (val) => {
    setMethodBusy((b) => ({ ...b, email: true }))
    try {
      if (val) {
        await api.post('/client/profile/2fa/email/enable', {})
        setMethodState('email', {
          is_enabled: true,
          enabled_at: new Date().toISOString(),
        })
        showToast('2FA por email activado')
      } else {
        await api.post('/client/profile/2fa/email/disable', {})
        setMethodState('email', { is_enabled: false, is_primary: false })
        showToast('2FA por email desactivado')
      }
    } catch (err) {
      showToast(err?.data?.message || err?.message || 'No se pudo actualizar el método', 'error')
    } finally {
      setMethodBusy((b) => ({ ...b, email: false }))
    }
  }

  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpDisableModalOpen, setTotpDisableModalOpen] = useState(false)

  const toggleTotp = (val) => {
    if (val) {
      setTotpModalOpen(true)
    } else {
      setTotpDisableModalOpen(true)
    }
  }

  const onTotpEnabled = () => {
    setMethodState('totp', {
      is_enabled: true,
      enabled_at: new Date().toISOString(),
    })
  }

  const toggleWebauthn = () => {
    showToast('WebAuthn no implementado todavía en este panel', 'info')
  }

  const toggleSms = async (val) => {
    setMethodBusy((b) => ({ ...b, sms: true }))
    try {
      if (val) {
        await api.post('/client/profile/2fa/sms/enable', {})
        setMethodState('sms', {
          is_enabled: true,
          enabled_at: new Date().toISOString(),
        })
        showToast('2FA por SMS activado')
      } else {
        await api.post('/client/profile/2fa/sms/disable', {})
        setMethodState('sms', { is_enabled: false, is_primary: false })
        showToast('2FA por SMS desactivado')
      }
    } catch (err) {
      const status = err?.status
      if (status === 404 || status === 405) {
        showToast('Próximamente', 'info')
      } else {
        showToast(err?.data?.message || err?.message || 'No se pudo actualizar el método', 'error')
      }
    } finally {
      setMethodBusy((b) => ({ ...b, sms: false }))
    }
  }

  const setPrimaryMethod = async (methodKey) => {
    setMethodBusy((b) => ({ ...b, [`primary_${methodKey}`]: true }))
    try {
      await api.post('/client/profile/2fa/set-primary', { method: methodKey })
      const nextMethods = methods.map((m) => ({
        ...m,
        is_primary: m.method === methodKey,
      }))
      updateTwoFactorLocal({
        ...twoFactor,
        primary_method: methodKey,
        methods: nextMethods,
      })
      showToast('Método principal actualizado')
    } catch (err) {
      showToast(err?.data?.message || err?.message || 'No se pudo actualizar el método principal', 'error')
    } finally {
      setMethodBusy((b) => ({ ...b, [`primary_${methodKey}`]: false }))
    }
  }

  /* ---------------- Backup codes ---------------- */

  const [backupBusy, setBackupBusy] = useState(false)
  const [backupCodes, setBackupCodes] = useState(null)

  const generateBackupCodes = async (confirm = false) => {
    if (twoFactor.backup_codes_generated && confirm) {
      const ok = window.confirm('Esto invalidará los códigos anteriores. ¿Continuar?')
      if (!ok) return
    }
    setBackupBusy(true)
    try {
      const res = await api.post('/client/profile/2fa/backup-codes/generate', {})
      const payload = res?.data ?? res
      const codes = payload?.codes || []
      setBackupCodes(codes)
      updateTwoFactorLocal({
        ...twoFactor,
        backup_codes_generated: true,
        backup_codes_remaining: codes.length,
      })
      showToast('Códigos generados')
    } catch (err) {
      showToast(err?.data?.message || err?.message || 'No se pudieron generar los códigos', 'error')
    } finally {
      setBackupBusy(false)
    }
  }

  /* ---------------- Alertas seguridad ---------------- */

  const [alertsBusy, setAlertsBusy] = useState(false)

  const onChangeAlert = async (key, val) => {
    const next = { ...securityAlerts, [key]: val }
    if (typeof updateProfilePartial === 'function') {
      updateProfilePartial({ security_alerts: next })
    }
    setAlertsBusy(true)
    try {
      await apiRequest('/client/profile/security-alerts', {
        method: 'PATCH',
        body: JSON.stringify(next),
      })
      showToast('Alertas actualizadas')
    } catch (err) {
      // Revert on error
      if (typeof updateProfilePartial === 'function') {
        updateProfilePartial({ security_alerts: securityAlerts })
      }
      showToast(err?.data?.message || err?.message || 'No se pudieron actualizar las alertas', 'error')
    } finally {
      setAlertsBusy(false)
    }
  }

  /* ---------------- Render helpers ---------------- */

  const eyeBtn = (visible, onToggle) => (
    <button
      type="button"
      onClick={onToggle}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--pf-text-muted)',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
      }}
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {visible ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  )

  const renderMethodRow = (m) => {
    const meta = METHOD_META[m.method]
    if (!meta) return null
    const Icon = meta.icon
    const busy = methodBusy[m.method]
    const primaryBusy = methodBusy[`primary_${m.method}`]

    let onChange
    if (m.method === 'email') onChange = toggleEmail
    else if (m.method === 'totp') onChange = toggleTotp
    else if (m.method === 'webauthn') onChange = toggleWebauthn
    else if (m.method === 'sms') onChange = toggleSms

    return (
      <div
        key={m.method}
        className="pf-toggle-row"
        style={{ alignItems: 'flex-start' }}
      >
        <div
          className={`pf-card-head-icon pf-accent-${meta.color}`}
          style={{ width: 32, height: 32, flexShrink: 0 }}
        >
          <Icon size={15} />
        </div>
        <div className="pf-toggle-row-text">
          <div className="pf-toggle-row-title">{meta.title}</div>
          {meta.sub && <div className="pf-toggle-row-sub">{meta.sub}</div>}
          {(m.is_enabled || m.is_primary) && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {m.is_enabled && <span className="pf-badge green">Activo</span>}
              {m.is_primary && <span className="pf-badge cyan">Principal</span>}
              {m.is_enabled && !m.is_primary && (
                <button
                  type="button"
                  className="pf-btn pf-ghost pf-sm"
                  onClick={() => setPrimaryMethod(m.method)}
                  disabled={primaryBusy}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  {primaryBusy ? <Loader2 size={11} className="pf-spin" /> : null}
                  Hacer principal
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {busy && <Loader2 size={14} className="pf-spin" style={{ color: 'var(--pf-text-muted)' }} />}
          <button
            type="button"
            className={`pf-toggle ${m.is_enabled ? 'on' : ''}`}
            onClick={() => !busy && onChange?.(!m.is_enabled)}
            aria-pressed={!!m.is_enabled}
            disabled={busy}
          >
            <span className="pf-toggle-knob" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pf-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ===== Card 1: Cambiar contraseña ===== */}
      <FormCard
        icon={Lock}
        iconAccent="cyan"
        title="Cambiar contraseña"
        subtitle="Mínimo 8 caracteres con mayúscula, número y carácter especial"
      >
        <Field label="Contraseña actual" required>
          <TextInput
            type={showCurrent ? 'text' : 'password'}
            value={currentPw}
            onChange={setCurrentPw}
            autoComplete="current-password"
            suffix={eyeBtn(showCurrent, () => setShowCurrent((s) => !s))}
          />
        </Field>

        <Field label="Nueva contraseña" required>
          <TextInput
            type={showNew ? 'text' : 'password'}
            value={newPw}
            onChange={setNewPw}
            autoComplete="new-password"
            suffix={eyeBtn(showNew, () => setShowNew((s) => !s))}
          />
          {newPw && (
            <>
              <div className="pf-pw-meter" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`pf-pw-meter-bar ${i <= score ? `on-${score}` : ''}`}
                  />
                ))}
              </div>
              <div className="pf-pw-rules">
                <div className={`pf-pw-rule ${rules.len ? 'ok' : ''}`}>
                  <span className="pf-pw-rule-check">{rules.len && <Check size={10} />}</span>
                  Mínimo 8 caracteres
                </div>
                <div className={`pf-pw-rule ${rules.upper ? 'ok' : ''}`}>
                  <span className="pf-pw-rule-check">{rules.upper && <Check size={10} />}</span>
                  Al menos una mayúscula
                </div>
                <div className={`pf-pw-rule ${rules.num ? 'ok' : ''}`}>
                  <span className="pf-pw-rule-check">{rules.num && <Check size={10} />}</span>
                  Al menos un número
                </div>
                <div className={`pf-pw-rule ${rules.special ? 'ok' : ''}`}>
                  <span className="pf-pw-rule-check">{rules.special && <Check size={10} />}</span>
                  Al menos un carácter especial
                </div>
              </div>
            </>
          )}
        </Field>

        <Field
          label="Confirmar contraseña"
          required
          hint={
            confirmPw && !matches
              ? 'Las contraseñas no coinciden'
              : confirmPw && matches
              ? 'Coincide'
              : undefined
          }
          hintState={confirmPw && !matches ? 'error' : confirmPw && matches ? 'valid' : undefined}
        >
          <TextInput
            type={showConfirm ? 'text' : 'password'}
            value={confirmPw}
            onChange={setConfirmPw}
            autoComplete="new-password"
            error={!!(confirmPw && !matches)}
            valid={!!(confirmPw && matches)}
            suffix={eyeBtn(showConfirm, () => setShowConfirm((s) => !s))}
          />
        </Field>

        {pwError && (
          <div
            style={{
              fontSize: 12,
              color: '#FF5C7A',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
            }}
          >
            <AlertCircle size={12} /> {pwError}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="pf-btn pf-primary"
            onClick={submitPasswordChange}
            disabled={!canSubmitPw}
          >
            {pwBusy ? <Loader2 size={14} className="pf-spin" /> : <Lock size={14} />}
            Cambiar contraseña
          </button>
        </div>
      </FormCard>

      {/* ===== Card 2: Métodos de doble factor ===== */}
      <FormCard
        icon={Shield}
        iconAccent="amber"
        title="Métodos de doble factor"
        subtitle="Añade una capa extra de seguridad al iniciar sesión"
      >
        {methods.map(renderMethodRow)}
      </FormCard>

      {/* ===== Card 3: Códigos de respaldo ===== */}
      <FormCard
        icon={Download}
        iconAccent="green"
        title="Códigos de respaldo"
        subtitle="Úsalos si pierdes acceso a tu segundo factor"
      >
        {twoFactor.backup_codes_generated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--pf-text-secondary)', flex: 1, minWidth: 200 }}>
              Te quedan{' '}
              <strong style={{ color: 'var(--pf-text-primary)' }}>
                {twoFactor.backup_codes_remaining}
              </strong>{' '}
              códigos de respaldo
            </div>
            <button
              type="button"
              className="pf-btn pf-ghost pf-sm"
              onClick={() => generateBackupCodes(true)}
              disabled={backupBusy}
            >
              {backupBusy ? <Loader2 size={13} className="pf-spin" /> : <Download size={13} />}
              Regenerar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--pf-text-muted)', flex: 1, minWidth: 200 }}>
              Aún no has generado códigos de respaldo.
            </div>
            <button
              type="button"
              className="pf-btn pf-primary pf-sm"
              onClick={() => generateBackupCodes(false)}
              disabled={backupBusy}
            >
              {backupBusy ? <Loader2 size={13} className="pf-spin" /> : <Download size={13} />}
              Generar códigos
            </button>
          </div>
        )}
      </FormCard>

      {/* ===== Card 4: Alertas de seguridad ===== */}
      <FormCard icon={Bell} iconAccent="cyan" title="Alertas de seguridad">
        <ToggleRow
          icon={Smartphone}
          color="cyan"
          title="Inicio de sesión en nuevo dispositivo"
          sub="Te avisamos si detectamos un acceso desde un dispositivo desconocido"
          value={!!securityAlerts.alert_new_device_login}
          onChange={(v) => onChangeAlert('alert_new_device_login', v)}
          disabled={alertsBusy}
        />
        <ToggleRow
          icon={Lock}
          color="cyan"
          title="Cambio de contraseña"
          sub="Notificación cada vez que cambies tu contraseña"
          value={!!securityAlerts.alert_password_changed}
          onChange={(v) => onChangeAlert('alert_password_changed', v)}
          disabled={alertsBusy}
        />
        <ToggleRow
          icon={AlertCircle}
          color="amber"
          title="Cambio en datos fiscales"
          sub="Te avisamos si se modifican tus datos fiscales o de facturación"
          value={!!securityAlerts.alert_fiscal_data_changed}
          onChange={(v) => onChangeAlert('alert_fiscal_data_changed', v)}
          disabled={alertsBusy}
        />
        <ToggleRow
          icon={KeyRound}
          color="green"
          title="Vinculación de cuenta SSO"
          sub="Notificación cuando se vincule o desvincule una cuenta externa"
          value={!!securityAlerts.alert_social_account_linked}
          onChange={(v) => onChangeAlert('alert_social_account_linked', v)}
          disabled={alertsBusy}
        />
      </FormCard>

      {/* ===== Modales ===== */}
      {totpModalOpen && (
        <TotpModal
          onClose={() => setTotpModalOpen(false)}
          onShowToast={showToast}
          onEnabled={onTotpEnabled}
        />
      )}

      {totpDisableModalOpen && (
        <TotpDisableModal
          onClose={() => setTotpDisableModalOpen(false)}
          onShowToast={showToast}
          onDisabled={() => setMethodState('totp', { is_enabled: false, is_primary: false })}
        />
      )}

      {backupCodes && (
        <BackupCodesModal codes={backupCodes} onClose={() => setBackupCodes(null)} />
      )}
    </div>
  )
}

/* ---------------- TotpModal ---------------- */

function TotpModal({ onClose, onShowToast, onEnabled }) {
  const [loading, setLoading] = useState(true)
  const [setupData, setSetupData] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.post('/client/profile/2fa/totp/setup', {})
        const payload = res?.data ?? res
        if (!cancelled) {
          setSetupData({
            secret: payload?.secret || '',
            qr_code_svg: payload?.qr_code_svg || '',
            qr_code_url: payload?.qr_code_url || '',
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.data?.message || err?.message || 'No se pudo iniciar la configuración')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const verify = async () => {
    if (code.length !== 6) return
    setBusy(true)
    setError(null)
    try {
      await api.post('/client/profile/2fa/totp/verify', { code })
      onShowToast?.('TOTP activado')
      onEnabled?.()
      onClose()
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Código inválido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Configurar app autenticadora"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="pf-btn pf-ghost pf-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="pf-btn pf-primary pf-sm"
            onClick={verify}
            disabled={code.length !== 6 || busy || loading}
          >
            {busy ? <Loader2 size={13} className="pf-spin" /> : <Check size={13} />}
            Verificar y activar
          </button>
        </>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Loader2 size={24} className="pf-spin" />
        </div>
      ) : error && !setupData ? (
        <div
          style={{
            fontSize: 13,
            color: '#FF5C7A',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 12,
          }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--pf-text-secondary)', marginBottom: 16 }}>
            Escanea el QR con tu app autenticadora y luego introduce el código de 6 dígitos.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 16,
              background: 'rgba(248, 249, 250,0.04)',
              border: '1px solid var(--pf-border)',
              marginBottom: 12,
            }}
          >
            {setupData?.qr_code_svg ? (
              <div
                style={{ background: 'var(--pr-text-primary)', padding: 10 }}
                dangerouslySetInnerHTML={{ __html: setupData.qr_code_svg }}
              />
            ) : setupData?.qr_code_url ? (
              <img
                src={setupData.qr_code_url}
                alt="QR código"
                style={{ background: 'var(--pr-text-primary)', padding: 10, maxWidth: 200 }}
              />
            ) : (
              <div style={{ fontSize: 12, color: 'var(--pf-text-muted)' }}>QR no disponible</div>
            )}
          </div>

          {setupData?.secret && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--pf-text-muted)', marginBottom: 4 }}>
                ¿No puedes escanear? Introduce este código manualmente:
              </div>
              <div
                style={{
                  fontFamily: 'var(--pr-font-mono)',
                  fontSize: 13,
                  background: 'rgba(248, 249, 250,0.06)',
                  padding: '8px 12px',
                  border: '1px solid var(--pf-border)',
                  textAlign: 'center',
                  letterSpacing: 2,
                  wordBreak: 'break-all',
                }}
              >
                {setupData.secret}
              </div>
            </div>
          )}

          <Field label="Código de 6 dígitos">
            <CodeInput value={code} onChange={setCode} length={6} />
          </Field>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: '#FF5C7A',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
              }}
            >
              <AlertCircle size={12} /> {error}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

/* ---------------- TotpDisableModal ---------------- */

function TotpDisableModal({ onClose, onShowToast, onDisabled }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    if (!password) return
    setBusy(true)
    setError(null)
    try {
      await api.post('/client/profile/2fa/totp/disable', { password })
      onShowToast?.('TOTP desactivado')
      onDisabled?.()
      onClose()
    } catch (err) {
      setError(err?.data?.message || err?.message || 'No se pudo desactivar TOTP')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Desactivar app autenticadora"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="pf-btn pf-ghost pf-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="pf-btn pf-danger pf-sm"
            onClick={submit}
            disabled={!password || busy}
          >
            {busy ? <Loader2 size={13} className="pf-spin" /> : <X size={13} />}
            Desactivar
          </button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--pf-text-secondary)', marginBottom: 16 }}>
        Por seguridad, introduce tu contraseña para desactivar el segundo factor TOTP.
      </p>
      <Field label="Contraseña" required>
        <TextInput
          type={show ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          suffix={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--pf-text-muted)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />
      </Field>
      {error && (
        <div
          style={{
            fontSize: 12,
            color: '#FF5C7A',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
          }}
        >
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </Modal>
  )
}

/* ---------------- BackupCodesModal ---------------- */

function BackupCodesModal({ codes, onClose }) {
  const downloadTxt = () => {
    const content = `Códigos de respaldo - ${new Date().toLocaleString('es-ES')}\n\n${codes.join('\n')}\n\nIMPORTANTE: Guarda estos códigos en un sitio seguro. No se mostrarán de nuevo.\n`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-codes-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const printCodes = () => {
    window.print()
  }

  return (
    <Modal
      title="Códigos de respaldo"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="pf-btn pf-ghost pf-sm" onClick={downloadTxt}>
            <Download size={13} /> Descargar TXT
          </button>
          <button type="button" className="pf-btn pf-ghost pf-sm" onClick={printCodes}>
            <Printer size={13} /> Imprimir
          </button>
          <button type="button" className="pf-btn pf-primary pf-sm" onClick={onClose}>
            <Check size={13} /> Ya los guardé
          </button>
        </>
      }
    >
      <div
        style={{
          fontSize: 12,
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#FBBF24',
          padding: '10px 12px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Estos códigos NO se mostrarán de nuevo. Guárdalos en un sitio seguro: cada código solo
          podrá usarse una vez.
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}
      >
        {codes.map((c, i) => (
          <div
            key={i}
            style={{
              fontFamily: 'var(--pr-font-mono)',
              fontSize: 13,
              background: 'rgba(248, 249, 250,0.06)',
              padding: '10px 12px',
              border: '1px solid var(--pf-border)',
              textAlign: 'center',
              letterSpacing: 1,
              color: 'var(--pf-text-primary)',
            }}
          >
            {c}
          </div>
        ))}
      </div>
    </Modal>
  )
}
