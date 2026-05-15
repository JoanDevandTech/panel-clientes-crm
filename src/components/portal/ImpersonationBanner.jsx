import { useEffect, useState } from 'react'
import { AlertTriangle, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const IMP_KEY = 'impersonation_active'
const IMP_NAME = 'impersonator_name'

function readActive() {
  try {
    return localStorage.getItem(IMP_KEY) === '1' || sessionStorage.getItem(IMP_KEY) === '1'
  } catch {
    return false
  }
}

function readName() {
  try {
    return sessionStorage.getItem(IMP_NAME) || localStorage.getItem(IMP_NAME) || 'Admin'
  } catch {
    return 'Admin'
  }
}

function clientLabel(client) {
  if (!client) return 'cliente'
  const full = [client.first_name, client.last_name].filter(Boolean).join(' ').trim()
  return full || client.name || client.email || `Cliente ${client.id ?? ''}`.trim() || 'cliente'
}

export default function ImpersonationBanner() {
  const { client, logout } = useAuth()
  const [active, setActive] = useState(() => readActive())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === IMP_KEY) setActive(readActive())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!active) return null

  const handleExit = async () => {
    if (busy) return
    setBusy(true)
    try {
      await logout()
    } catch {
      // logout ya limpia y redirige; en caso extremo forzamos
      window.location.href = '/login'
    }
  }

  return (
    <div className="pr-impersonation-banner" role="status" aria-live="polite">
      <AlertTriangle size={16} aria-hidden />
      <div className="pr-impersonation-banner-text">
        Modo impersonación · Estás viendo el portal como{' '}
        <strong>{clientLabel(client)}</strong>. Iniciado por <strong>{readName()}</strong>.
      </div>
      <button
        type="button"
        className="pr-impersonation-banner-btn"
        onClick={handleExit}
        disabled={busy}
      >
        <LogOut size={13} />
        {busy ? 'Saliendo…' : 'Salir'}
      </button>
    </div>
  )
}
