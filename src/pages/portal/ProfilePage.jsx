import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  CheckCircle,
  XCircle,
  Shield,
  Smartphone,
  Mail,
  Copy,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import api, { apiRequest } from '../../services/api'

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
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white transition-colors text-lg leading-none"
      >
        &times;
      </button>
    </motion.div>
  )
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getPasswordCriteria(password) {
  return [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Al menos una mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Al menos un número', met: /\d/.test(password) },
    { label: 'Al menos un carácter especial', met: /[^A-Za-z0-9]/.test(password) },
  ]
}

function getStrengthLevel(criteria) {
  return criteria.filter((c) => c.met).length
}

function getStrengthColor(level) {
  if (level <= 1) return 'bg-red-500'
  if (level === 2) return 'bg-amber-500'
  if (level === 3) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

export default function ProfilePage() {
  const { client, updateClient } = useAuth()
  const [activeTab, setActiveTab] = useState('perfil')

  const [profileForm, setProfileForm] = useState({
    name: client?.name || '',
    phone: client?.phone || '',
    company: client?.company || '',
    email: client?.email || '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileToast, setProfileToast] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({})
  const [passwordToast, setPasswordToast] = useState(null)

  const [twoFAEnabled, setTwoFAEnabled] = useState(client?.two_factor_enabled || false)
  const [twoFAMethod, setTwoFAMethod] = useState(client?.two_factor_method || 'totp')
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState('choose')
  const [setupMethod, setSetupMethod] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [codesConfirmed, setCodesConfirmed] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [twoFAToast, setTwoFAToast] = useState(null)

  const [totpSecret, setTotpSecret] = useState('')
  const [totpQrUrl, setTotpQrUrl] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState([])

  const [showDisableModal, setShowDisableModal] = useState(false)
  const [disableForm, setDisableForm] = useState({ password: '', code: '' })
  const [disableLoading, setDisableLoading] = useState(false)
  const [showDisablePassword, setShowDisablePassword] = useState(false)

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const showProfileToast = (type, message) => {
    setProfileToast({ type, message })
    setTimeout(() => setProfileToast(null), 6000)
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      const response = await api.put('/client/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
        company: profileForm.company,
      })
      const updatedData = response.data || response
      updateClient({
        name: updatedData.name || profileForm.name,
        phone: updatedData.phone || profileForm.phone,
        company: updatedData.company || profileForm.company,
      })
      showProfileToast('success', 'Perfil actualizado correctamente.')
    } catch {
      showProfileToast('error', 'Error al actualizar el perfil. Inténtalo de nuevo.')
    } finally {
      setProfileSaving(false)
    }
  }

  const showPasswordToast = (type, message) => {
    setPasswordToast({ type, message })
    setTimeout(() => setPasswordToast(null), 6000)
  }

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    const errors = {}

    if (!passwordForm.current) errors.current = 'La contraseña actual es obligatoria.'
    if (!passwordForm.new) errors.new = 'La nueva contraseña es obligatoria.'
    if (!passwordForm.confirm) errors.confirm = 'Debes confirmar la nueva contraseña.'

    const criteria = getPasswordCriteria(passwordForm.new)
    const strength = getStrengthLevel(criteria)
    if (passwordForm.new && strength < 4) {
      errors.new = 'La contraseña no cumple todos los requisitos.'
    }

    if (passwordForm.new && passwordForm.confirm && passwordForm.new !== passwordForm.confirm) {
      errors.confirm = 'Las contraseñas no coinciden.'
    }

    setPasswordErrors(errors)
    if (Object.keys(errors).length > 0) return

    setPasswordSaving(true)
    try {
      await api.put('/client/profile/password', {
        current_password: passwordForm.current,
        password: passwordForm.new,
        password_confirmation: passwordForm.confirm,
      })
      showPasswordToast('success', 'Contraseña actualizada correctamente.')
      setPasswordForm({ current: '', new: '', confirm: '' })
      setShowPasswords({ current: false, new: false, confirm: false })
    } catch {
      showPasswordToast('error', 'Error al cambiar la contraseña. Verifica tu contraseña actual.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const showTwoFAToast = (type, message) => {
    setTwoFAToast({ type, message })
    setTimeout(() => setTwoFAToast(null), 6000)
  }

  const startSetup = () => {
    setShowSetup(true)
    setSetupStep('choose')
    setSetupMethod(null)
    setVerificationCode('')
    setCodesConfirmed(false)
    setTotpSecret('')
    setTotpQrUrl('')
    setRecoveryCodes([])
    setTwoFAToast(null)
  }

  const handleMethodSelect = async (method) => {
    setSetupMethod(method)
    setVerificationCode('')
    setSetupLoading(true)
    setTwoFAToast(null)

    try {
      if (method === 'totp') {
        const response = await api.post('/auth/2fa/setup-totp')
        const data = response.data || response
        setTotpSecret(data.secret || '')
        setTotpQrUrl(data.qr_code_url || '')
        setRecoveryCodes(data.recovery_codes || [])
      } else {
        await api.post('/auth/2fa/setup-email')
      }
      setSetupStep('verify')
    } catch {
      showTwoFAToast('error', 'Error al configurar el método de verificación. Inténtalo de nuevo.')
    } finally {
      setSetupLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    if (!verificationCode.trim()) return
    setVerifyLoading(true)
    setTwoFAToast(null)

    try {
      if (setupMethod === 'totp') {
        await api.post('/auth/2fa/confirm-totp', { code: verificationCode })
      } else {
        await api.post('/auth/2fa/confirm-email', { code: verificationCode })
      }

      if (setupMethod === 'totp' && recoveryCodes.length > 0) {
        setSetupStep('recovery')
      } else {
        setTwoFAEnabled(true)
        setTwoFAMethod(setupMethod)
        updateClient({ two_factor_enabled: true, two_factor_method: setupMethod })
        setShowSetup(false)
        setSetupStep('choose')
        setSetupMethod(null)
        setVerificationCode('')
        setCodesConfirmed(false)
        showTwoFAToast('success', 'Autenticación en dos pasos activada correctamente.')
      }
    } catch {
      showTwoFAToast('error', 'Código incorrecto. Inténtalo de nuevo.')
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleConfirmSetup = () => {
    setTwoFAEnabled(true)
    setTwoFAMethod(setupMethod)
    updateClient({ two_factor_enabled: true, two_factor_method: setupMethod })
    setShowSetup(false)
    setSetupStep('choose')
    setSetupMethod(null)
    setVerificationCode('')
    setCodesConfirmed(false)
    showTwoFAToast('success', 'Autenticación en dos pasos activada correctamente.')
  }

  const handleDisable2FA = () => {
    setShowDisableModal(true)
    setDisableForm({ password: '', code: '' })
    setShowDisablePassword(false)
    setTwoFAToast(null)
  }

  const handleConfirmDisable2FA = async () => {
    if (!disableForm.password || !disableForm.code) return
    setDisableLoading(true)
    setTwoFAToast(null)

    try {
      await apiRequest('/auth/2fa/disable', {
        method: 'DELETE',
        body: JSON.stringify({ password: disableForm.password, code: disableForm.code }),
      })
      setTwoFAEnabled(false)
      setTwoFAMethod('totp')
      updateClient({ two_factor_enabled: false, two_factor_method: null })
      setShowDisableModal(false)
      showTwoFAToast('success', 'Autenticación en dos pasos desactivada.')
    } catch {
      showTwoFAToast('error', 'Error al desactivar 2FA. Verifica tu contraseña y código.')
    } finally {
      setDisableLoading(false)
    }
  }

  const handleChangeMethod = () => {
    startSetup()
  }

  const handleCopyAllCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
  }

  const passwordCriteria = getPasswordCriteria(passwordForm.new)
  const strengthLevel = getStrengthLevel(passwordCriteria)
  const strengthColor = getStrengthColor(strengthLevel)

  const tabs = [
    { key: 'perfil', label: 'Perfil' },
    { key: 'seguridad', label: 'Seguridad' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white">Mi Perfil</h1>
        <p className="text-slate-400 mt-1">Gestiona tu información personal y seguridad</p>
      </div>

      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-surface-dark rounded-2xl p-8 border border-white/5">
            <AnimatePresence>
              {profileToast && (
                <div className="mb-6">
                  <Toast
                    type={profileToast.type}
                    message={profileToast.message}
                    onClose={() => setProfileToast(null)}
                  />
                </div>
              )}
            </AnimatePresence>

            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4 overflow-hidden">
                {client?.avatar_url ? (
                  <img src={client.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary text-2xl font-bold">
                    {getInitials(client?.name)}
                  </span>
                )}
              </div>
              <label className={`text-sm text-primary border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer ${avatarUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {avatarUploading ? 'Subiendo...' : 'Cambiar avatar'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024) {
                      setProfileToast({ type: 'error', message: 'La imagen supera 2 MB.' })
                      return
                    }
                    setAvatarUploading(true)
                    try {
                      const formData = new FormData()
                      formData.append('avatar', file)
                      const response = await api.post('/client/profile/avatar', formData)
                      updateClient({ avatar_url: response?.avatar_url })
                      setProfileToast({ type: 'success', message: 'Avatar actualizado.' })
                    } catch (err) {
                      setProfileToast({ type: 'error', message: err?.data?.message || err?.message || 'No se pudo subir el avatar.' })
                    } finally {
                      setAvatarUploading(false)
                    }
                  }}
                />
              </label>
            </div>

            <form onSubmit={handleProfileSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    className="w-full bg-background-dark border border-white/10 focus:border-primary rounded-lg px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="w-full bg-background-dark border border-white/10 focus:border-primary rounded-lg px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={profileForm.company}
                    onChange={(e) => handleProfileChange('company', e.target.value)}
                    className="w-full bg-background-dark border border-white/10 focus:border-primary rounded-lg px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="relative group">
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-3 text-slate-500 outline-none cursor-not-allowed pr-10"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">
                      <Lock size={16} />
                    </div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-800 text-xs text-slate-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      El email no se puede cambiar
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={profileSaving}
                  className="px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {profileSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {activeTab === 'seguridad' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-surface-dark rounded-2xl p-8 border border-white/5">
            <h2 className="text-xl font-display font-bold text-white mb-6">
              Cambiar Contraseña
            </h2>

            <AnimatePresence>
              {passwordToast && (
                <div className="mb-6">
                  <Toast
                    type={passwordToast.type}
                    message={passwordToast.message}
                    onClose={() => setPasswordToast(null)}
                  />
                </div>
              )}
            </AnimatePresence>

            <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.current}
                    onChange={(e) => handlePasswordChange('current', e.target.value)}
                    className="w-full bg-background-dark border border-white/10 focus:border-primary rounded-lg px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.current && (
                  <p className="mt-1 text-xs text-red-400">{passwordErrors.current}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.new}
                    onChange={(e) => handlePasswordChange('new', e.target.value)}
                    className="w-full bg-background-dark border border-white/10 focus:border-primary rounded-lg px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.new && (
                  <p className="mt-1 text-xs text-red-400">{passwordErrors.new}</p>
                )}

                {passwordForm.new && (
                  <div className="mt-3">
                    <div className="flex gap-1.5 mb-3">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            i < strengthLevel ? strengthColor : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <ul className="space-y-1.5">
                      {passwordCriteria.map((criterion, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          {criterion.met ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <X size={14} className="text-red-400" />
                          )}
                          <span className={criterion.met ? 'text-slate-300' : 'text-slate-500'}>
                            {criterion.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirm}
                    onChange={(e) => handlePasswordChange('confirm', e.target.value)}
                    className="w-full bg-background-dark border border-white/10 focus:border-primary rounded-lg px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.confirm && (
                  <p className="mt-1 text-xs text-red-400">{passwordErrors.confirm}</p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={passwordSaving}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {passwordSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  'Cambiar Contraseña'
                )}
              </motion.button>
            </form>
          </div>

          <div className="bg-surface-dark rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <Shield size={24} className="text-primary" />
              <h2 className="text-xl font-display font-bold text-white">
                Autenticación en Dos Pasos
              </h2>
            </div>

            <AnimatePresence>
              {twoFAToast && (
                <div className="mb-6">
                  <Toast
                    type={twoFAToast.type}
                    message={twoFAToast.message}
                    onClose={() => setTwoFAToast(null)}
                  />
                </div>
              )}
            </AnimatePresence>

            {twoFAEnabled && !showSetup ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                    Activada
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                  Método actual:{' '}
                  <span className="text-white font-medium">
                    {twoFAMethod === 'totp' ? 'App Autenticadora' : 'Código por Email'}
                  </span>
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleChangeMethod}
                    className="px-5 py-2.5 rounded-lg border border-white/10 text-white font-medium hover:bg-white/5 transition-colors text-sm"
                  >
                    Cambiar método
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    className="px-5 py-2.5 rounded-lg border border-red-500/30 text-red-400 font-medium hover:bg-red-500/10 transition-colors text-sm"
                  >
                    Desactivar 2FA
                  </button>
                </div>
              </div>
            ) : !showSetup ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
                    Desactivada
                  </span>
                </div>
                <p className="text-amber-400/80 text-sm mb-6">
                  Recomendamos activar la autenticación en dos pasos para mayor seguridad.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startSetup}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all"
                >
                  Configurar 2FA
                </motion.button>
              </div>
            ) : null}

            <AnimatePresence>
              {showDisableModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowDisableModal(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-surface-dark rounded-2xl p-8 border border-white/10 w-full max-w-md mx-4"
                  >
                    <h3 className="text-lg font-display font-bold text-white mb-2">
                      Desactivar Autenticación en Dos Pasos
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Para desactivar 2FA, introduce tu contraseña y un código de verificación.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={showDisablePassword ? 'text' : 'password'}
                            value={disableForm.password}
                            onChange={(e) =>
                              setDisableForm((prev) => ({ ...prev, password: e.target.value }))
                            }
                            className="w-full bg-background-dark border border-white/10 focus:border-primary rounded-lg px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDisablePassword((v) => !v)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                            tabIndex={-1}
                          >
                            {showDisablePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Código de verificación
                        </label>
                        <input
                          type="text"
                          value={disableForm.code}
                          onChange={(e) =>
                            setDisableForm((prev) => ({ ...prev, code: e.target.value }))
                          }
                          placeholder="000000"
                          maxLength={6}
                          className="w-full bg-background-dark border border-white/10 focus:border-primary rounded-lg px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary transition-colors font-mono text-lg tracking-wider"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleConfirmDisable2FA}
                        disabled={disableLoading || !disableForm.password || !disableForm.code}
                        className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {disableLoading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Desactivando...
                          </>
                        ) : (
                          'Desactivar 2FA'
                        )}
                      </motion.button>
                      <button
                        onClick={() => setShowDisableModal(false)}
                        disabled={disableLoading}
                        className="px-6 py-3 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSetup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {setupStep === 'choose' && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4">
                        Elige un método de verificación
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          onClick={() => handleMethodSelect('totp')}
                          disabled={setupLoading}
                          className="p-6 rounded-xl border border-white/10 hover:border-primary/50 bg-background-dark text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                            {setupLoading && setupMethod === 'totp' ? (
                              <Loader2 size={24} className="text-primary animate-spin" />
                            ) : (
                              <Smartphone size={24} className="text-primary" />
                            )}
                          </div>
                          <h4 className="text-white font-medium mb-1">App Autenticadora</h4>
                          <p className="text-slate-500 text-xs">
                            Google Authenticator, Authy u otra app TOTP
                          </p>
                        </button>
                        <button
                          onClick={() => handleMethodSelect('email')}
                          disabled={setupLoading}
                          className="p-6 rounded-xl border border-white/10 hover:border-primary/50 bg-background-dark text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                            {setupLoading && setupMethod === 'email' ? (
                              <Loader2 size={24} className="text-secondary animate-spin" />
                            ) : (
                              <Mail size={24} className="text-secondary" />
                            )}
                          </div>
                          <h4 className="text-white font-medium mb-1">Código por Email</h4>
                          <p className="text-slate-500 text-xs">
                            Recibe un código de verificación en tu email
                          </p>
                        </button>
                      </div>
                      <button
                        onClick={() => setShowSetup(false)}
                        className="mt-4 text-sm text-slate-500 hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {setupStep === 'verify' && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4">
                        {setupMethod === 'totp'
                          ? 'Configura tu App Autenticadora'
                          : 'Verificación por Email'}
                      </h3>

                      {setupMethod === 'totp' ? (
                        <div className="space-y-4">
                          <div className="w-48 h-48 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto overflow-hidden">
                            {totpQrUrl ? (
                              <img
                                src={totpQrUrl}
                                alt="QR Code para autenticación"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Loader2 size={24} className="text-slate-500 animate-spin" />
                            )}
                          </div>
                          <div className="bg-background-dark rounded-lg p-4 border border-white/10">
                            <p className="text-xs text-slate-500 mb-1">
                              Clave manual (si no puedes escanear el QR):
                            </p>
                            <p className="text-white font-mono text-sm tracking-wider select-all">
                              {totpSecret || '...'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm mb-4">
                          Hemos enviado un código de verificación a tu dirección de email. Introdúcelo a continuación para confirmar.
                        </p>
                      )}

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Código de verificación
                        </label>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full max-w-xs bg-background-dark border border-white/10 focus:border-primary rounded-lg px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary transition-colors font-mono text-lg tracking-wider"
                        />
                      </div>

                      <div className="flex gap-3 mt-6">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleVerify2FA}
                          disabled={!verificationCode.trim() || verifyLoading}
                          className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {verifyLoading ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Verificando...
                            </>
                          ) : (
                            'Verificar'
                          )}
                        </motion.button>
                        <button
                          onClick={() => {
                            setSetupStep('choose')
                            setVerificationCode('')
                            setTwoFAToast(null)
                          }}
                          disabled={verifyLoading}
                          className="px-6 py-3 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                        >
                          Atrás
                        </button>
                      </div>
                    </div>
                  )}

                  {setupStep === 'recovery' && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        Códigos de Recuperación
                      </h3>
                      <p className="text-amber-400/80 text-sm mb-6">
                        Guarda estos códigos en un lugar seguro. Los necesitarás si pierdes acceso a tu método de verificación.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        {recoveryCodes.map((code, i) => (
                          <div
                            key={i}
                            className="bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-center font-mono text-sm text-white select-all"
                          >
                            {code}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleCopyAllCodes}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-6"
                      >
                        <Copy size={16} />
                        Copiar todos los códigos
                      </button>

                      <div className="border-t border-white/5 pt-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={codesConfirmed}
                            onChange={(e) => setCodesConfirmed(e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
                          />
                          <span className="text-sm text-slate-300">
                            He guardado mis códigos de recuperación en un lugar seguro
                          </span>
                        </label>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleConfirmSetup}
                          disabled={!codesConfirmed}
                          className="mt-4 px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Confirmar y Activar 2FA
                        </motion.button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
