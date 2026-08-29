import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../hooks/useAuth'

/**
 * Destino del enlace de acceso que llega por email
 * (portal.kromagency.es/magic-login?token=cml_…).
 *
 * El canje es POST a propósito, no GET: los escáneres de enlaces de los
 * clientes de correo y los antivirus siguen las URL de los emails, y con un
 * GET quemarían el token de un solo uso antes de que el destinatario llegara
 * a pulsarlo.
 *
 * El enlace sustituye a la CONTRASEÑA, no al segundo factor: si la cuenta
 * tiene 2FA, la respuesta llega con requires_2fa y se reenvía al flujo de
 * siempre en /login con el temp_token.
 */
export default function MagicLoginPage() {
  const [, setLocation] = useLocation()
  const { loginWithMagicToken } = useAuth()

  const [estado, setEstado] = useState('canjeando') // canjeando | caducado | error
  const [mensaje, setMensaje] = useState(null)
  const ranRef = useRef(false)

  useEffect(() => {
    // En React 18 con StrictMode el efecto corre dos veces en desarrollo, y el
    // token es de un solo uso: sin esta guarda el segundo canje siempre daría
    // 401 y la pantalla diría "caducado" incluso habiendo funcionado.
    if (ranRef.current) return
    ranRef.current = true

    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    // Higiene de URL: fuera el token del historial y de la barra de
    // direcciones antes de nada. Ya no sirve para volver a entrar, pero no
    // tiene por qué quedarse a la vista ni viajar en un Referer.
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (!token) {
      setEstado('caducado')
      setMensaje('El enlace no es válido. Pide uno nuevo desde la pantalla de acceso.')
      return
    }

    loginWithMagicToken(token)
      .then((resultado) => {
        if (resultado?.requires2FA) {
          // El login normal guarda el temp_token en su propio estado. Aquí hay
          // un cambio de página de por medio, así que viaja por sessionStorage
          // y no por la URL: es una credencial temporal.
          try {
            sessionStorage.setItem('magic_2fa', JSON.stringify({
              tempToken: resultado.tempToken,
              method: resultado.method || 'totp',
            }))
          } catch {
            // Sin sessionStorage no hay forma de continuar el 2FA aquí.
          }
          setLocation('/login?2fa=1', { replace: true })
          return
        }

        // Sesión abierta. Si la cuenta arrastra un cambio de contraseña
        // pendiente, se entra por el perfil, que es donde vive ese formulario.
        setLocation(resultado?.mustChangePassword ? '/portal/profile' : '/portal/dashboard', { replace: true })
      })
      .catch((err) => {
        const status = err?.status
        const msgApi = err?.data?.message || err?.message

        if (status === 401) {
          // Caducado (15 min), ya usado, o invalidado por haber pedido otro.
          setEstado('caducado')
          setMensaje(msgApi || 'Este enlace ya no sirve: ha caducado, ya se usó, o pediste uno más nuevo.')
          return
        }
        // 403 (cuenta inactiva) y 429 (límite) traen mensaje propio de la API:
        // se muestra tal cual en vez de inventar uno.
        setEstado('error')
        setMensaje(msgApi || 'No hemos podido validar el enlace. Inténtalo de nuevo.')
      })
  }, [loginWithMagicToken, setLocation])

  const envoltorio = {
    minHeight: '100vh',
    background: 'var(--pr-bg-primary, #0D0E11)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    textAlign: 'center',
    color: 'var(--pr-text-secondary, rgba(248,249,250,0.6))',
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  }

  if (estado === 'canjeando') {
    return (
      <div style={envoltorio}>
        <div
          style={{
            width: 28,
            height: 28,
            border: '2px solid rgba(248,249,250,0.15)',
            borderTopColor: 'var(--pr-accent-cyan, #00E5FF)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ fontSize: 14 }}>Validando tu enlace de acceso…</div>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    )
  }

  return (
    <div style={envoltorio}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: estado === 'caducado' ? 'var(--pr-text-primary, #F8F9FA)' : '#FF5C7A',
          maxWidth: 460,
          lineHeight: 1.6,
        }}
      >
        {mensaje}
      </div>

      <button
        type="button"
        onClick={() => setLocation('/login', { replace: true })}
        style={{
          marginTop: 8,
          padding: '12px 26px',
          cursor: 'pointer',
          border: 0,
          background: 'var(--pr-accent-cyan, #00E5FF)',
          color: '#0D0E11',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Solicitar enlace nuevo
      </button>
    </div>
  )
}
