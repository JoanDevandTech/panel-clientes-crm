import { useEffect, useState } from 'react'
import { Modal, CodeInput } from './components'
import api from '../../../services/api'

export function VerifyEmailModal({ kind = 'primary', onClose, onShowToast, onVerified }) {
  const [step, setStep] = useState('request') // request | code
  const [newEmail, setNewEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  const requestEndpoint =
    kind === 'secondary'
      ? '/client/profile/email/secondary/request-verify'
      : '/client/profile/email/request-change'
  const verifyEndpoint =
    kind === 'secondary'
      ? '/client/profile/email/secondary/verify'
      : '/client/profile/email/verify-change'
  const resendEndpoint = '/client/profile/email/resend-code'

  const requestCode = async () => {
    if (!newEmail) return
    setBusy(true)
    setError(null)
    try {
      await api.post(requestEndpoint, { new_email: newEmail })
      setStep('code')
      setResendIn(60)
    } catch (err) {
      setError(err?.data?.message || err.message || 'No se pudo enviar el código')
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    if (code.length !== 6) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.post(verifyEndpoint, { code })
      onShowToast?.('Email verificado')
      onVerified?.(res?.data ?? res)
      onClose()
    } catch (err) {
      setError(err?.data?.message || err.message || 'Código incorrecto o expirado')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (resendIn > 0) return
    try {
      await api.post(resendEndpoint, {})
      setResendIn(60)
      onShowToast?.('Código reenviado')
    } catch (err) {
      setError(err?.data?.message || err.message || 'No se pudo reenviar')
    }
  }

  return (
    <Modal
      title={kind === 'secondary' ? 'Verificar email secundario' : 'Cambiar email principal'}
      onClose={onClose}
      footer={
        step === 'request' ? (
          <>
            <button type="button" className="pf-btn pf-ghost pf-sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="pf-btn pf-primary pf-sm" onClick={requestCode} disabled={!newEmail || busy}>
              Enviar código
            </button>
          </>
        ) : (
          <>
            <button type="button" className="pf-btn pf-ghost pf-sm" onClick={resend} disabled={resendIn > 0}>
              {resendIn > 0 ? `Reenviar en ${resendIn}s` : 'Reenviar código'}
            </button>
            <button
              type="button"
              className="pf-btn pf-primary pf-sm"
              onClick={verifyCode}
              disabled={code.length !== 6 || busy}
            >
              Verificar
            </button>
          </>
        )
      }
    >
      {step === 'request' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--pf-text-muted)', marginBottom: 16 }}>
            Te enviaremos un código de 6 dígitos al nuevo email para verificarlo.
          </p>
          <input
            type="email"
            placeholder="nuevo@email.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="pf-field-input"
          />
          {error && <div style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{error}</div>}
        </div>
      )}

      {step === 'code' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--pf-text-muted)', textAlign: 'center', marginBottom: 4 }}>
            Introduce el código que enviamos a
          </p>
          <p style={{ fontSize: 13, color: 'var(--pf-text-primary)', textAlign: 'center', fontWeight: 500, marginBottom: 4 }}>
            {newEmail}
          </p>
          <CodeInput value={code} onChange={setCode} />
          <p style={{ fontSize: 11, color: 'var(--pf-text-muted)', textAlign: 'center' }}>
            El código expira en 10 minutos
          </p>
          {error && <div style={{ fontSize: 12, color: '#f87171', marginTop: 8, textAlign: 'center' }}>{error}</div>}
        </div>
      )}
    </Modal>
  )
}
