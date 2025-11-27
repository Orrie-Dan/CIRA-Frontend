'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiLogin, apiMe, apiLoginWithGoogle, apiLoginWithApple } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import Script from 'next/script'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await apiLogin(email, password)
      const { user } = await apiMe()
      if (user.role === 'admin') {
        router.push('/admin')
      } else if (user.role === 'officer') {
        router.push('/officer')
      } else {
        router.push('/')
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Login failed'
      
      // Format error messages for better UX
      if (errorMessage.includes('Invalid email or password')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (errorMessage.includes('social login')) {
        errorMessage = 'This account uses social login. Please sign in with Google or Apple.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local file.')
      return
    }

    setGoogleLoading(true)
    setError(null)
    try {
      // Load Google Sign-In script
      if (typeof window !== 'undefined' && !(window as any).gapi) {
        await loadGoogleScript()
      }

      // Initialize Google Sign-In
      await (window as any).gapi.load('auth2', async () => {
        const auth2 = (window as any).gapi.auth2.init({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        })

        const googleUser = await auth2.signIn()
        const idToken = googleUser.getAuthResponse().id_token

        await apiLoginWithGoogle(idToken)
        const { user } = await apiMe()
        if (user.role === 'admin') {
          router.push('/admin')
        } else if (user.role === 'officer') {
          router.push('/officer')
        } else {
          router.push('/')
        }
      })
    } catch (err: any) {
      setError(err.message || 'Google login failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    setAppleLoading(true)
    setError(null)
    try {
      // Apple Sign In for web uses a redirect flow
      // For now, we'll show a message that it's iOS-only
      // In production, implement Apple JS SDK
      setError('Apple Sign In is currently only available on iOS devices')
    } catch (err: any) {
      setError(err.message || 'Apple login failed')
    } finally {
      setAppleLoading(false)
    }
  }

  const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).gapi) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/platform.js'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Sign-In script'))
      document.head.appendChild(script)
    })
  }

  return (
    <>
      <Script
        src="https://apis.google.com/js/platform.js"
        strategy="lazyOnload"
        onLoad={() => {
          if (typeof window !== 'undefined') {
            (window as any).gapi?.load('auth2', () => {
              // Google Sign-In initialized
            })
          }
        }}
      />
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

              <Button type="submit" className="w-full h-10 text-white" disabled={loading || googleLoading || appleLoading}>
                {loading ? 'Signing in...' : (
                  <span className="inline-flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading || appleLoading}
              >
                {googleLoading ? (
                  'Loading...'
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleAppleLogin}
                disabled={loading || googleLoading || appleLoading}
              >
                {appleLoading ? (
                  'Loading...'
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    Apple
                  </>
                )}
              </Button>
            </div>

            <div className="text-center text-xs text-slate-500">
              Need access? <Link href="#" className="text-blue-600 hover:underline">Contact administrator</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}


