import { useState } from 'react'
import { Link } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../services/api'

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Joan Dev & Tech'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function BrandLogo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src="/brand-logo.jpg"
        alt={BRAND_NAME}
        className="w-16 h-16 rounded-2xl object-cover"
        style={{ boxShadow: '0 8px 28px -8px rgba(99, 102, 241, 0.55)' }}
      />
      <p className="text-sm font-semibold text-white">{BRAND_NAME}</p>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [networkError, setNetworkError] = useState('')

  const validateEmail = (value) => {
    if (!value.trim()) return 'El email es obligatorio'
    if (!emailRegex.test(value)) return 'Introduce un email válido'
    return ''
  }

  const handleEmailBlur = () => {
    setEmailTouched(true)
    setEmailError(validateEmail(email))
  }

  const handleEmailChange = (e) => {
    const value = e.target.value
    setEmail(value)
    if (emailTouched) {
      setEmailError(validateEmail(value))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setNetworkError('')

    const error = validateEmail(email)
    setEmailError(error)
    setEmailTouched(true)

    if (error) return

    setLoading(true)

    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess(true)
    } catch (err) {
      if (!err.status) {
        setNetworkError('Error de conexión. Comprueba tu conexión a internet e inténtalo de nuevo.')
      } else {
        setSuccess(true)
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
                <h1 className="text-2xl font-display font-bold text-white text-center mb-2">
                  Recuperar Contraseña
                </h1>
                <p className="text-slate-400 text-sm text-center mb-8">
                  Introduce tu email y te enviaremos un enlace para restablecer tu contraseña
                </p>

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
                  <div className="mb-6">
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-slate-500" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        placeholder="tu@email.com"
                        className={`w-full pl-12 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/40 ${
                          emailError && emailTouched
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-white/10 focus:border-primary/50'
                        }`}
                        autoComplete="email"
                      />
                    </div>
                    <AnimatePresence>
                      {emailError && emailTouched && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-red-400 text-xs mt-2"
                        >
                          {emailError}
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
                        Enviando...
                      </>
                    ) : (
                      'Enviar enlace de recuperación'
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
                  ¡Enlace enviado!
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a iniciar sesión
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
