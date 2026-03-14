import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userEmail = user?.email ?? null

  return (
    <div className="bg-background overflow-x-hidden">
      <Sidebar userEmail={userEmail} />
      <div className="flex min-h-[100dvh] md:h-[100dvh]">
        {/* Desktop spacer — pushes content right of sidebar */}
        <div className="hidden md:block md:w-56 md:flex-shrink-0" />
        <main className="flex-1 min-w-0 w-full pt-14 md:pt-0 md:overflow-y-auto md:overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  )
}
