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

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Joan Dev & Tech'
const BRAND_INITIALS = import.meta.env.VITE_BRAND_INITIALS || 'JD'

const criteria = [
  { key: 'length', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { key: 'uppercase', label: 'Al menos 1 mayúscula', test: (p) => /[A-Z]/.test(p) },
  { key: 'number', label: 'Al menos 1 número', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'Al menos 1 carácter especial', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

const strengthColors = [
  'bg-red-500',
  'bg-amber-500',
  'bg-yellow-400',
  'bg-emerald-500',
]

const strengthLabels = ['Débil', 'Regular', 'Buena', 'Fuerte']

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

export default function SetPasswordPage() {
  const [, params] = useRoute('/set-password/:token')
  const [, setLocation] = useLocation()
  const token = params?.token || ''

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
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(124, 58, 237, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <div className="bg-surface-dark rounded-2xl border border-white/5 p-8 shadow-2xl">
          <div className="flex justify-center mb-8">
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
                <h1 className="text-2xl font-display font-bold text-white text-center mb-8">
                  Establecer Contraseña
                </h1>

                <AnimatePresence>
                  {networkError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-300">{networkError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-5">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-slate-500" />
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
                        className={`w-full pl-12 pr-12 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/40 ${
                          passwordError && passwordTouched
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-white/10 focus:border-primary/50'
                        }`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-300 transition-colors"
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
                          className="text-red-400 text-xs mt-2"
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
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i < strength ? strengthColors[strength - 1] : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-xs font-medium transition-colors duration-300 ${
                            strength === 0
                              ? 'text-slate-500'
                              : strength === 1
                              ? 'text-red-400'
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
                              <XCircle className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span className={c.passed ? 'text-emerald-400' : 'text-slate-500'}>
                              {c.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  <div className="mb-6">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-slate-500" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                        }}
                        onBlur={() => setConfirmTouched(true)}
                        placeholder="••••••••"
                        className={`w-full pl-12 pr-12 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/40 ${
                          confirmError && confirmTouched
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-white/10 focus:border-primary/50'
                        }`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-300 transition-colors"
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
                          className="text-red-400 text-xs mt-2"
                        >
                          {confirmError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-xl font-display font-semibold text-white bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Estableciendo...
                      </>
                    ) : (
                      'Establecer Contraseña'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
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
                className="text-center py-4"
              >
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <h2 className="text-xl font-display font-bold text-white mb-3">
                  ¡Contraseña establecida!
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-2">
                  Tu contraseña se ha actualizado correctamente.
                </p>
                <p className="text-slate-500 text-xs mb-6">
                  Serás redirigido a iniciar sesión en unos segundos...
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
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
