import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
  user:  AuthUser | null
  token: string | null
  login:  (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:  null,
      token: null,
      login: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken',  accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ user, token: accessToken })
      },
      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, token: null })
      },
    }),
    { name: 'anpr-auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)
