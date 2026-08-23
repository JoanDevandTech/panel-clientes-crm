import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, XCircle, ArrowLeft, ShieldCheck, Smartphone, KeyRound, Loader2 } from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '../hooks/useAuth'

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Krom'
const BRAND_SUBTITLE = import.meta.env.VITE_BRAND_SUBTITLE || 'Portal cliente'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Botón primario Krom: cian plano, texto sobre el ground, mono en versales.
const KROM_CTA =
  'w-full py-4 px-6 bg-primary text-background-dark font-mono font-semibold text-xs uppercase tracking-[0.16em] ' +
  'hover:bg-secondary hover:shadow-[0_0_40px_rgba(0,229,255,.28)] transition-all ' +
  'disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

function validateField(name, value) {
  switch (name) {
    case 'email':
      if (!value.trim()) return 'El email es obligatorio.'
      if (!emailRegex.test(value)) return 'Introduce un email válido.'
      return ''
    case 'password':
      if (!value) return 'La contraseña es obligatoria.'
      return ''
    case 'code':
      if (!value.trim()) return 'El código es obligatorio.'
      if (!/^\d{6}$/.test(value.trim())) return 'El código debe tener 6 dígitos.'
      return ''
    case 'recoveryCode':
      if (!value.trim()) return 'El código de recuperación es obligatorio.'
      return ''
    default:
      return ''
  }
}

function BrandLogo() {
  return (
    <div className="flex items-center gap-[13px]">
      <img src="/brand-logo.svg" alt="" aria-hidden="true" className="w-8 h-8 object-contain" />
      <div className="text-left">
        <div className="font-display font-semibold text-[18px] uppercase leading-none text-ink" style={{ letterSpacing: '0.2em' }}>
          {BRAND_NAME}
        </div>
        <div
          className="font-mono uppercase mt-1.5"
          style={{ fontSize: '8.5px', letterSpacing: '0.24em', color: 'rgba(248,249,250,.34)' }}
        >
          {BRAND_SUBTITLE}
        </div>
      </div>
    </div>
  )
}

function Kicker({ n, children }) {
  return (
    <div
      className="flex items-center gap-[9px] font-mono uppercase mb-[18px]"
      style={{ fontSize: '11px', letterSpacing: '0.22em', color: 'rgba(248,249,250,.45)' }}
    >
      <span style={{ color: '#FF1744' }}>{n}</span>
      <span style={{ color: 'rgba(248,249,250,.2)' }}>//</span>
      <span>{children}</span>
    </div>
  )
}

function Toast({ message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-center gap-3 p-4 border"
      style={{ background: 'rgba(255,23,68,.10)', borderColor: 'rgba(255,23,68,.28)', color: '#FF5C7A' }}
    >
      <XCircle size={20} className="flex-shrink-0" />
      <p className="text-sm flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-lg leading-none transition-colors hover:text-ink"
        style={{ color: 'rgba(248,249,250,.45)' }}
        aria-label="Cerrar aviso"
      >
        &times;
      </button>
    </motion.div>
  )
}

function Spinner() {
  return <Loader2 size={20} className="animate-spin" />
}

