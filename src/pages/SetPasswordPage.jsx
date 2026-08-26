import { useState, useEffect, useMemo } from 'react'
import { Link, useRoute, useLocation } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { api } from '../services/api'

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Krom'
const BRAND_SUBTITLE = import.meta.env.VITE_BRAND_SUBTITLE || 'Portal cliente'

// Botón primario Krom: cian plano, texto sobre el ground, mono en versales.
const KROM_CTA =
  'w-full py-4 px-6 bg-primary text-background-dark font-mono font-semibold text-xs uppercase tracking-[0.16em] ' +
  'hover:bg-secondary hover:shadow-[0_0_40px_rgba(0,229,255,.28)] transition-all ' +
  'disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

const criteria = [
  { key: 'length', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { key: 'uppercase', label: 'Al menos 1 mayúscula', test: (p) => /[A-Z]/.test(p) },
  { key: 'number', label: 'Al menos 1 número', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'Al menos 1 carácter especial', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

const strengthColors = [
  'bg-danger',
  'bg-amber-500',
  'bg-yellow-400',
  'bg-emerald-500',
]

const strengthLabels = ['Débil', 'Regular', 'Buena', 'Fuerte']

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

export default function SetPasswordPage() {
  const [, params] = useRoute('/set-password/:token')
  const [, setLocation] = useLocation()
  const token = params?.token || ''
  const [email] = useState(() => new URLSearchParams(window.location.search).get('email') || '')

  // El email solo hace falta para el POST (React ya lo guardó en el state de arriba);
  // lo quitamos de la URL para que no quede en el historial del navegador.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [networkError, setNetworkError] = useState('')

  const strength = useMemo(() => {
    return criteria.filter((c) => c.test(password)).length
  }, [password])

  const criteriaResults = useMemo(() => {
    return criteria.map((c) => ({ ...c, passed: c.test(password) }))
  }, [password])

  const passwordError = useMemo(() => {
    if (!password && passwordTouched) return 'La contraseña es obligatoria'
    if (password && password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if (password && !/[A-Z]/.test(password)) return 'Debe contener al menos 1 mayúscula'
    if (password && !/\d/.test(password)) return 'Debe contener al menos 1 número'
    return ''
  }, [password, passwordTouched])

  const confirmError = useMemo(() => {
    if (!confirmPassword && confirmTouched) return 'Confirma tu contraseña'
    if (confirmPassword && confirmPassword !== password) return 'Las contraseñas no coinciden'
    return ''
  }, [password, confirmPassword, confirmTouched])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => {
      setLocation('/login')
    }, 3000)
    return () => clearTimeout(timer)
  }, [success, setLocation])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setNetworkError('')
    setPasswordTouched(true)
    setConfirmTouched(true)

    if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) return
    if (!confirmPassword || confirmPassword !== password) return

    setLoading(true)

    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      })
      setSuccess(true)
    } catch (err) {
      if (!err.status) {
        setNetworkError('Error de conexión. Comprueba tu conexión a internet e inténtalo de nuevo.')
      } else {
        setNetworkError(err.message || 'Ha ocurrido un error. El enlace puede haber expirado o no ser válido.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center px-4 py-12 relative overflow-hidden">
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
        className="relative w-full max-w-md"
      >
        <div className="bg-surface-dark border p-8 lg:p-10" style={{ borderColor: 'rgba(248,249,250,.09)' }}>
          <div className="mb-9">
            <BrandLogo />
          </div>

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Kicker n="01">Cuenta</Kicker>
                <h1 className="font-display font-semibold text-ink text-[30px] leading-none mb-8" style={{ letterSpacing: '-0.035em' }}>
                  Establecer contraseña
                </h1>

                <AnimatePresence>
                  {networkError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 flex items-start gap-3 border p-4"
                      style={{ background: 'rgba(255,23,68,.10)', borderColor: 'rgba(255,23,68,.28)' }}
                    >
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#FF5C7A' }} />
                      <p className="text-sm" style={{ color: '#FF5C7A' }}>{networkError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-5">
                    <label htmlFor="password" className="block font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(248,249,250,.45)' }}>
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-ink-3" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (passwordTouched) setPasswordTouched(true)
                        }}
                        onBlur={() => setPasswordTouched(true)}
                        placeholder="••••••••"
                        className={`w-full pl-12 pr-12 py-3 bg-bg-1 border text-ink outline-none transition-colors duration-200 ${
                          passwordError && passwordTouched
                            ? 'border-danger focus:border-danger'
                            : 'border-white/10 focus:border-primary'
                        }`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-ink-3 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <AnimatePresence>
                      {passwordError && passwordTouched && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-danger text-xs mt-2"
                        >
                          {passwordError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-1.5 flex-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 transition-all duration-300 ${
                                i < strength ? strengthColors[strength - 1] : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-[0.18em] transition-colors duration-300 ${
                            strength === 0
                              ? 'text-ink-3'
                              : strength === 1
                              ? 'text-danger'
                              : strength === 2
                              ? 'text-amber-400'
                              : strength === 3
                              ? 'text-yellow-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {strength > 0 ? strengthLabels[strength - 1] : ''}
                        </span>
                      </div>

                      <ul className="space-y-1.5">
                        {criteriaResults.map((c) => (
                          <li key={c.key} className="flex items-center gap-2 text-xs">
                            {c.passed ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-ink-3" />
                            )}
                            <span className={c.passed ? 'text-emerald-400' : 'text-ink-3'}>
                              {c.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  <div className="mb-6">
                    <label htmlFor="confirmPassword" className="block font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(248,249,250,.45)' }}>
                      Confirmar contraseña
                    </label>
                    <p className="text-xs mb-2" style={{ color: 'rgba(248,249,250,.34)' }}>
                      Escríbela de nuevo — no se puede pegar aquí.
                    </p>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-ink-3" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                        }}
                        onBlur={() => setConfirmTouched(true)}
                        onPaste={(e) => e.preventDefault()}
                        onCopy={(e) => e.preventDefault()}
                        onDrop={(e) => e.preventDefault()}
                        placeholder="••••••••"
                        className={`w-full pl-12 pr-12 py-3 bg-bg-1 border text-ink outline-none transition-colors duration-200 ${
                          confirmError && confirmTouched
                            ? 'border-danger focus:border-danger'
                            : 'border-white/10 focus:border-primary'
                        }`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-ink-3 hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <AnimatePresence>
                      {confirmError && confirmTouched && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-danger text-xs mt-2"
                        >
                          {confirmError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={KROM_CTA}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Estableciendo
                      </>
                    ) : (
                      'Establecer contraseña'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-secondary transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver a iniciar sesión
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="py-2"
              >
                <div className="mb-6">
                  <div className="w-12 h-12 flex items-center justify-center border" style={{ background: 'rgba(16,185,129,.10)', borderColor: 'rgba(16,185,129,.28)' }}>
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <h2 className="font-display font-semibold text-ink text-[24px] leading-none mb-3" style={{ letterSpacing: '-0.035em' }}>
                  ¡Contraseña establecida!
                </h2>
                <p className="text-[15px] font-light leading-relaxed mb-2" style={{ color: 'rgba(248,249,250,.6)' }}>
                  Tu contraseña se ha actualizado correctamente.
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] mb-6" style={{ color: 'rgba(248,249,250,.34)' }}>
                  Serás redirigido a iniciar sesión en unos segundos...
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-secondary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Ir a iniciar sesión
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
