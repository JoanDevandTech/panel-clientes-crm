import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../hooks/useAuth'

export default function ImpersonatePage() {
  const [, setLocation] = useLocation()
  const { applyImpersonation } = useAuth()
  const [error, setError] = useState(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('impersonation_token')
    const refreshToken = params.get('refresh_token')
    const impersonator = params.get('impersonator') || 'Admin'

    // Higiene URL: borra los tokens del historial antes de cualquier render
    if (window.location.search.includes('impersonation_token')) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (!accessToken || !refreshToken) {
      setError('Enlace de impersonación inválido.')
      setTimeout(() => setLocation('/login?error=invalid_impersonation', { replace: true }), 1500)
      return
    }

    applyImpersonation({ accessToken, refreshToken, impersonator })
      .then(() => setLocation('/portal/dashboard', { replace: true }))
      .catch((err) => {
        setError(err?.message || 'No se pudo iniciar la sesión impersonada.')
        setTimeout(() => setLocation('/login?error=impersonation_failed', { replace: true }), 1500)
      })
  }, [applyImpersonation, setLocation])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--pr-bg-primary, #0a0e1a)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: 'var(--pr-text-secondary, rgba(255,255,255,0.62))',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {error ? (
        <>
          <div style={{ color: '#f87171', fontSize: 14, fontWeight: 500 }}>{error}</div>
          <div style={{ fontSize: 12, color: 'var(--pr-text-muted, rgba(255,255,255,0.4))' }}>
            Redirigiendo al login…
          </div>
        </>
      ) : (
        <>
          <div className="pr-spinner" />
          <div style={{ fontSize: 13 }}>Iniciando sesión como cliente…</div>
        </>
      )}
    </div>
  )
}
