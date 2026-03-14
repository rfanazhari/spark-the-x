# Changelog

## [Unreleased] — March 14, 2026

### Added
- `/dashboard/history` — Post History page with tweet cards, metrics, pagination
- `GET /api/twitter/history` — Fetch user timeline with media and metrics
- `DELETE /api/twitter/history/[id]` — Delete tweet by ID
- History nav item in sidebar (between Post and Trends)

## [Phase A] — March 14, 2026 — Supabase Setup

### Added
- @supabase/supabase-js and @supabase/ssr dependencies
- lib/supabase/client.ts — browser Supabase client
- lib/supabase/server.ts — server Supabase client (cookie-based)
- lib/supabase/admin.ts — service role client (server only)
- lib/supabase/types.ts — TypeScript types for Profile and TwitterAccount
- lib/encryption.ts — AES-256-GCM encrypt/decrypt utility
- Supabase DB schema: profiles + twitter_accounts tables
- RLS policies for both tables
- Auto-create profile trigger on user signup

### Changed
- .env.local — added Supabase + Encryption vars, removed Twitter vars

### Notes
- ENCRYPTION_KEY must be 32-byte hex string
- SUPABASE_SERVICE_ROLE_KEY must never be exposed to client
- twitter_accounts credentials stored encrypted, decrypted server-side only

## [Phase B] — March 14, 2026 — Auth Flow

### Added
- middleware.ts — route protection, setup check, auth redirects
- app/auth/callback/route.ts — Supabase magic link callback handler
- app/auth/login/page.tsx — Magic Link login page
- app/auth/logout/route.ts — logout handler
- app/page.tsx — landing page with CTA
- Logout button + user email in sidebar

### Changed
- components/sidebar.tsx — added logout button and user email display

### Notes
- Magic Link must be enabled in Supabase Dashboard
- Redirect URL must be configured in Supabase URL Configuration
- /dashboard/* routes require both auth AND twitter_accounts setup

## [Phase C] — March 14, 2026 — Setup Page

### Added
- app/setup/page.tsx — 3-step Twitter credentials setup flow
- app/api/setup/validate/route.ts — validate credentials via test API call
- app/api/setup/save/route.ts — encrypt and save credentials to DB
- lib/twitter.ts — replaced singleton with getTwitterClient(userId) factory

### Changed
- lib/twitter.ts — now reads credentials from DB per user, not from .env

### Notes
- Credentials validated before saving (test API call to v2.me())
- All credential fields encrypted with AES-256-GCM before insert
- Client ID and Client Secret are optional fields
- On successful setup, user redirected to /dashboard/profile

## [Phase D] — March 14, 2026 — Refactor API Routes

### Added
- lib/auth.ts — getAuthUser() helper
- lib/twitter.ts — getTwitterClient(userId) and getTwitterUsername(userId)

### Changed
- app/api/twitter/profile/route.ts — uses getTwitterClient(userId)
- app/api/twitter/post/route.ts — uses getTwitterClient(userId)
- app/api/twitter/trends/route.ts — uses getTwitterClient(userId)
- app/api/twitter/history/route.ts — uses getTwitterClient(userId)
- app/api/twitter/history/[id]/route.ts — uses getTwitterClient(userId)
- app/api/ai/generate/route.ts — added auth check

### Removed
- Old singleton rwClient from lib/twitter.ts
- All TWITTER_* env var references from API routes

### Notes
- All routes return 401 if no session
- getTwitterClient() throws if twitter_accounts not found for user
- twitter_username fetched from DB via getTwitterUsername()

## [Phase E] — March 14, 2026 — Landing Page + Final Polish

### Added
- app/page.tsx — landing page (hero, features, how it works, CTA, footer)
- components/dashboard-header.tsx — per-page header with connected account badge

### Changed
- app/auth/login/page.tsx — polished design, resend timer, success state
- app/setup/page.tsx — progress steps, help section, auto-redirect on done
- All dashboard pages — use DashboardHeader component
- docs/monetize-fan.md — updated milestones
- docs/CLAUDE.md — updated for SaaS architecture
- docs/AGENTS.md — updated agent auth requirements

### Notes
- Landing page is dark mode only, no toggle
- Setup step 3 auto-redirects to /dashboard/profile after 3s
- DashboardHeader fetches twitter_username server-side

### Fixed
- app/auth/callback/route.ts — added profile upsert as fallback after session exchange
