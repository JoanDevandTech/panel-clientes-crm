import { useState, useCallback, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'wouter'
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, Paperclip, X as XIcon } from 'lucide-react'
import { GoogleReCaptchaContext } from 'react-google-recaptcha-v3'
import api from '../../services/api'

function useSafeGoogleReCaptcha() {
  const context = useContext(GoogleReCaptchaContext)
  const executeRecaptcha = context?.executeRecaptcha
  const safeExecute = executeRecaptcha
    ? async (action) => {
        try {
          return await executeRecaptcha(action)
        } catch {
          return null
        }
      }
    : null
  return { executeRecaptcha: safeExecute }
}

const priorityOptions = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

const priorityBadgeConfig = {
  low: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  medium: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  high: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  urgent: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

function Toast({ type, message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg ${
        type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}
    >
      {type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
      <p className="text-sm flex-1">{message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg leading-none">&times;</button>
    </motion.div>
  )
}

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            currentStep >= 1
              ? 'bg-primary text-white'
              : 'bg-white/10 text-slate-500'
          }`}
        >
          1
        </div>
        <span className={`mt-2 text-xs font-medium ${currentStep >= 1 ? 'text-primary' : 'text-slate-500'}`}>
          Datos del Ticket
        </span>
      </div>

      <div className="w-24 sm:w-32 h-0.5 mx-4 mt-[-1rem]">
        <div
          className={`h-full rounded-full transition-colors ${
            currentStep >= 2
              ? 'bg-gradient-to-r from-primary to-secondary'
              : 'bg-white/10'
          }`}
        />
      </div>

      <div className="flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            currentStep >= 2
              ? 'bg-primary text-white'
              : 'bg-white/10 text-slate-500'
          }`}
        >
          2
        </div>
        <span className={`mt-2 text-xs font-medium ${currentStep >= 2 ? 'text-primary' : 'text-slate-500'}`}>
          Descripción
        </span>
      </div>
    </div>
  )
}

