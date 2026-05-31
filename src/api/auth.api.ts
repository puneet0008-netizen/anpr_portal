import api from './axios'
import type { LoginPayload, LoginResponse } from '@/types'

export const login     = (d: LoginPayload) => api.post<{ data: LoginResponse }>('/auth/login', d)
export const refresh   = (refreshToken: string) => api.post<{ data: LoginResponse }>('/auth/refresh', { refreshToken })
export const logoutApi = (refreshToken: string) => api.post('/auth/logout', { refreshToken })
