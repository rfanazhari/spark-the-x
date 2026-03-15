'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  User,
  PenLine,
  AlignLeft,
  FileText,
  TrendingUp,
  Sparkles,
  Menu,
  X,
  Zap,
  LogOut,
  LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/post', label: 'Post', icon: PenLine },
  { href: '/dashboard/thread', label: 'Thread', icon: AlignLeft },
  { href: '/dashboard/posts', label: 'Posts', icon: FileText },
  { href: '/dashboard/trends', label: 'Trends', icon: TrendingUp },
  { href: '/dashboard/generate', label: 'Generate', icon: Sparkles },
]

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const displayEmail = userEmail?.trim() ?? ''

  useEffect(() => {
    if (!mobileOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileOpen])

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <Icon size={16} />
            {label}
            {isActive && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-shrink-0 md:flex-col h-screen fixed top-0 left-0 bg-sidebar border-r border-sidebar-border">
        <div className="flex h-full flex-col">
          <div className="flex items-center px-4 h-14 border-b border-sidebar-border flex-shrink-0">
            <Logo />
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <NavLinks />
          </div>
          <SidebarFooter
            userEmail={displayEmail}
            isLoggingOut={isLoggingOut}
            onLogout={() => setIsLoggingOut(true)}
          />
        </div>
      </aside>

      {/* Mobile header + drawer */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50">
        <header className="sticky top-0 z-50 border-b border-sidebar-border bg-sidebar safe-top">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo />
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="tap-target rounded-md p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-sidebar-border">
                <Logo />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="tap-target rounded-md p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pt-4 safe-bottom">
                <div className="pb-4">
                  <NavLinks />
                </div>
              </div>
              <SidebarFooter
                userEmail={displayEmail}
                isLoggingOut={isLoggingOut}
                onLogout={() => setIsLoggingOut(true)}
              />
            </aside>
          </>
        )}
      </div>
    </>
  )
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
        <Zap size={14} className="text-sidebar-primary-foreground" />
      </div>
      <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">
        monetize-fan
      </span>
    </Link>
  )
}

function SidebarFooter({
  userEmail,
  isLoggingOut,
  onLogout,
}: {
  userEmail: string
  isLoggingOut: boolean
  onLogout: () => void
}) {
  return (
    <div className="mt-auto px-3 pb-4 border-t border-sidebar-border pt-4">
      <div className="text-xs text-sidebar-foreground/50 px-3 mb-2 truncate">
        {userEmail || 'Signed in'}
      </div>
      <form action="/auth/logout" method="POST" onSubmit={onLogout}>
        <button
          type="submit"
          className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors disabled:opacity-60"
          disabled={isLoggingOut}
          aria-busy={isLoggingOut}
        >
          <LogOut size={16} />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </form>
    </div>
  )
}
