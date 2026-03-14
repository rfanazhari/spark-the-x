'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'loading' | 'success' | 'error'

const RESEND_SECONDS = 60

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const sendMagicLink = async (mode: 'send' | 'resend') => {
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.')
      setStatus('error')
      return
    }

    if (mode === 'send') {
      setStatus('loading')
    } else {
      setIsResending(true)
    }

    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      setIsResending(false)
      return
    }

    setStatus('success')
    setResendCooldown(RESEND_SECONDS)
    setIsResending(false)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await sendMagicLink('send')
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return
    await sendMagicLink('resend')
  }

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="text-xs font-medium text-white/70 hover:text-white">
          ← Back to home
        </Link>

        <Card className="border border-white/10 bg-[#111111] shadow-xl focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/30">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-300">
                <Zap size={20} />
              </div>
              <h1 className="mt-4 text-2xl font-heading text-white">Magic Link Login</h1>
              <p className="mt-2 text-sm text-white/60">
                Sign in instantly and continue managing your Twitter presence.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm text-white">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/30',
                    status === 'error' &&
                      'border-destructive/70 focus-visible:ring-destructive/30'
                  )}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 text-white hover:bg-indigo-500"
                disabled={isLoading || isSuccess}
              >
                {isLoading ? 'Sending magic link...' : 'Send Magic Link'}
              </Button>
            </form>

            <div className="mt-4 space-y-3" aria-live="polite">
              {isSuccess && (
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-4 text-sm text-white">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 text-indigo-300" />
                    <div className="space-y-2">
                      <p className="font-medium">Check your inbox</p>
                      <p className="text-white/70">
                        We sent a magic link to <span className="text-white">{email}</span>.
                        Click the link to sign in.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                        <span>Didn&apos;t receive it?</span>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3 text-xs border-white/20 text-white hover:bg-white/10"
                          onClick={handleResend}
                          disabled={resendCooldown > 0 || isResending}
                        >
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : isResending
                              ? 'Resending...'
                              : 'Resend'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {status === 'error' && errorMessage && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
