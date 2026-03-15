import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Not logged in -> redirect to login (except public routes)
  const publicRoutes = ['/', '/auth/login', '/auth/callback']
  if (!user && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Logged in + accessing /dashboard/* -> check if twitter account exists
  if (user && pathname.startsWith('/dashboard')) {
    const { data: twitterAccount } = await supabase
      .from('twitter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!twitterAccount) {
      return NextResponse.redirect(new URL('/setup', request.url))
    }
  }

  // Logged in + already setup + accessing /setup -> redirect to dashboard
  if (user && pathname === '/setup') {
    const { data: twitterAccount } = await supabase
      .from('twitter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (twitterAccount) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Logged in + accessing /auth/login -> redirect to dashboard
  if (user && pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
