import { createContext, useState, useEffect, useCallback } from 'react'
import { api, setAccessToken, setRefreshToken, clearTokens, getRefreshToken, BASE_URL } from '../services/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [client, setClient] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreSession = async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        setLoading(false)
        return
      }

      try {
        const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (!refreshResponse.ok) {
          throw new Error('Refresh failed')
        }

        const refreshData = await refreshResponse.json()
        setAccessToken(refreshData.access_token)
        if (refreshData.refresh_token) {
          setRefreshToken(refreshData.refresh_token)
        }

        const userData = await api.get('/auth/me')
        setClient(userData.data || userData)
        setIsAuthenticated(true)
      } catch {
        clearTokens()
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
    setClient(null)
    setIsAuthenticated(false)
    window.location.href = '/login'
  }, [])

  const updateClient = useCallback((data) => {
    setClient((prev) => ({ ...prev, ...data }))
  }, [])

  const value = {
    client,
    isAuthenticated,
    loading,
    login,
    verify2FA,
    logout,
    updateClient,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
