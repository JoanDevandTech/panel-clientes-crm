import { lazy, Suspense, useCallback, useState } from 'react'
import { Link } from 'wouter'
import {
  ArrowLeft,
  User,
  Briefcase,
  Layers,
  Shield,
  Bell,
  Laptop,
  Lock,
  Check,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'

import './profile/profile.css'
import { PerfilHeader, PerfilTabs } from './profile/components'
import { AvatarModal, BannerModal } from './profile/AvatarModal'
import { VerifyEmailModal } from './profile/VerifyModal'

const TabPersonal = lazy(() => import('./profile/TabPersonal'))
const TabFiscal = lazy(() => import('./profile/TabFiscal'))
const TabCuentas = lazy(() => import('./profile/TabCuentas'))
const TabSeguridad = lazy(() => import('./profile/TabSeguridad'))
const TabNotif = lazy(() => import('./profile/TabNotif'))
const TabSesiones = lazy(() => import('./profile/TabSesiones'))
const TabPrivacidad = lazy(() => import('./profile/TabPrivacidad'))

function buildTabs(profile) {
  const fiscalPct = profile?.completeness?.breakdown?.fiscal_data?.percentage ?? 100
  const twoFactorPct = profile?.completeness?.breakdown?.two_factor?.percentage ?? 100
  return [
    { key: 'personal', label: 'Información personal', icon: User },
    { key: 'fiscal', label: 'Datos fiscales', icon: Briefcase, flag: fiscalPct < 80 ? 'incomplete' : null },
    { key: 'cuentas', label: 'Cuentas vinculadas', icon: Layers },
    { key: 'seguridad', label: 'Seguridad', icon: Shield, flag: twoFactorPct < 80 ? 'warn' : null },
    { key: 'notif', label: 'Notificaciones', icon: Bell },
    { key: 'sesiones', label: 'Sesiones activas', icon: Laptop },
    { key: 'privacidad', label: 'Privacidad y datos', icon: Lock },
  ]
}

function ToastStack({ toasts }) {
  return (
    <div className="pf-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="pf-toast">
          <Check size={14} /> {t.msg}
        </div>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid #a855f7',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'pf-spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes pf-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ProfilePage() {
  const { data, loading, error, refetch, setData } = useApi('/client/profile')
  const profile = data?.data ?? data

  const [activeTab, setActiveTab] = useState('personal')
  const [toasts, setToasts] = useState([])
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(false)
  const [verifyEmailKind, setVerifyEmailKind] = useState(null) // 'primary' | 'secondary' | null

  const showToast = useCallback((msg) => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts, { id, msg }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 2400)
  }, [])

  const updateUserPartial = useCallback(
    (patch) => {
      setData((prev) => {
        if (!prev) return prev
        const root = prev.data ?? prev
        const next = { ...root, user: { ...(root.user || {}), ...patch } }
        return prev.data ? { ...prev, data: next } : next
      })
    },
    [setData],
  )

  const updateProfilePartial = useCallback(
    (patch) => {
      setData((prev) => {
        if (!prev) return prev
        const root = prev.data ?? prev
        const next = { ...root, ...patch }
        return prev.data ? { ...prev, data: next } : next
      })
    },
    [setData],
  )

  if (loading) {
    return (
      <div className="profile-page-v2">
        <Link href="/portal/dashboard" className="pf-btn pf-ghost pf-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Volver al dashboard
        </Link>
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="profile-page-v2">
        <div style={{ textAlign: 'center', padding: 64 }}>
          <p style={{ color: '#f87171', marginBottom: 16 }}>{error}</p>
          <button type="button" className="pf-btn pf-primary" onClick={refetch}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const tabs = buildTabs(profile)

  const renderTab = () => {
    const props = {
      profile,
      onShowToast: showToast,
      updateProfilePartial,
      onOpenVerifyEmail: (kind) => setVerifyEmailKind(kind || 'primary'),
    }
    switch (activeTab) {
      case 'personal':
        return <TabPersonal {...props} />
      case 'fiscal':
        return <TabFiscal {...props} />
      case 'cuentas':
        return <TabCuentas {...props} />
      case 'seguridad':
        return <TabSeguridad {...props} />
      case 'notif':
        return <TabNotif {...props} />
      case 'sesiones':
        return <TabSesiones {...props} />
      case 'privacidad':
        return <TabPrivacidad {...props} />
      default:
        return null
    }
  }

  return (
    <div className="profile-page-v2">
      <Link
        href="/portal/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--pf-text-muted)',
          marginBottom: 16,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={14} /> Volver al dashboard
      </Link>

      <PerfilHeader
        profile={profile}
        onOpenAvatarModal={() => setAvatarOpen(true)}
        onOpenBannerModal={() => setBannerOpen(true)}
      />

      <PerfilTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <Suspense fallback={<Spinner />}>{renderTab()}</Suspense>

      <ToastStack toasts={toasts} />

      {avatarOpen && (
        <AvatarModal
          onClose={() => setAvatarOpen(false)}
          onShowToast={showToast}
          onSaved={(payload) => updateUserPartial(payload)}
        />
      )}
      {bannerOpen && (
        <BannerModal
          onClose={() => setBannerOpen(false)}
          onShowToast={showToast}
          onSaved={(payload) => updateUserPartial(payload)}
        />
      )}
      {verifyEmailKind && (
        <VerifyEmailModal
          kind={verifyEmailKind}
          onClose={() => setVerifyEmailKind(null)}
          onShowToast={showToast}
          onVerified={(updatedUser) => {
            if (updatedUser) updateUserPartial(updatedUser)
            else refetch()
          }}
        />
      )}
    </div>
  )
}
