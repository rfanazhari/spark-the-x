import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Auth check (FIRST)
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Fetch Twitter account
    const { data: accountData } = await supabase
      .from('twitter_accounts')
      .select('twitter_username')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    // Fetch profile (avatar and name)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('id', user.id)
      .maybeSingle()

    const username = accountData?.twitter_username || ''
    const profileImageUrl = profileData?.avatar_url || null
    const fullName = profileData?.full_name || null

    // Count total tweets from post history
    const { count: tweetCount } = await supabase
      .from('post_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    const totalTweets = tweetCount ?? 0

    // Count total threads (posted or partial only)
    const { count: threadCount } = await supabase
      .from('threads')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .in('status', ['posted', 'partial'])

    const totalThreads = threadCount ?? 0

    // Fetch thread quota for current month
    const month = new Date().toISOString().slice(0, 7)
    const { data: quotaData } = await supabase
      .from('thread_usage')
      .select('thread_count, limit_count')
      .eq('user_id', user.id)
      .eq('month', month)
      .maybeSingle()

    const threadUsed = quotaData?.thread_count ?? 0
    const threadLimit = quotaData?.limit_count ?? 5
    const threadRemaining = Math.max(0, threadLimit - threadUsed)

    // Calculate reset date (first day of next month)
    const now = new Date()
    const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    // Fetch 5 most recent threads (all statuses for recent activity)
    const { data: threadData } = await supabase
      .from('threads')
      .select('id, topic, status, created_at, first_tweet_url')
      .eq('user_id', user.id)
      .in('status', ['posted', 'partial', 'draft'])
      .order('created_at', { ascending: false })
      .limit(5)

    const recentActivity = (threadData ?? []).map((thread: any) => ({
      id: thread.id,
      type: 'thread' as const,
      preview: thread.topic,
      status: thread.status,
      createdAt: thread.created_at,
      url: thread.first_tweet_url || null,
    }))

    // Generate rule-based insight
    const insight = generateInsight(
      totalThreads,
      totalTweets,
      threadRemaining,
      recentActivity[0] || null,
      resetsAt
    )

    return NextResponse.json({
      success: true,
      profile: {
        username,
        profileImageUrl,
        fullName,
      },
      metrics: {
        totalTweets,
        totalThreads,
        threadQuota: {
          used: threadUsed,
          limit: threadLimit,
          remaining: threadRemaining,
          resetsAt,
        },
      },
      recentActivity,
      insight,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[Dashboard Overview]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

function generateInsight(
  totalThreads: number,
  totalTweets: number,
  remaining: number,
  mostRecentActivity: any,
  resetsAt: string
): { text: string; ctaLabel: string | null; ctaHref: string | null } {
  // Rule 1: No activity ever
  if (totalThreads === 0 && totalTweets === 0) {
    return {
      text: 'Time to start! Create your first tweet or try the Thread Creator to share your insights.',
      ctaLabel: 'Start creating',
      ctaHref: '/dashboard/post',
    }
  }

  // Rule 2: Quota exhausted
  if (remaining === 0) {
    const resetDate = new Date(resetsAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    return {
      text: `Your thread quota for this month is used up. New quota becomes available on ${resetDate}.`,
      ctaLabel: null,
      ctaHref: null,
    }
  }

  // Rule 3: Quota almost out
  if (remaining === 1) {
    return {
      text: 'You have 1 thread quota left this month. Use it wisely for your most impactful topic!',
      ctaLabel: 'Create a thread',
      ctaHref: '/dashboard/thread',
    }
  }

  // Get days since last activity
  let daysSinceActivity = Infinity
  if (mostRecentActivity) {
    const lastActivityDate = new Date(mostRecentActivity.createdAt)
    const now = new Date()
    daysSinceActivity = Math.floor(
      (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  // Rule 4: Last activity > 7 days ago
  if (daysSinceActivity > 7) {
    return {
      text: `It's been ${daysSinceActivity} days since your last post. Consistency is key to building an audience. Let's create something today!`,
      ctaLabel: 'Create content',
      ctaHref: '/dashboard/post',
    }
  }

  // Rule 5: Activity today
  if (daysSinceActivity === 0) {
    return {
      text: "Great job! You've already posted today. Keep up this consistency!",
      ctaLabel: null,
      ctaHref: null,
    }
  }

  // Rule 6: Default
  return {
    text: "Today's trending topics might inspire your next content. Check them out!",
    ctaLabel: 'View trends',
    ctaHref: '/dashboard/trends',
  }
}
