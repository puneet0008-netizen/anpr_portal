import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { useAuthStore } from '@/stores/auth.store'
import * as authApi from '@/api/auth.api'
import { toast } from 'sonner'

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

const LoginPage = () => {
  const navigate   = useNavigate()
  const login      = useAuthStore((s) => s.login)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (d: FormData) => {
    setLoading(true)
    try {
      const res = await authApi.login(d)
      const { accessToken, refreshToken, role, id } = res.data.data
      login({ id, username: d.username, role: role as 'admin' | 'vendor' | 'user' }, accessToken, refreshToken)
      toast.success('Welcome back!')
      navigate('/parking-users', { replace: true })
    } catch {
      // axios interceptor already shows the toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ANPR Portal</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your admin account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Username" error={errors.username?.message} required>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input {...register('username')} className="pl-9" placeholder="admin" autoComplete="username" />
              </div>
            </FormField>
            <FormField label="Password" error={errors.password?.message} required>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="pl-9 pr-9"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPw((p) => !p)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          ANPR Parking Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

export default LoginPage
