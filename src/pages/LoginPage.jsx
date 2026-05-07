import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, XCircle, ArrowLeft, ShieldCheck, Smartphone, KeyRound, Loader2 } from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '../hooks/useAuth'

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Joan Dev & Tech'
const BRAND_INITIALS = import.meta.env.VITE_BRAND_INITIALS || 'JD'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

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
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white text-2xl"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #22d3ee 100%)',
          boxShadow: '0 8px 28px -8px rgba(99, 102, 241, 0.55)',
        }}
      >
        {BRAND_INITIALS}
      </div>
      <p className="text-sm font-semibold text-white">{BRAND_NAME}</p>
    </div>
  )
}

function Toast({ message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-center gap-3 p-4 rounded-xl border shadow-lg bg-red-500/10 border-red-500/30 text-red-400"
    >
      <XCircle size={20} className="flex-shrink-0" />
      <p className="text-sm flex-1">{message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg leading-none">&times;</button>
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
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  const inputBaseClass = (field) =>
    `w-full py-3 rounded-lg bg-background-dark border ${
      errors[field] && touched[field]
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-white/10 focus:border-primary focus:ring-primary'
    } focus:ring-1 outline-none text-white transition-colors`

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark relative overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-surface-dark rounded-2xl border border-white/5 p-8 lg:p-10 shadow-2xl relative z-10"
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
              <div className="flex justify-center mb-8">
                <BrandLogo />
              </div>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold text-white">Acceso Clientes</h1>
                <p className="text-slate-400 mt-2">Accede a tu portal de cliente</p>
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                    <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && touched.password && (
                    <p className="mt-1 text-xs text-red-400">{errors.password}</p>
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

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold text-base hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <>
                      <Spinner />
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </motion.button>
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
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-center">
                  <ShieldCheck size={32} className="text-primary" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold text-white">Verificación en dos pasos</h2>
                <p className="text-slate-400 mt-2 text-sm">
                  {useRecovery
                    ? 'Introduce uno de tus códigos de recuperación'
                    : twoFAMethod === 'totp'
                      ? 'Introduce el código de tu app autenticadora'
                      : 'Hemos enviado un código a tu email'
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
                    <label className="block text-sm font-medium text-slate-300 mb-2">Código de recuperación</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <KeyRound size={18} />
                      </div>
                      <input
                        type="text"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        placeholder="XXXX-XXXX-XXXX"
                        autoFocus
                        className="w-full py-3 pl-11 pr-4 rounded-lg bg-background-dark border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-colors font-mono tracking-wider"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3 text-center">Código de verificación</label>
                    <div className="flex justify-center gap-2.5" onPaste={handleDigitPaste}>
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
                          className={`w-12 h-14 text-center text-xl font-bold rounded-lg bg-background-dark border ${
                            twoFAError && twoFATouched
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-white/10 focus:border-primary focus:ring-primary'
                          } focus:ring-1 outline-none text-white transition-colors`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={verifyLoading}
                  className="w-full py-3.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold text-base hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifyLoading ? (
                    <>
                      <Spinner />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    'Verificar'
                  )}
                </motion.button>
              </form>

              <div className="mt-6 space-y-3">
                {!useRecovery && (
                  <button
                    type="button"
                    onClick={toggleMethod}
                    className="w-full text-sm text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-2"
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
                  className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2"
                >
                  <KeyRound size={14} />
                  <span>{useRecovery ? 'Usar código de verificación' : 'Usar código de recuperación'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full text-sm text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-2 mt-2"
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
