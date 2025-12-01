'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiLogin, apiMe } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await apiLogin(email, password)
      const { user } = await apiMe()
      if (user.role === 'admin') {
        router.replace('/admin')
      } else if (user.role === 'officer') {
        router.replace('/officer')
      } else {
        router.replace('/')
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Login failed'
      
      // Format error messages for better UX
      if (errorMessage.includes('Invalid email or password')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen w-full bg-slate-900 relative">
      {/* Background hero image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/Infrastructure.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Soft overlay */}
      <div className="absolute inset-0 bg-slate-950/40" />

      <div className="relative grid lg:grid-cols-[1fr,480px] min-h-screen">
        {/* Left content intentionally empty to focus on the login card */}
        <div className="hidden lg:block" />

        {/* Right side login card */}
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2">
              <img src="/Coat_of_Arms_Rwanda-01.png" alt="Rwanda Coat of Arms" className="mx-auto h-12 w-12 object-contain" />
              <h1 className="text-2xl font-semibold">Welcome Back</h1>
              <p className="text-sm text-slate-500">Access your dashboard</p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-9" />
                </div>
              </div>

              {/* Remember / Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(Boolean(v))} />
                  Remember me
                </label>
                <Link href="#" className="text-blue-600 hover:underline">Forgot password?</Link>
              </div>

              <Button type="submit" className="w-full h-10 text-white" disabled={loading}>
                {loading ? 'Signing in...' : (
                  <span className="inline-flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>
                )}
              </Button>
            </form>

            <div className="text-center text-xs text-slate-500">
              Need access? <Link href="#" className="text-blue-600 hover:underline">Contact administrator</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


