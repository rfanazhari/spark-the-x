'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { User, MapPin, LinkIcon, Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Profile {
  id: string
  name: string
  username: string
  description?: string
  location?: string
  url?: string
  created_at?: string
  profile_image_url?: string
  public_metrics?: {
    followers_count: number
    following_count: number
    tweet_count: number
  }
}

interface Toast {
  type: 'success' | 'error'
  message: string
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function visibleUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function fmtJoinDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="flex gap-6 pt-2">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    </div>
  )
}

function ProfileDisplay({ profile }: { profile: Profile }) {
  const location = profile.location?.trim()
  const url = profile.url?.trim()
  const joinDate = profile.created_at ? fmtJoinDate(profile.created_at) : ''

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        {profile.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.profile_image_url.replace('_normal', '_400x400')}
            alt={profile.name}
            className="flex-none h-16 w-16 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className="flex-none h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <User size={24} className="text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-foreground truncate">{profile.name}</p>
          <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
        </div>
      </div>

      <p
        className={`text-sm leading-relaxed break-words line-clamp-3 ${
          profile.description?.trim() ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {profile.description?.trim() ? profile.description : 'No bio added yet'}
      </p>

      {profile.public_metrics && <ProfileStats metrics={profile.public_metrics} />}
      <ProfileMetadata location={location} url={url} joinDate={joinDate} />
    </div>
  )
}

function ProfileStats({ metrics }: { metrics: NonNullable<Profile['public_metrics']> }) {
  const stats = [
    { label: 'Followers', value: fmt(metrics.followers_count) },
    { label: 'Following', value: fmt(metrics.following_count) },
    { label: 'Tweets', value: fmt(metrics.tweet_count) },
  ]

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-semibold text-foreground tabular-nums">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileMetadata({
  location,
  url,
  joinDate,
}: {
  location?: string
  url?: string
  joinDate?: string
}) {
  const hasMetadata = Boolean(location || url || joinDate)

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      {location ? (
        <div className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
          <MapPin size={14} className="flex-none" />
          <span className="flex-1 min-w-0 break-words">{location}</span>
        </div>
      ) : null}

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 min-w-0 text-sm text-primary hover:underline"
          title={url}
        >
          <LinkIcon size={14} className="flex-none" />
          <span className="flex-1 min-w-0 truncate">{visibleUrl(url)}</span>
        </a>
      ) : null}

      {joinDate ? (
        <div className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
          <Calendar size={14} className="flex-none" />
          <span className="flex-1 min-w-0 truncate">Joined {joinDate}</span>
        </div>
      ) : null}

      {!hasMetadata ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>No location, website, or join date added</span>
        </div>
      ) : null}
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-border bg-input/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors'

type ProfileFormState = {
  name: string
  description: string
  location: string
  url: string
}

export function ProfileContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [form, setForm] = useState<ProfileFormState>({
    name: '',
    description: '',
    location: '',
    url: '',
  })
  const [lastSavedForm, setLastSavedForm] = useState<ProfileFormState>({
    name: '',
    description: '',
    location: '',
    url: '',
  })
  const [saveUiState, setSaveUiState] = useState<'idle' | 'saved'>('idle')
  const saveUiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (t: Toast) => {
    setToast(t)
    setTimeout(() => setToast(null), 4000)
  }

  const isDirty = useMemo(() => {
    return (
      form.name !== lastSavedForm.name ||
      form.description !== lastSavedForm.description ||
      form.location !== lastSavedForm.location ||
      form.url !== lastSavedForm.url
    )
  }, [form, lastSavedForm])

  const hasValidationError = form.name.length > 50 || form.description.length > 160

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/twitter/profile')
      const json = await res.json()
      if (json.success) {
        setProfile(json.data)
        const nextForm: ProfileFormState = {
          name: json.data.name ?? '',
          description: json.data.description ?? '',
          location: json.data.location ?? '',
          url: json.data.url ?? '',
        }
        setForm(nextForm)
        setLastSavedForm(nextForm)
        setSaveUiState('idle')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    return () => {
      if (saveUiTimer.current) clearTimeout(saveUiTimer.current)
    }
  }, [])

  useEffect(() => {
    if (isDirty && saveUiState === 'saved') setSaveUiState('idle')
  }, [isDirty, saveUiState])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.name.length > 50 || form.description.length > 160) return
    setSubmitting(true)
    setSaveUiState('idle')
    try {
      const res = await fetch('/api/twitter/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setProfile(json.data)
        const nextSaved: ProfileFormState = {
          name: json.data.name ?? form.name,
          description: json.data.description ?? form.description,
          location: json.data.location ?? form.location,
          url: json.data.url ?? form.url,
        }
        setForm(nextSaved)
        setLastSavedForm(nextSaved)
        setSaveUiState('saved')
        if (saveUiTimer.current) clearTimeout(saveUiTimer.current)
        saveUiTimer.current = setTimeout(() => setSaveUiState('idle'), 2000)
        showToast({ type: 'success', message: 'Profile updated successfully!' })
      } else {
        showToast({ type: 'error', message: json.error ?? 'Failed to update profile.' })
      }
    } catch {
      showToast({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-container py-6 md:py-8 sticky-footer-offset sm:pb-6 md:pb-8">
      {toast && (
        <div
          className={`fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-4 right-4 sm:top-4 sm:left-auto sm:right-4 z-[60] flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all w-auto max-w-full sm:max-w-sm ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.message}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {loading ? (
          <ProfileSkeleton />
        ) : profile ? (
          <>
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Profile Preview
              </div>
              <ProfileDisplay profile={profile} />
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Edit Profile
              </div>

              <form
                id="profile-form"
                onSubmit={handleSubmit}
                className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-name" className="text-sm font-medium">
                    Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    maxLength={50}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className={`${inputClass} h-11 ${
                      form.name.length > 50
                        ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
                        : ''
                    }`}
                    placeholder="Your display name"
                  />
                  {form.name.length > 50 ? (
                    <p className="text-xs text-destructive">Name must be 50 characters or less.</p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Max 50 characters.</span>
                    <span className={`text-xs ${form.name.length > 45 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {form.name.length}/50
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-bio" className="text-sm font-medium">
                    Bio
                  </label>
                  <textarea
                    id="profile-bio"
                    maxLength={160}
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className={`${inputClass} resize-none min-h-[120px] ${
                      form.description.length > 160
                        ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
                        : ''
                    }`}
                    placeholder="Your bio"
                  />
                  {form.description.length > 160 ? (
                    <p className="text-xs text-destructive">Bio must be 160 characters or less.</p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Describe yourself in 160 characters or less.
                    </span>
                    <span
                      className={`text-xs ${
                        form.description.length > 145 ? 'text-destructive' : 'text-muted-foreground'
                      }`}
                    >
                      {form.description.length}/160
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-location" className="text-sm font-medium">
                    Location
                  </label>
                  <input
                    id="profile-location"
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className={`${inputClass} h-11`}
                    placeholder="e.g. Jakarta, Indonesia"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-website" className="text-sm font-medium">
                    Website
                  </label>
                  <input
                    id="profile-website"
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    className={`${inputClass} h-11`}
                    placeholder="https://yoursite.com"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || loading || hasValidationError || !isDirty}
                  size="lg"
                  className="hidden sm:inline-flex w-full sm:w-auto"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Saving…
                    </span>
                  ) : saveUiState === 'saved' ? (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle size={16} />
                      Saved
                    </span>
                  ) : !isDirty ? (
                    'No changes'
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Failed to load profile. Check your API credentials.</p>
        )}
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background px-4 pt-3 pb-[env(safe-area-inset-bottom,0px)]">
        <p
          className={`text-xs text-muted-foreground text-center mb-1.5 ${
            isDirty ? '' : 'hidden'
          }`}
        >
          You have unsaved changes
        </p>
        <Button
          type="submit"
          form="profile-form"
          disabled={submitting || loading || hasValidationError || !isDirty || saveUiState === 'saved'}
          size="lg"
          className="w-full h-11"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </span>
          ) : saveUiState === 'saved' ? (
            <span className="inline-flex items-center gap-2">
              <CheckCircle size={16} />
              Saved
            </span>
          ) : !isDirty ? (
            'No changes'
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}
