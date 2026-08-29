import { createContext, useState, useEffect, useCallback } from 'react'
import { api, setAccessToken, setRefreshToken, clearTokens, getRefreshToken, refreshAccessToken } from '../services/api'

export const AuthContext = createContext(null)

const IMP_KEY = 'impersonation_active'
const IMP_NAME = 'impersonator_name'

function clearImpersonationFlags() {
  try {
    localStorage.removeItem(IMP_KEY)
    localStorage.removeItem(IMP_NAME)
    sessionStorage.removeItem(IMP_KEY)
    sessionStorage.removeItem(IMP_NAME)
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [client, setClient] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreSession = async () => {
      // Si la app arranca en un flujo que trae su PROPIA sesión por enlace, no
      // se restaura la anterior: de eso se encargan ImpersonatePage y
      // MagicLoginPage con el token del enlace. Hacer ambas cosas a la vez es
      // una carrera y, según cuál termine última, el enlace se queda con la
      // sesión ya guardada en vez de con la suya.
      //
      // En el magic link hay además un segundo daño: si restoreSession gana,
      // api.js manda el Bearer recién restaurado en el POST de canje, y
      // entonces un 401 se va por el camino del refresco y acaba lanzando
      // "Session expired" — sin .status— en lugar del mensaje real de enlace
      // caducado, que es justo lo que la pantalla necesita distinguir.
      const entrandoPorEnlace =
        typeof window !== "undefined" &&
        (window.location.pathname === "/auth/impersonate" ||
          window.location.search.includes("impersonation_token") ||
          window.location.pathname === "/magic-login")
      if (entrandoPorEnlace) {
        setLoading(false)
        return
      }

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        setLoading(false)
        return
      }

      try {
        // Un único camino de refresco (el de api.js, con guard de single-flight).
        // Hacer aquí un fetch propio provocaba dos refrescos concurrentes: con
        // tokens rotatorios el segundo llegaba caducado y tumbaba la sesión.
        await refreshAccessToken()

        const userData = await api.get('/auth/me')
        setClient(userData.data || userData)
        setIsAuthenticated(true)
      } catch {
        clearTokens()
        clearImpersonationFlags()
        setClient(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password })

    if (response.requires_2fa) {
      return {
        requires2FA: true,
        tempToken: response.temp_token,
        method: response.method,
      }
    }

    setAccessToken(response.access_token)
    if (response.refresh_token) {
      setRefreshToken(response.refresh_token)
    }

    const userData = await api.get('/auth/me')
    setClient(userData.data || userData)
    setIsAuthenticated(true)

    return { success: true }
  }, [])

  /**
   * Solicita un enlace de acceso por email.
   *
   * La API responde SIEMPRE 200 con el mismo mensaje exista o no la cuenta:
   * es anti-enumeración, así que el mensaje se muestra tal cual y no se
   * interpreta como "existe" ni "no existe". El único error que sí llega es
   * el 429 del límite (3 solicitudes / 5 min), que la vista sí distingue.
   */
  const requestMagicLink = useCallback(async (email) => {
    return api.post('/auth/magic-link', { email })
  }, [])

  /**
   * Canjea el token del enlace por una sesión.
   *
   * Devuelve lo mismo que login(): o {requires2FA} —el enlace sustituye a la
   * contraseña, no al segundo factor— o {success} con la sesión ya guardada.
   * A partir de ahí no hay nada especial: es la sesión estándar.
   */
  const loginWithMagicToken = useCallback(async (token) => {
    const response = await api.post('/auth/magic-login', { token })

    if (response.requires_2fa) {
      return {
        requires2FA: true,
        tempToken: response.temp_token,
        method: response.method,
      }
    }

    setAccessToken(response.access_token)
    if (response.refresh_token) {
      setRefreshToken(response.refresh_token)
    }

    const userData = await api.get('/auth/me')
    setClient(userData.data || userData)
    setIsAuthenticated(true)

    return { success: true, mustChangePassword: !!response.must_change_password }
  }, [])

  const verify2FA = useCallback(async (tempToken, code, method) => {
    const response = await api.post('/auth/verify-2fa', {
      temp_token: tempToken,
      code,
      method,
    })

    setAccessToken(response.access_token)
    if (response.refresh_token) {
      setRefreshToken(response.refresh_token)
    }

    const userData = await api.get('/auth/me')
    setClient(userData.data || userData)
    setIsAuthenticated(true)

    return { success: true }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best effort
    }

    clearTokens()
    clearImpersonationFlags()
    setClient(null)
    setIsAuthenticated(false)
    window.location.href = '/login'
  }, [])

  const updateClient = useCallback((data) => {
    setClient((prev) => ({ ...prev, ...data }))
  }, [])

  // Hidrata sesión a partir de tokens emitidos por el backend desde el CRM
  // (botón "Ver portal como cliente"). NO llama a /auth/logout previo para no
  // revocar la sesión real del cliente impersonado; sustituye en local.
  const applyImpersonation = useCallback(async ({ accessToken, refreshToken, impersonator }) => {
    if (!accessToken || !refreshToken) {
      throw new Error('Tokens de impersonación faltantes')
    }

    if (client?.id) {
      // eslint-disable-next-line no-console
      console.warn('Impersonation overriding existing session for client.id=', client.id)
    }

    // Reset local sin tocar backend
    clearTokens()
    clearImpersonationFlags()
    setClient(null)
    setIsAuthenticated(false)

    // Aplica nuevos tokens
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)

    // Marca impersonación (dual-store: sessionStorage por defecto + localStorage
    // para sobrevivir reload completo)
    const name = impersonator || 'Admin'
    try {
      sessionStorage.setItem(IMP_KEY, '1')
      sessionStorage.setItem(IMP_NAME, name)
      localStorage.setItem(IMP_KEY, '1')
      localStorage.setItem(IMP_NAME, name)
    } catch {
      // ignore
    }

    const userData = await api.get('/auth/me')
    setClient(userData.data || userData)
    setIsAuthenticated(true)

    return { success: true }
  }, [client?.id])

  const value = {
    client,
    isAuthenticated,
    loading,
    login,
    verify2FA,
    requestMagicLink,
    loginWithMagicToken,
    logout,
    updateClient,
    applyImpersonation,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
