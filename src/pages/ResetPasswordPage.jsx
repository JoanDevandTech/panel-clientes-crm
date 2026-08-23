import { useState } from 'react'
import { Link } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../services/api'

const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Krom'
const BRAND_SUBTITLE = import.meta.env.VITE_BRAND_SUBTITLE || 'Portal cliente'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Botón primario Krom: cian plano, texto sobre el ground, mono en versales.
const KROM_CTA =
  'w-full py-4 px-6 bg-primary text-background-dark font-mono font-semibold text-xs uppercase tracking-[0.16em] ' +
  'hover:bg-secondary hover:shadow-[0_0_40px_rgba(0,229,255,.28)] transition-all ' +
  'disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

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
                <Kicker n="01">Recuperación</Kicker>
                <h1 className="font-display font-semibold text-ink text-[30px] leading-none" style={{ letterSpacing: '-0.035em' }}>
                  Recuperar contraseña
                </h1>
                <p className="mt-3 mb-8 text-[15px] font-light" style={{ color: 'rgba(248,249,250,.6)' }}>
                  Introduce tu email y te enviaremos un enlace para restablecerla.
                </p>

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
                  <div className="mb-6">
                    <label htmlFor="email" className="block font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(248,249,250,.45)' }}>
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-ink-3" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        placeholder="tu@email.com"
                        className={`w-full pl-12 pr-4 py-3 bg-bg-1 border text-ink outline-none transition-colors duration-200 ${
                          emailError && emailTouched
                            ? 'border-danger focus:border-danger'
                            : 'border-white/10 focus:border-primary'
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
                          className="text-danger text-xs mt-2"
                        >
                          {emailError}
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
                        Enviando
                      </>
                    ) : (
                      'Enviar enlace de recuperación'
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
                  ¡Enlace enviado!
                </h2>
                <p className="text-[15px] font-light leading-relaxed mb-6" style={{ color: 'rgba(248,249,250,.6)' }}>
                  Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-secondary transition-colors"
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
