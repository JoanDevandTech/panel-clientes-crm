import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

export function useApi(endpoint, options = {}) {
  const { immediate = true, params = {} } = options
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const queryString = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(fullEndpoint)
      setData(response.data !== undefined ? response.data : response)
      return response
    } catch (err) {
      setError(err.message || 'Error al cargar los datos')
      throw err
    } finally {
      setLoading(false)
    }
  }, [fullEndpoint])

  useEffect(() => {
    if (immediate) {
      fetchData()
    }
  }, [fetchData, immediate])

  return { data, loading, error, refetch: fetchData, setData }
}