export default function NewTicketPage() {
  const { executeRecaptcha } = useSafeGoogleReCaptcha()

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState('medium')
  const [description, setDescription] = useState('')

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null)
  const [successData, setSuccessData] = useState(null)
  const [files, setFiles] = useState([])

  const handleFilesChange = (e) => {
    const selected = Array.from(e.target.files || [])
    const total = files.length + selected.length
    if (total > 5) {
      showToast('error', 'Máximo 5 archivos por ticket.')
      return
    }
    const oversized = selected.find((f) => f.size > 10 * 1024 * 1024)
    if (oversized) {
      showToast('error', `"${oversized.name}" supera los 10 MB.`)
      return
    }
    setFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const validateSubject = (value) => {
    if (!value.trim()) return 'El asunto es obligatorio.'
    if (value.trim().length < 5) return 'El asunto debe tener al menos 5 caracteres.'
    return ''
  }

  const validateDescription = (value) => {
    if (!value.trim()) return 'La descripción es obligatoria.'
    if (value.trim().length < 20) return 'La descripción debe tener al menos 20 caracteres.'
    return ''
  }

  const handleSubjectChange = (e) => {
    const val = e.target.value.slice(0, 255)
    setSubject(val)
    if (touched.subject) {
      setErrors((prev) => ({ ...prev, subject: validateSubject(val) }))
    }
  }

  const handleSubjectBlur = () => {
    setTouched((prev) => ({ ...prev, subject: true }))
    setErrors((prev) => ({ ...prev, subject: validateSubject(subject) }))
  }

  const handleDescriptionChange = (e) => {
    const val = e.target.value.slice(0, 10000)
    setDescription(val)
    if (touched.description) {
      setErrors((prev) => ({ ...prev, description: validateDescription(val) }))
    }
  }

  const handleDescriptionBlur = () => {
    setTouched((prev) => ({ ...prev, description: true }))
    setErrors((prev) => ({ ...prev, description: validateDescription(description) }))
  }

  const isStep1Valid = subject.trim().length >= 5
  const isStep2Valid = description.trim().length >= 20

  const goToStep2 = () => {
    setTouched((prev) => ({ ...prev, subject: true }))
    const subjectError = validateSubject(subject)
    setErrors((prev) => ({ ...prev, subject: subjectError }))
    if (subjectError) return

    setDirection(1)
    setStep(2)
  }

  const goToStep1 = () => {
    setDirection(-1)
    setStep(1)
  }

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 6000)
  }

  const handleSubmit = useCallback(async () => {
    setTouched((prev) => ({ ...prev, description: true }))
    const descError = validateDescription(description)
    setErrors((prev) => ({ ...prev, description: descError }))
    if (descError) return

    setSending(true)
    try {
      if (executeRecaptcha) {
        await executeRecaptcha('new_ticket')
      }

      const formData = new FormData()
      formData.append('subject', subject.trim())
      formData.append('description', description.trim())
      formData.append('priority', priority)
      formData.append('source', 'web')
      files.forEach((f) => formData.append('attachments[]', f))

      const response = await api.post('/client/tickets', formData)

      setSuccessData({ id: response?.data?.id || response?.id || '??' })
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'Hubo un error al crear el ticket. Inténtalo de nuevo.'
      showToast('error', msg)
    } finally {
      setSending(false)
    }
  }, [subject, description, priority, files, executeRecaptcha])

  const resetForm = () => {
    setStep(1)
    setDirection(1)
    setSubject('')
    setPriority('medium')
    setDescription('')
    setFiles([])
    setErrors({})
    setTouched({})
    setSuccessData(null)
    setToast(null)
  }

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-lg bg-background-dark border ${
      errors[field] && touched[field]
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-white/10 focus:border-primary focus:ring-primary'
    } focus:ring-1 outline-none text-white transition-colors`

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  }

  if (successData) {
    return (
      <div>
        <Link
          href="/portal/tickets"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} />
          Volver a tickets
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-surface-dark rounded-2xl p-8 border border-white/5 text-center max-w-lg mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6"
          >
            <CheckCircle size={40} className="text-emerald-400" />
          </motion.div>

          <h2 className="text-2xl font-display font-bold text-white mb-3">
            ¡Ticket enviado correctamente!
          </h2>
          <p className="text-slate-400 mb-8">
            Tu ticket #{successData.id} ha sido creado. Te notificaremos cuando tengamos una respuesta.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/portal/tickets"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-primary/30 text-sm"
            >
              Ver mis tickets
            </Link>
            <button
              onClick={resetForm}
              className="inline-flex items-center justify-center px-6 py-3 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 font-medium rounded-xl transition-all text-sm"
            >
              Crear otro ticket
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  const currentPriorityLabel = priorityOptions.find((p) => p.value === priority)?.label || 'Media'
  const currentPriorityBadge = priorityBadgeConfig[priority]

  return (
    <div>
      <Link
        href="/portal/tickets"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
      >
        <ArrowLeft size={16} />
        Volver a tickets
      </Link>

      <h1 className="text-2xl font-display font-bold text-white mb-6">Nuevo Ticket</h1>

      <StepIndicator currentStep={step} />

      <AnimatePresence>
        {toast && (
          <div className="mb-6 max-w-2xl mx-auto">
            <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="bg-surface-dark rounded-2xl p-8 border border-white/5">
                <h2 className="text-lg font-display font-bold text-white mb-6">Datos del Ticket</h2>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Asunto *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={handleSubjectChange}
                    onBlur={handleSubjectBlur}
                    placeholder="Describe brevemente tu problema"
                    maxLength={255}
                    className={inputClass('subject')}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      {errors.subject && touched.subject && (
                        <p className="text-xs text-red-400">{errors.subject}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{subject.length}/255</p>
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-background-dark border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-colors"
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={goToStep2}
                  disabled={!isStep1Valid}
                  className="w-full py-3.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold text-base hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Siguiente
                  <ArrowRight size={18} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="bg-surface-dark rounded-2xl p-8 border border-white/5">
                <h2 className="text-lg font-display font-bold text-white mb-6">Descripción</h2>

                <div className="bg-white/5 rounded-lg p-4 mb-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-400 mb-1">
                        <span className="text-slate-500">Asunto:</span>{' '}
                        <span className="text-white">{subject}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Prioridad:</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${currentPriorityBadge.bg} ${currentPriorityBadge.text}`}>
                          {currentPriorityLabel}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={goToStep1}
                      className="text-xs text-primary hover:text-secondary transition-colors font-medium flex-shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Descripción del problema *</label>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={handleDescriptionChange}
                    onBlur={handleDescriptionBlur}
                    placeholder="Describe tu problema con el mayor detalle posible..."
                    maxLength={10000}
                    className={inputClass('description')}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      {errors.description && touched.description && (
                        <p className="text-xs text-red-400">{errors.description}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{description.length}/10000</p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Archivos adjuntos (opcional)</label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-background-dark border border-white/10 border-dashed text-slate-400 hover:border-primary hover:text-white transition-colors cursor-pointer">
                    <Paperclip size={18} />
                    <span className="text-sm">Añadir archivos (máx. 5 · 10 MB c/u)</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFilesChange}
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    />
                  </label>
                  {files.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {files.map((file, idx) => (
                        <li key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
                          <Paperclip size={14} className="text-slate-500 shrink-0" />
                          <span className="text-sm text-slate-300 truncate flex-1">{file.name}</span>
                          <span className="text-xs text-slate-500 shrink-0">{formatSize(file.size)}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="text-slate-400 hover:text-red-400 transition-colors shrink-0"
                            aria-label={`Quitar ${file.name}`}
                          >
                            <XIcon size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={goToStep1}
                    className="flex-1 py-3.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 font-medium text-base transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={18} />
                    Atrás
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={sending || !isStep2Valid}
                    className="flex-1 py-3.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold text-base hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Ticket'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
