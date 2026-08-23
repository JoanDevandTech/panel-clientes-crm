export const BASE_URL = import.meta.env.VITE_API_URL || 'https://crm.kromagency.es/api/v1'

// Access token stored in memory only (not localStorage) for security
let accessToken = null

export const setAccessToken = (token) => {
  accessToken = token
}

export const getAccessToken = () => accessToken

export const setRefreshToken = (token) => {
  localStorage.setItem('refresh_token', token)
}

export const getRefreshToken = () => {
  return localStorage.getItem('refresh_token')
}

export const clearTokens = () => {
  accessToken = null
  localStorage.removeItem('refresh_token')
}

let isRefreshing = false
let refreshPromise = null

// Se exporta para que AuthContext use ESTE camino y no haga su propio fetch a
// /auth/refresh: dos refrescos concurrentes con tokens rotatorios hacían que el
// segundo llegase con un token ya consumido.
export const refreshAccessToken = async () => {
  if (isRefreshing) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      setAccessToken(data.access_token)
      if (data.refresh_token) {
        setRefreshToken(data.refresh_token)
      }
      return data.access_token
    } catch (error) {
      clearTokens()
      // Antes se hacía window.location.href = '/login', que es una recarga
      // completa: si un refresco en vuelo terminaba después y volvía a guardar el
      // token, la app arrancaba de nuevo y repetía el ciclo (hasta agotar el
      // límite de 60/min de /auth/refresh y devolver 429). Se deja que
      // ProtectedRoute redirija por router, sin recargar.
      throw error
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`

  const isFormData = options.body instanceof FormData

  const headers = {
    'Accept': 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const sentBearer = Boolean(headers['Authorization'])

  let response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401 && sentBearer) {
    try {
      const newToken = await refreshAccessToken()
      headers['Authorization'] = `Bearer ${newToken}`
      response = await fetch(url, {
        ...options,
        headers,
      })
    } catch {
      throw new Error('Session expired')
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))

    if (response.status === 403 && errorData.message && errorData.message.toLowerCase().includes('cambiar')) {
      // Cambio de contraseña pendiente: hay que llevar al usuario a su perfil.
      // Sin la guarda de abajo esto era un bucle infinito: estando YA en
      // /portal/profile, cualquier petición seguía devolviendo 403 y se volvía
      // a forzar la misma recarga una y otra vez, agotando el límite de
      // 60 peticiones/min de la API (de ahí el "Too Many Attempts").
      if (typeof window !== 'undefined' && window.location.pathname !== '/portal/profile') {
        window.location.href = '/portal/profile'
      }
      throw new Error(errorData.message)
    }

    const error = new Error(errorData.message || `Request failed with status ${response.status}`)
    error.status = response.status
    error.data = errorData
    throw error
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

const prepareBody = (data) => {
  if (data instanceof FormData) return data
  return JSON.stringify(data)
}

export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, data) => apiRequest(endpoint, {
    method: 'POST',
    body: prepareBody(data),
  }),
  put: (endpoint, data) => apiRequest(endpoint, {
    method: 'PUT',
    body: prepareBody(data),
  }),
  patch: (endpoint, data) => apiRequest(endpoint, {
    method: 'PATCH',
    body: prepareBody(data),
  }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
}

export default api
