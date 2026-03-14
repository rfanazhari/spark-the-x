import { createClient } from '@/lib/supabase/server'

interface DashboardHeaderProps {
  title: string
  subtitle?: string
}

function resolveSubtitle(subtitle: string | undefined, username: string) {
  if (!subtitle) return null
  return subtitle
    .replace('@{username}', `@${username}`)
    .replace('{username}', username)
}

export async function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let username = 'me'

  if (user?.id) {
    const { data } = await supabase
      .from('twitter_accounts')
      .select('twitter_username')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data?.twitter_username) {
      username = data.twitter_username
    }
  }

  const resolvedSubtitle = resolveSubtitle(subtitle, username)

  return (
    <div className="border-b border-white/5 bg-[#0f0f0f]/70 backdrop-blur">
      <div className="app-container py-6 md:py-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground">{title}</h1>
          {resolvedSubtitle ? (
            <p className="text-sm text-muted-foreground">{resolvedSubtitle}</p>
          ) : null}
        </div>
        <div className="hidden sm:inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
          Connected as @{username}
        </div>
      </div>
    </div>
  )
}
