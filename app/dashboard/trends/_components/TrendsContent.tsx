'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, ArrowUpRight, Globe, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Trend {
  name: string
  tweetVolume: number
  url: string
}

type Location = 'worldwide' | 'indonesia'

function fmtVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function TrendSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3 animate-pulse">
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-3 w-1/3 rounded bg-muted" />
      <div className="h-7 w-28 rounded-lg bg-muted mt-4" />
    </div>
  )
}

function TrendCard({ trend, onUse }: { trend: Trend; onUse: (t: Trend) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3 hover:border-border/80 transition-colors">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug break-words min-w-0">{trend.name}</p>
        <a
          href={trend.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="View on X"
        >
          <ArrowUpRight size={14} />
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{fmtVolume(trend.tweetVolume)}</span> tweets
      </p>
      <Button
        variant="outline"
        className="mt-auto w-full sm:w-fit"
        onClick={() => onUse(trend)}
      >
        Use This Trend
      </Button>
    </div>
  )
}

export function TrendsContent() {
  const router = useRouter()
  const [location, setLocation] = useState<Location>('worldwide')
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrends = useCallback(async (loc: Location) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/twitter/trends?location=${loc}`)
      const json = await res.json()
      if (json.success) {
        setTrends(json.data)
      } else {
        setError(json.error ?? 'Failed to fetch trends.')
        setTrends([])
      }
    } catch {
      setError('Network error. Please try again.')
      setTrends([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrends(location)
  }, [location, fetchTrends])

  function handleUseTrend(trend: Trend) {
    const params = new URLSearchParams({
      trend: trend.name,
      volume: String(trend.tweetVolume),
    })
    router.push(`/dashboard/generate?${params.toString()}`)
  }

  return (
    <div className="app-container py-6 md:py-8">
      <div className="max-w-4xl space-y-3">
        <p className="text-muted-foreground text-sm">
          Discover trending topics on Twitter/X and generate content around them.
        </p>

        <div className="flex flex-wrap items-center rounded-lg border border-border bg-muted/30 p-1 gap-1 w-full sm:w-fit">
          <button
            onClick={() => setLocation('worldwide')}
            className={`flex flex-1 items-center justify-center h-9 min-h-0 gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
              location === 'worldwide'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe size={13} />
            Worldwide
          </button>
          <button
            onClick={() => setLocation('indonesia')}
            className={`flex flex-1 items-center justify-center h-9 min-h-0 gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
              location === 'indonesia'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin size={13} />
            Indonesia
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <TrendSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive mt-6">
          {error}
        </div>
      ) : trends.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center mt-6">
          <TrendingUp size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No trends available</p>
          <p className="text-xs text-muted-foreground mt-1">
            No trending topics with sufficient volume found for this location.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {trends.map((trend) => (
            <TrendCard key={trend.name} trend={trend} onUse={handleUseTrend} />
          ))}
        </div>
      )}
    </div>
  )
}
