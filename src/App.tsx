import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './routes'
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth.store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  1000 * 60 * 2,   // 2 min
      retry:      1,
      refetchOnWindowFocus: false,
    },
  },
})

const AuthLogoutListener = () => {
  const logout = useAuthStore((s) => s.logout)
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])
  return null
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthLogoutListener />
    <RouterProvider router={router} />
    <Toaster position="top-right" richColors closeButton />
  </QueryClientProvider>
)

export default App
