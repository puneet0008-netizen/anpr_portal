import axios, { type AxiosError } from 'axios'
import { toast } from 'sonner'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

const drain = (err: unknown, token?: string) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)))
  queue = []
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then((t) => { original.headers!.Authorization = `Bearer ${t}`; return api(original) })
      }
      original._retry = true
      isRefreshing     = true
      const rt = localStorage.getItem('refreshToken')
      if (!rt) { isRefreshing = false; window.dispatchEvent(new Event('auth:logout')); return Promise.reject(error) }
      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: rt })
        localStorage.setItem('accessToken',  data.data.accessToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        drain(null, data.data.accessToken)
        original.headers!.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch (e) {
        drain(e)
        localStorage.clear()
        window.dispatchEvent(new Event('auth:logout'))
        return Promise.reject(e)
      } finally { isRefreshing = false }
    }

    const msg = (error.response?.data as { message?: string })?.message ?? 'Something went wrong'
    const silent = (original as typeof original & { silent?: boolean })?.silent
    if (error.response?.status !== 401 && !silent) toast.error(msg)
    return Promise.reject(error)
  }
)

export default api
