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
      // Si la app arranca en el flujo de impersonación, NO se restaura la sesión
      // anterior: de eso se encarga ImpersonatePage con los tokens del enlace.
      // Hacer ambas cosas a la vez era una carrera y, según cuál terminara
      // última, la impersonación se quedaba con la sesión ya guardada.
      const entrandoAImpersonar =
        typeof window !== "undefined" &&
        (window.location.pathname === "/auth/impersonate" ||
          window.location.search.includes("impersonation_token"))
      if (entrandoAImpersonar) {
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
