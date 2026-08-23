import { useState } from 'react'
import { Layers, Link2, Unlink, Loader2 } from 'lucide-react'
import api from '../../../services/api'
import { FormCard } from './components'

const PROVIDERS = [
  { id: 'google', name: 'Google', color: '#ea4335', icon: 'G' },
  { id: 'microsoft', name: 'Microsoft', color: '#0078d4', icon: 'M' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0a66c2', icon: 'in' },
  { id: 'github', name: 'GitHub', color: '#24292e', icon: 'GH' },
  { id: 'apple', name: 'Apple', color: '#000', icon: '' },
  { id: 'facebook', name: 'Facebook', color: '#1877f2', icon: 'f' },
]

function relativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso)
  if (isNaN(then.getTime())) return ''
  const now = new Date()
  const diffMs = now - then
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffH = Math.round(diffMin / 60)
  const diffD = Math.round(diffH / 24)
  const diffW = Math.round(diffD / 7)
  const diffMo = Math.round(diffD / 30)
  const diffY = Math.round(diffD / 365)
  if (diffSec < 60) return 'hace unos segundos'
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin === 1 ? '' : 's'}`
  if (diffH < 24) return `hace ${diffH} hora${diffH === 1 ? '' : 's'}`
  if (diffD < 7) return `hace ${diffD} día${diffD === 1 ? '' : 's'}`
  if (diffW < 5) return `hace ${diffW} semana${diffW === 1 ? '' : 's'}`
  if (diffMo < 12) return `hace ${diffMo} mes${diffMo === 1 ? '' : 'es'}`
  return `hace ${diffY} año${diffY === 1 ? '' : 's'}`
}

export default function TabCuentas({ profile, onShowToast, updateProfilePartial }) {
  const [busy, setBusy] = useState({}) // { [provider]: 'link' | 'unlink' | null }

  const socialAccounts = Array.isArray(profile?.social_accounts) ? profile.social_accounts : []

  const findLinked = (providerId) => socialAccounts.find((s) => s.provider === providerId)

  const showToast = (msg, type = 'success') => {
    if (typeof onShowToast === 'function') onShowToast(msg, type)
  }

  const handleLink = async (providerId) => {
    setBusy((b) => ({ ...b, [providerId]: 'link' }))
    try {
      const res = await api.get(`/client/profile/social-accounts/${providerId}/redirect`)
      const url = res?.data?.redirect_url || res?.redirect_url
      if (!url) {
        showToast('No se pudo obtener la URL de redirección', 'error')
        setBusy((b) => ({ ...b, [providerId]: null }))
        return
      }
      window.location.href = url
    } catch (err) {
      showToast(err?.data?.message || err?.message || 'No se pudo iniciar la vinculación', 'error')
      setBusy((b) => ({ ...b, [providerId]: null }))
    }
  }

  const handleUnlink = async (providerId, providerName) => {
    if (!window.confirm(`¿Desvincular la cuenta de ${providerName}?`)) return
    setBusy((b) => ({ ...b, [providerId]: 'unlink' }))
    try {
      await api.delete(`/client/profile/social-accounts/${providerId}`)
      showToast('Cuenta desvinculada', 'success')
      if (typeof updateProfilePartial === 'function') {
        updateProfilePartial({
          social_accounts: socialAccounts.filter((s) => s.provider !== providerId),
        })
      }
    } catch (err) {
      if (err?.status === 400) {
        showToast(err?.data?.message || 'No se puede desvincular este proveedor', 'error')
      } else {
        showToast(err?.data?.message || err?.message || 'No se pudo desvincular la cuenta', 'error')
      }
    } finally {
      setBusy((b) => ({ ...b, [providerId]: null }))
    }
  }

  return (
    <div className="pf-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FormCard
        icon={Layers}
        iconAccent="cyan"
        title="Cuentas vinculadas"
        subtitle="Inicia sesión más rápido conectando tus cuentas externas"
      >
        <p style={{ fontSize: 13, color: 'var(--pf-text-muted)' }}>
          Vincula proveedores SSO para iniciar sesión sin contraseña. Puedes desvincular cualquier cuenta
          siempre que tengas otra forma de acceder.
        </p>
      </FormCard>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {PROVIDERS.map((p) => {
          const linked = findLinked(p.id)
          const isLinked = Boolean(linked)
          const action = busy[p.id]

          return (
            <div key={p.id} className={`pf-sso-card ${isLinked ? 'linked' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div
                  className="pf-sso-logo"
                  style={{ background: p.color, fontWeight: 700, fontSize: 16 }}
                  aria-hidden="true"
                >
                  {p.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pf-text-primary)' }}>
                    {p.name}
                  </div>
                </div>
                {isLinked && <span className="pf-badge green">Vinculada</span>}
              </div>

              {isLinked ? (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--pf-text-muted)',
                      marginBottom: 4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={linked.provider_email}
                  >
                    {linked.provider_email}
                  </div>
                  {linked.linked_at && (
                    <div style={{ fontSize: 11, color: 'var(--pf-text-muted)', marginBottom: 12 }}>
                      Vinculada {relativeTime(linked.linked_at)}
                    </div>
                  )}
                  {linked.is_unlinkable ? (
                    <button
                      type="button"
                      className="pf-btn pf-danger pf-sm"
                      onClick={() => handleUnlink(p.id, p.name)}
                      disabled={action === 'unlink'}
                    >
                      {action === 'unlink' ? (
                        <Loader2 size={13} className="pf-spin" />
                      ) : (
                        <Unlink size={13} />
                      )}
                      Desvincular
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pf-btn pf-danger pf-sm"
                      disabled
                      title="Necesitas configurar otro método primero"
                    >
                      <Unlink size={13} />
                      Desvincular
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className="pf-btn pf-primary pf-sm"
                  onClick={() => handleLink(p.id)}
                  disabled={action === 'link'}
                  style={{ marginTop: 4 }}
                >
                  {action === 'link' ? (
                    <Loader2 size={13} className="pf-spin" />
                  ) : (
                    <Link2 size={13} />
                  )}
                  Vincular {p.name}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