export default function LoginPage() {
  const { login, verify2FA, isAuthenticated, loading: authLoading } = useAuth()
  const [, setLocation] = useLocation()

  const [step, setStep] = useState('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loginLoading, setLoginLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const [tempToken, setTempToken] = useState(null)
  const [twoFAMethod, setTwoFAMethod] = useState('totp')
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', ''])
  const [useRecovery, setUseRecovery] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [twoFAError, setTwoFAError] = useState(null)
  const [twoFATouched, setTwoFATouched] = useState(false)

  const digitRefs = useRef([])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation('/portal/dashboard')
    }
  }, [authLoading, isAuthenticated, setLocation])

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const value = field === 'email' ? email : password
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
  }

  const handleEmailChange = (val) => {
    setEmail(val)
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateField('email', val) }))
    }
  }

  const handlePasswordChange = (val) => {
    setPassword(val)
    if (touched.password) {
      setErrors((prev) => ({ ...prev, password: validateField('password', val) }))
    }
  }

  const validateLogin = () => {
    const newErrors = {
      email: validateField('email', email),
      password: validateField('password', password),
    }
    setErrors(newErrors)
    setTouched({ email: true, password: true })
    return !newErrors.email && !newErrors.password
  }

  const handleLogin = useCallback(async (e) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!validateLogin()) return

    setLoginLoading(true)
    try {
      const result = await login(email, password)

      if (result?.requires2FA) {
        setTempToken(result.tempToken)
        setTwoFAMethod(result.method || 'totp')
        setStep('2fa')
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Credenciales incorrectas. Inténtalo de nuevo.'
      setErrorMessage(msg)
    } finally {
      setLoginLoading(false)
    }
  }, [email, password, login])

  const handleDigitChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return

    const newDigits = [...codeDigits]
    newDigits[index] = value
    setCodeDigits(newDigits)

    if (value && index < 5) {
      digitRefs.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
  }

  const handleDigitPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      const newDigits = [...codeDigits]
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || ''
      }
      setCodeDigits(newDigits)
      const focusIndex = Math.min(pasted.length, 5)
      digitRefs.current[focusIndex]?.focus()
    }
  }

  const getCodeValue = () => codeDigits.join('')

  const handleVerify = useCallback(async (e) => {
    e.preventDefault()
    setTwoFAError(null)
    setTwoFATouched(true)

    if (useRecovery) {
      if (!recoveryCode.trim()) {
        setTwoFAError('Introduce un código de recuperación.')
        return
      }
    } else {
      const code = getCodeValue()
      const error = validateField('code', code)
      if (error) {
        setTwoFAError(error)
        return
      }
    }

    setVerifyLoading(true)
    try {
      const code = useRecovery ? recoveryCode.trim() : getCodeValue()
      const method = useRecovery ? 'recovery' : twoFAMethod
      await verify2FA(tempToken, code, method)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Código incorrecto. Inténtalo de nuevo.'
      setTwoFAError(msg)
    } finally {
      setVerifyLoading(false)
    }
  }, [useRecovery, recoveryCode, codeDigits, twoFAMethod, tempToken, verify2FA])

  const handleBackToLogin = () => {
    setStep('login')
    setTempToken(null)
    setCodeDigits(['', '', '', '', '', ''])
    setRecoveryCode('')
    setUseRecovery(false)
    setTwoFAError(null)
    setTwoFATouched(false)
  }

  const toggleMethod = () => {
    setTwoFAMethod((prev) => (prev === 'totp' ? 'email' : 'totp'))
    setCodeDigits(['', '', '', '', '', ''])
    setTwoFAError(null)
    setUseRecovery(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="w-10 h-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  const inputBaseClass = (field) =>
    `w-full py-3 bg-bg-1 border outline-none text-ink transition-colors ${
      errors[field] && touched[field]
        ? 'border-danger focus:border-danger'
        : 'border-white/10 focus:border-primary'
    }`

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark relative overflow-hidden px-4 py-8">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,229,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,.05) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 45%, #000 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 45%, #000 0%, transparent 100%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-surface-dark border p-8 lg:p-10 relative z-10"
        style={{ borderColor: 'rgba(248,249,250,.09)' }}
      >
        <AnimatePresence mode="wait">
          {step === 'login' ? (
            <motion.div
              key="login-step"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-9">
                <BrandLogo />
              </div>

              <div className="mb-8">
                <Kicker n="01">Acceso</Kicker>
                <h1 className="font-display font-semibold text-ink text-[30px] leading-none" style={{ letterSpacing: '-0.035em' }}>
                  Acceso clientes
                </h1>
                <p className="mt-3 text-[15px] font-light" style={{ color: 'rgba(248,249,250,.6)' }}>
                  Entra con las credenciales de tu cuenta.
                </p>
              </div>

              <AnimatePresence>
                {errorMessage && (
                  <div className="mb-6">
                    <Toast message={errorMessage} onClose={() => setErrorMessage(null)} />
                  </div>
                )}
              </AnimatePresence>

              <form onSubmit={handleLogin} noValidate className="space-y-5">
                <div>
                  <label className="block font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(248,249,250,.45)' }}>Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-3">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="nombre@empresa.com"
                      autoComplete="email"
                      className={`${inputBaseClass('email')} pl-11 pr-4`}
                    />
                  </div>
                  {errors.email && touched.email && (
                    <p className="mt-1 text-xs text-danger">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(248,249,250,.45)' }}>Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-3">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="Tu contraseña"
                      autoComplete="current-password"
                      className={`${inputBaseClass('password')} pl-11 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-3 hover:text-primary transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && touched.password && (
                    <p className="mt-1 text-xs text-danger">{errors.password}</p>
                  )}
                </div>

                <div className="text-right">
                  <Link
                    href="/reset-password"
                    className="text-sm text-primary hover:text-secondary transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className={KROM_CTA}
                >
                  {loginLoading ? (
                    <>
                      <Spinner />
                      <span>Iniciando sesión</span>
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="2fa-step"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-7">
                <div className="w-12 h-12 border flex items-center justify-center" style={{ background: 'rgba(0,229,255,.10)', borderColor: 'rgba(0,229,255,.28)' }}>
                  <ShieldCheck size={24} className="text-primary" />
                </div>
              </div>

              <div className="mb-8">
                <Kicker n="02">Verificación</Kicker>
                <h2 className="font-display font-semibold text-ink text-[28px] leading-none" style={{ letterSpacing: '-0.035em' }}>
                  Verificación en dos pasos
                </h2>
                <p className="mt-3 text-[15px] font-light" style={{ color: 'rgba(248,249,250,.6)' }}>
                  {useRecovery
                    ? 'Introduce uno de tus códigos de recuperación.'
                    : twoFAMethod === 'totp'
                      ? 'Introduce el código de tu app autenticadora.'
                      : 'Hemos enviado un código a tu email.'
                  }
                </p>
              </div>

              <AnimatePresence>
                {twoFAError && (
                  <div className="mb-6">
                    <Toast message={twoFAError} onClose={() => setTwoFAError(null)} />
                  </div>
                )}
              </AnimatePresence>

              <form onSubmit={handleVerify} noValidate className="space-y-6">
                {useRecovery ? (
                  <div>
                    <label className="block font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(248,249,250,.45)' }}>Código de recuperación</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-3">
                        <KeyRound size={18} />
                      </div>
                      <input
                        type="text"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        placeholder="XXXX-XXXX-XXXX"
                        autoFocus
                        className="w-full py-3 pl-11 pr-4 bg-bg-1 border border-white/10 focus:border-primary outline-none text-ink transition-colors font-mono tracking-wider"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-mono uppercase mb-3" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(248,249,250,.45)' }}>Código de verificación</label>
                    <div className="flex gap-2.5" onPaste={handleDigitPaste}>
                      {codeDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { digitRefs.current[i] = el }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(i, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(i, e)}
                          autoFocus={i === 0}
                          className={`w-full h-14 text-center text-xl font-mono font-medium bg-bg-1 border ${
                            twoFAError && twoFATouched
                              ? 'border-danger focus:border-danger'
                              : 'border-white/10 focus:border-primary'
                          } outline-none text-ink transition-colors`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <button type="submit" disabled={verifyLoading} className={KROM_CTA}>
                  {verifyLoading ? (
                    <>
                      <Spinner />
                      <span>Verificando</span>
                    </>
                  ) : (
                    'Verificar'
                  )}
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {!useRecovery && (
                  <button
                    type="button"
                    onClick={toggleMethod}
                    className="w-full text-sm text-ink-2 hover:text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    {twoFAMethod === 'totp' ? (
                      <>
                        <Mail size={14} />
                        <span>Usar código por email</span>
                      </>
                    ) : (
                      <>
                        <Smartphone size={14} />
                        <span>Usar app autenticadora</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setUseRecovery(!useRecovery)
                    setTwoFAError(null)
                    setCodeDigits(['', '', '', '', '', ''])
                    setRecoveryCode('')
                  }}
                  className="w-full text-sm text-ink-3 hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <KeyRound size={14} />
                  <span>{useRecovery ? 'Usar código de verificación' : 'Usar código de recuperación'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full text-sm text-ink-3 hover:text-ink transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <ArrowLeft size={14} />
                  <span>Volver</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
