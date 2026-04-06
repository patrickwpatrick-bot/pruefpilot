/**
 * PrüfPilot API Client
 * - JWT token injection
 * - Token refresh on 401
 * - Retry interceptor with exponential backoff for 5xx errors and network failures
 */
import axios, { AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request: Attach JWT token ────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response: Retry interceptor with exponential backoff ──────────

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 300

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as any
    if (!config) return Promise.reject(error)

    const retryCount = (config._retryCount as number | undefined) || 0

    // ─── 401: Token refresh ───────────────────────────────
    if (error.response?.status === 401 && retryCount === 0) {
      config._retryCount = 1
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          localStorage.setItem('access_token', res.data.access_token)
          localStorage.setItem('refresh_token', res.data.refresh_token)
          config.headers.Authorization = `Bearer ${res.data.access_token}`
          return api(config)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }

    // ─── 5xx or network errors: Retry with backoff ────────
    const isServerError = (error.response?.status || 0) >= 500
    const isNetworkError = !error.response
    const shouldRetry = (isServerError || isNetworkError) && retryCount < MAX_RETRIES

    if (shouldRetry) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount)
      const jitterMs = Math.random() * backoffMs * 0.1

      await new Promise(resolve => setTimeout(resolve, backoffMs + jitterMs))

      config._retryCount = retryCount + 1
      config._retryTimestamp = Date.now()
      return api(config)
    }

    return Promise.reject(error)
  }
)

export default api
