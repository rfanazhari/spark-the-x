'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  User,
  XCircle,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3

type Toast = {
  type: 'success' | 'error'
  message: string
}

type SetupForm = {
  consumerKey: string
  consumerSecret: string
  accessToken: string
  accessTokenSecret: string
  bearerToken: string
  clientId: string
  clientSecret: string
}

type FieldKey = keyof SetupForm

type FieldConfig = {
  key: FieldKey
  label: string
  helper: string
  required: boolean
}

type ValidateResponse =
  | {
      success: true
      username: string
      twitterUserId: string
      profileImageUrl?: string | null
    }
  | {
      success: false
      error: string
    }

type SaveResponse =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: 'consumerKey',
    label: 'Consumer Key (API Key)',
    helper: 'X Developer Portal → Project/App → Keys and tokens → API Key',
    required: true,
  },
  {
    key: 'consumerSecret',
    label: 'Consumer Secret (API Secret)',
    helper: 'X Developer Portal → Project/App → Keys and tokens → API Secret',
    required: true,
  },
  {
    key: 'accessToken',
    label: 'Access Token',
    helper: 'X Developer Portal → Project/App → Keys and tokens → Access Token',
    required: true,
  },
  {
    key: 'accessTokenSecret',
    label: 'Access Token Secret',
    helper: 'X Developer Portal → Project/App → Keys and tokens → Access Token Secret',
    required: true,
  },
  {
    key: 'bearerToken',
    label: 'Bearer Token',
    helper: 'X Developer Portal → Project/App → Keys and tokens → Bearer Token',
    required: true,
  },
  {
    key: 'clientId',
    label: 'Client ID (optional)',
    helper: 'Only needed for OAuth 2.0 user auth flows',
    required: false,
  },
  {
    key: 'clientSecret',
    label: 'Client Secret (optional)',
    helper: 'Only needed for OAuth 2.0 user auth flows',
    required: false,
  },
]

const INITIAL_FORM: SetupForm = {
  consumerKey: '',
  consumerSecret: '',
  accessToken: '',
  accessTokenSecret: '',
  bearerToken: '',
  clientId: '',
  clientSecret: '',
}

