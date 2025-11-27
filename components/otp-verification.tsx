"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiVerifyOTP, apiSendOTP } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

interface OTPVerificationProps {
  email?: string
  phone?: string
  onVerified?: () => void
}

export function OTPVerification({ email, phone, onVerified }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const router = useRouter()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Auto-focus first input
    inputRefs.current[0]?.focus()
  }, [])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('')
      const newOtp = [...otp]
      pastedOtp.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newOtp[index + i] = char
        }
      })
      setOtp(newOtp)
      // Focus last filled input
      const lastFilledIndex = Math.min(index + pastedOtp.length - 1, 5)
      inputRefs.current[lastFilledIndex]?.focus()
      return
    }

    if (!/^\d*$/.test(value)) return // Only allow digits

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the complete 6-digit code',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      await apiVerifyOTP({
        code,
        email,
        phone,
      })

      toast({
        title: 'Success',
        description: 'Account verified successfully',
      })

      if (onVerified) {
        onVerified()
      } else {
        router.push('/')
      }
    } catch (err: any) {
      toast({
        title: 'Verification Failed',
        description: err.message || 'Invalid or expired code. Please try again.',
        variant: 'destructive',
      })
      // Clear OTP on error
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)

    try {
      await apiSendOTP({
        email,
        phone,
      })
      toast({
        title: 'Code Sent',
        description: 'Verification code resent successfully',
      })
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to resend code. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setResending(false)
    }
  }

  const identifier = email || phone || 'your email/phone'

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Verify Your Account</h2>
        <p className="text-sm text-slate-500">
          Enter the 6-digit code sent to <br />
          <span className="font-medium">{identifier}</span>
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        {otp.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-12 text-center text-xl font-semibold"
            autoFocus={index === 0}
          />
        ))}
      </div>

      <Button
        onClick={handleVerify}
        disabled={loading || otp.join('').length !== 6}
        className="w-full"
      >
        {loading ? 'Verifying...' : 'Verify'}
      </Button>

      <div className="text-center space-y-2">
        <p className="text-sm text-slate-500">Didn't receive the code?</p>
        <Button
          variant="ghost"
          onClick={handleResend}
          disabled={resending || loading}
          className="text-sm"
        >
          {resending ? 'Sending...' : 'Resend Code'}
        </Button>
      </div>
    </div>
  )
}





