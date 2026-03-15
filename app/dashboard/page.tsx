'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  PenLine,
  AlignLeft,
  Sparkles,
  Zap,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DashboardData {
  success: boolean
  profile: {
    username: string
    profileImageUrl: string | null
  }
  metrics: {
    totalTweets: number
    totalThreads: number
    threadQuota: {
      used: number
      limit: number
      remaining: number
      resetsAt: string
    }
  }
  recentActivity: {
    id: string
    type: 'post' | 'thread'
    preview: string
    status: string
    createdAt: string
    url: string | null
  }[]
  insight: {
    text: string
    ctaLabel: string | null
    ctaHref: string | null
  }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(username: string): string {
  return username
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMonthYear(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/dashboard/overview')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Dashboard fetch failed')
        }
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  return (
    <div className="app-container py-6 md:py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
              <div className="h-5 w-96 bg-muted rounded animate-pulse" />
            </div>
          ) : data ? (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {data.profile.profileImageUrl ? (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10">
                    <Image
                      src={data.profile.profileImageUrl}
                      alt={data.profile.username}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {getInitials(data.profile.username)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {getGreeting()}, @{data.profile.username}!
                </h1>
                <p className="text-muted-foreground">
                  Here's your overview for {formatMonthYear(new Date().toISOString())}
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : null}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-white/5 bg-white/5">
                  <CardHeader className="pb-3">
                    <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 w-16 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : data ? (
            <>
              {/* Tweets Card */}
              <Card className="border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tweets Posted
                  </CardTitle>
                  <PenLine className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {data.metrics.totalTweets}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </CardContent>
              </Card>

              {/* Threads Card */}
              <Card className="border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Threads Created
                  </CardTitle>
                  <AlignLeft className="h-5 w-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {data.metrics.totalThreads}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </CardContent>
              </Card>

              {/* Quota Card */}
              <Card
                className={cn(
                  'border-white/5 hover:bg-white/10 transition-colors',
                  data.metrics.threadQuota.remaining > 1
                    ? 'bg-white/5'
                    : data.metrics.threadQuota.remaining === 1
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Threads This Month
                  </CardTitle>
                  <Zap
                    className={cn(
                      'h-5 w-5',
                      data.metrics.threadQuota.remaining > 1
                        ? 'text-yellow-500'
                        : data.metrics.threadQuota.remaining === 1
                          ? 'text-amber-500'
                          : 'text-red-500'
                    )}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {data.metrics.threadQuota.used} /{' '}
                    {data.metrics.threadQuota.limit}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Resets {formatDate(data.metrics.threadQuota.resetsAt)}
                  </p>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            asChild
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Link href="/dashboard/post">
              <PenLine className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full border-white/10"
          >
            <Link href="/dashboard/thread">
              <AlignLeft className="mr-2 h-4 w-4" />
              Create Thread
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full border-white/10"
          >
            <Link href="/dashboard/generate">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </Link>
          </Button>
        </div>

        {/* Recent Activity */}
        {isLoading ? (
          <Card className="border-white/5 bg-white/5">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </CardContent>
          </Card>
        ) : data && data.recentActivity.length > 0 ? (
          <Card className="border-white/5 bg-white/5">
            <CardHeader>
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your last 5 posts and threads
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    href={item.url || '#'}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors group"
                  >
                    <Badge
                      variant={item.type === 'thread' ? 'default' : 'secondary'}
                      className={cn(
                        'flex-shrink-0',
                        item.type === 'thread'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      )}
                    >
                      {item.type === 'thread' ? 'Thread' : 'Post'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-white/80">
                        {item.preview}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'flex-shrink-0 border-white/10',
                        item.status === 'posted'
                          ? 'bg-green-500/10 text-green-300 border-green-500/20'
                          : item.status === 'partial'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : item.status === 'failed'
                              ? 'bg-red-500/10 text-red-300 border-red-500/20'
                              : 'bg-gray-500/10 text-gray-300 border-gray-500/20'
                      )}
                    >
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : data ? (
          <Card className="border-white/5 bg-white/5">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  Belum ada aktivitas. Mulai posting sekarang!
                </p>
                <Button asChild variant="outline" className="border-white/10">
                  <Link href="/dashboard/post">
                    <PenLine className="mr-2 h-4 w-4" />
                    Create Post
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* AI Insight Card */}
        {isLoading ? (
          <Card className="border-white/5 bg-white/5">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ) : data ? (
          <Card className="border-white/5 bg-blue-500/10 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Lightbulb className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{data.insight.text}</p>
                  {data.insight.ctaLabel && data.insight.ctaHref && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="mt-3 h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                    >
                      <Link href={data.insight.ctaHref}>
                        {data.insight.ctaLabel}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