const INITIAL_VISIBILITY: Record<FieldKey, boolean> = {
  consumerKey: false,
  consumerSecret: false,
  accessToken: false,
  accessTokenSecret: false,
  bearerToken: false,
  clientId: false,
  clientSecret: false,
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<SetupForm>(INITIAL_FORM)
  const [visibility, setVisibility] = useState<Record<FieldKey, boolean>>(
    INITIAL_VISIBILITY
  )
  const [toast, setToast] = useState<Toast | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [validatedAccount, setValidatedAccount] = useState<{
    username: string
    twitterUserId: string
    profileImageUrl?: string | null
  } | null>(null)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((nextToast: Toast) => {
    setToast(nextToast)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const requiredFields = useMemo(
    () => FIELD_CONFIGS.filter((field) => field.required).map((field) => field.key),
    []
  )

  const missingRequired = useMemo(
    () => requiredFields.some((field) => !form[field].trim()),
    [form, requiredFields]
  )

  const requiredConfigs = useMemo(
    () => FIELD_CONFIGS.filter((field) => field.required),
    []
  )

  const optionalConfigs = useMemo(
    () => FIELD_CONFIGS.filter((field) => !field.required),
    []
  )

  useEffect(() => {
    if (step !== 3 || !validatedAccount) return
    const timer = setTimeout(() => router.push('/dashboard/profile'), 3000)
    return () => clearTimeout(timer)
  }, [step, validatedAccount, router])

  const handleChange = (field: FieldKey) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleVisibility = (field: FieldKey) => {
    setVisibility((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleValidate = async () => {
    if (missingRequired) {
      showToast({ type: 'error', message: 'Please fill in all required fields.' })
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch('/api/setup/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumerKey: form.consumerKey,
          consumerSecret: form.consumerSecret,
          accessToken: form.accessToken,
          accessTokenSecret: form.accessTokenSecret,
          bearerToken: form.bearerToken,
        }),
      })

      const data = (await response.json()) as ValidateResponse

      if (!response.ok || !data.success) {
        const errorMessage = data.success ? 'Invalid credentials' : data.error
        showToast({ type: 'error', message: errorMessage })
        return
      }

      setValidatedAccount({
        username: data.username,
        twitterUserId: data.twitterUserId,
        profileImageUrl: data.profileImageUrl ?? null,
      })
      setStep(2)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Validation failed'
      showToast({ type: 'error', message: msg })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    if (!validatedAccount) {
      showToast({ type: 'error', message: 'Please validate your credentials first.' })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumerKey: form.consumerKey,
          consumerSecret: form.consumerSecret,
          accessToken: form.accessToken,
          accessTokenSecret: form.accessTokenSecret,
          bearerToken: form.bearerToken,
          clientId: form.clientId || null,
          clientSecret: form.clientSecret || null,
          twitterUsername: validatedAccount.username,
          twitterUserId: validatedAccount.twitterUserId,
        }),
      })

      const data = (await response.json()) as SaveResponse

      if (!response.ok || !data.success) {
        const errorMessage = data.success ? 'Failed to save credentials' : data.error
        showToast({ type: 'error', message: errorMessage })
        return
      }

      setStep(3)
      showToast({ type: 'success', message: 'Credentials saved successfully.' })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to save credentials'
      showToast({ type: 'error', message: msg })
    } finally {
      setIsSaving(false)
    }
  }

  const summaryItems = useMemo(() => {
    return FIELD_CONFIGS.map((field) => ({
      label: field.label,
      required: field.required,
      provided: Boolean(form[field.key].trim()),
    }))
  }, [form])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-300 shadow-sm">
              <Zap size={18} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">monetize-fan</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">Twitter setup</h1>
            <p className="text-sm text-white/60">
              Securely connect your X account in just a few steps.
            </p>
          </div>
        </div>

        <StepIndicator currentStep={step} />

        <Card className="mt-6 border border-white/10 bg-[#111111]">
          <CardContent className="p-6 sm:p-8">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">Connect your Twitter account</h2>
                  <p className="text-sm text-white/60">
                    Enter your X API credentials to get started.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                      Required credentials
                    </p>
                    {requiredConfigs.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key} className="text-white">
                          {field.label} *
                        </Label>
                        <div className="relative">
                          <Input
                            id={field.key}
                            type={visibility[field.key] ? 'text' : 'password'}
                            value={form[field.key]}
                            onChange={handleChange(field.key)}
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="Required"
                            className="pr-12 bg-black/40 border-white/10 text-white focus-visible:ring-indigo-500/30"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                            onClick={() => toggleVisibility(field.key)}
                            aria-label={
                              visibility[field.key]
                                ? `Hide ${field.label}`
                                : `Show ${field.label}`
                            }
                          >
                            {visibility[field.key] ? <EyeOff size={18} /> : <Eye size={18} />}
                          </Button>
                        </div>
                        <p className="text-xs text-white/50">{field.helper}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-4 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                      Optional (OAuth 2.0)
                    </p>
                    {optionalConfigs.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key} className="text-white">
                          {field.label}
                        </Label>
                        <div className="relative">
                          <Input
                            id={field.key}
                            type={visibility[field.key] ? 'text' : 'password'}
                            value={form[field.key]}
                            onChange={handleChange(field.key)}
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="Optional"
                            className="pr-12 bg-black/40 border-white/10 text-white focus-visible:ring-indigo-500/30"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                            onClick={() => toggleVisibility(field.key)}
                            aria-label={
                              visibility[field.key]
                                ? `Hide ${field.label}`
                                : `Show ${field.label}`
                            }
                          >
                            {visibility[field.key] ? <EyeOff size={18} /> : <Eye size={18} />}
                          </Button>
                        </div>
                        <p className="text-xs text-white/50">{field.helper}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <details className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
                  <summary className="cursor-pointer list-none font-medium text-white">
                    Where do I find these?
                  </summary>
                  <div className="mt-3 space-y-2 text-xs text-white/60">
                    <p>
                      Open the X Developer Console and visit your Project/App → Keys and tokens.
                    </p>
                    <a
                      href="https://developer.twitter.com/en/portal/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-indigo-300 hover:text-indigo-200"
                    >
                      X Developer Console
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </details>

                <Button
                  type="button"
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-500"
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" />
                      Validating...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Validate Credentials
                      <ArrowRight size={16} />
                    </span>
                  )}
                </Button>
              </div>
            ) : null}

            {step === 2 && validatedAccount ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">Confirm your account</h2>
                  <p className="text-sm text-white/60">
                    We verified your credentials. Review what will be saved.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-4 flex items-center gap-4">
                  {validatedAccount.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={validatedAccount.profileImageUrl}
                      alt={validatedAccount.username}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center">
                      <User size={20} className="text-white/50" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                      <CheckCircle2 size={12} />
                      Credentials verified
                    </span>
                    <div className="text-lg font-semibold text-white">@{validatedAccount.username}</div>
                    <p className="text-xs text-white/60">
                      Twitter user ID: {validatedAccount.twitterUserId}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Summary of saved data</h3>
                  <div className="grid gap-2">
                    {summaryItems.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                      >
                        <span className="text-white/80">{item.label}</span>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            item.provided
                              ? 'text-emerald-300'
                              : item.required
                                ? 'text-rose-300'
                                : 'text-white/40'
                          )}
                        >
                          {item.provided ? 'Provided' : item.required ? 'Missing' : 'Optional'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="w-full sm:w-auto text-white hover:text-white"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    {isSaving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Save & Continue
                        <ArrowRight size={16} />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 3 && validatedAccount ? (
              <div className="relative space-y-6 text-center overflow-hidden">
                <div className="confetti" aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <span key={index} />
                  ))}
                </div>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                  <Check size={34} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-white">
                    Welcome, @{validatedAccount.username}!
                  </h2>
                  <p className="text-sm text-white/60">
                    Your Twitter account is connected and ready to use.
                  </p>
                  <p className="text-xs text-white/40">Redirecting to your dashboard in 3s...</p>
                </div>
                <Button
                  type="button"
                  className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-500"
                  onClick={() => router.push('/dashboard/profile')}
                >
                  Go to Dashboard
                  <ArrowRight size={16} />
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {toast ? (
        <div className="fixed left-4 right-4 top-4 z-[var(--z-toast)] sm:left-auto sm:right-6 sm:top-6">
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur',
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-destructive/50 bg-destructive/10 text-destructive'
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <XCircle size={16} />
            )}
            <span className="flex-1">{toast.message}</span>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .confetti span {
          position: absolute;
          width: 6px;
          height: 10px;
          background: #4f46e5;
          opacity: 0.8;
          border-radius: 2px;
          animation: confetti-fall 2.4s ease-in-out infinite;
        }
        .confetti span:nth-child(odd) {
          background: #22c55e;
        }
        .confetti span:nth-child(3n) {
          background: #f97316;
        }
        ${Array.from({ length: 12 })
          .map((_, i) => {
            const left = 8 + i * 7
            const delay = (i % 6) * 0.2
            return `.confetti span:nth-child(${i + 1}) { left: ${left}%; top: -10px; animation-delay: ${delay}s; }`
          })
          .join('\n')}
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(220px) rotate(160deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { id: 1, label: 'Input' },
    { id: 2, label: 'Confirm' },
    { id: 3, label: 'Done' },
  ] as const

  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-xs sm:text-sm">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id
        const isActive = currentStep === step.id

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold',
                isCompleted
                  ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300'
                  : isActive
                    ? 'border-indigo-400/80 bg-indigo-500/10 text-indigo-200'
                    : 'border-white/15 text-white/40'
              )}
            >
              {isCompleted ? <Check size={14} /> : step.id}
            </div>
            <span
              className={cn(
                'font-medium',
                isActive ? 'text-white' : 'text-white/50'
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span className="text-white/30">→</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
