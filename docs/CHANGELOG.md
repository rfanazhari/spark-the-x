# Changelog

## [Posts Page Fixes] — March 15, 2026

### Fixed
- Standalone post metrics now display correctly in timeline (fixed type mismatch: publicMetrics)
- Thread group card now shows hook tweet preview in collapsed state for context
- Standalone post cards now show "Post" badge for visual consistency with threads

## [Thread Timeline Feature] — March 15, 2026

### Added
- `GET /api/posts/timeline` — New merged timeline endpoint that combines standalone tweets and thread groups
  - Fetches tweets from X API
  - Fetches posted/partial threads from database
  - Returns TimelineItem[] sorted chronologically by posted_at
  - Each thread includes all posted tweets with type (hook/body/cta) and metrics
- `ThreadGroupCard` component (app/dashboard/posts/_components/ThreadGroupCard.tsx) — Renders grouped threads with:
  - Collapsed state (default): displays topic, tweet count, model, date, and "View on X" link
  - Expanded state: shows first 3 tweets with type badges, metrics, and vertical connector line
  - "Show X more tweets" button to expand remaining tweets inline
  - "Show less" button to collapse back to first 3
  - Client-side expand/collapse with no additional API calls

### Changed
- `app/dashboard/posts/_components/PostsContent.tsx`
  - Now fetches from `/api/posts/timeline` instead of `/api/twitter/posts`
  - Renders mixed timeline of posts and threads in chronological order
  - Uses TimelineItem[] state instead of TimelineTweet[]
  - PostCard rendering remains unchanged for standalone tweets
  - Added ThreadGroupCard import and conditional rendering
- `PostsSkeletonGrid` — Updated skeleton loader to alternate between post and thread skeleton states for more accurate loading UI

## [Fixes] — March 15, 2026

### Fixed
- Sidebar logo now redirects to /dashboard (was /dashboard/profile)
- Profiles table now populated with avatar_url and full_name during setup save
- Dashboard overview now displays correct username and avatar from profiles table

## [Dashboard Overview Phase 2] — March 15, 2026

### Added
- app/dashboard/page.tsx — Dashboard Overview page with sections:
  - Header: avatar (with initials fallback), greeting based on time, username, month/year subtitle
  - 3 metric cards: total tweets, total threads, thread quota with color variants
  - 3 quick action buttons: Create Post, Create Thread, Generate with AI
  - Recent activity section: 5 most recent items with type/status badges
  - AI insight card: rule-based insight with optional CTA
  - Loading skeleton state for all sections
  - Mobile responsive layout (cards & buttons stack vertically)

### Changed
- components/sidebar.tsx — Dashboard nav item added as first item (LayoutDashboard icon)
  - Final nav order: Dashboard, Profile, Post, Thread, Posts, Trends, Generate
- app/auth/callback/route.ts — redirect to /dashboard after login (was /dashboard/profile)
- proxy.ts — updated default redirects to /dashboard (was /dashboard/profile)

## [Dashboard Overview Phase 1] — March 15, 2026

### Added
- app/api/dashboard/overview/route.ts — GET endpoint aggregating all dashboard data in single response
  - Fetches Twitter profile (username, profile image)
  - Counts total tweets and threads posted
  - Returns monthly thread quota with reset date
  - Provides 5 most recent threads (all statuses)
  - Generates rule-based insight with optional CTA

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

## [Thread Phase 1] — March 15, 2026 — DB Setup

### Added
- threads table — thread session metadata per user
- thread_tweets table — tweet items per thread with post status
- thread_usage table — monthly usage counter per user (limit: 5/month)
- RLS policies for all 3 new tables
- TypeScript types: Thread, ThreadTweet, ThreadUsage in lib/supabase/types.ts

## [Thread Phase 2] — March 15, 2026 — Backend

### Added
- app/api/thread/usage/route.ts — GET monthly usage + quota info
- app/api/ai/thread/route.ts — POST generate thread via Claude or GPT-4o Mini
- app/api/twitter/thread/route.ts — POST thread via X API reply chain

### Notes
- Usage only increments on successful generation, not on failure or regenerate
- Server-side numbering recalculation after AI response
- 500ms delay between tweets to avoid X API rate limiting
- Partial post returns HTTP 207 with per-tweet status

## [Thread Phase 3] — March 15, 2026 — Frontend

### Added
- app/dashboard/thread/page.tsx — Thread Creator page
  - Quota banner with monthly usage tracking
  - Topic input: manual + from trends
  - AI model selector (Claude / GPT-4o Mini)
  - Preview section with editable tweet cards + connector lines
  - Post progress with per-tweet status
  - Success / partial failure result states

## [Thread Phase 4] — March 15, 2026 — Landing Page Update

### Changed
- app/page.tsx — features section updated to 4 cards (added AI thread creator)
- app/page.tsx — How it works updated from 3 to 4 steps
- app/page.tsx — new Thread social proof section added between features and How it works

### Notes
- Thread Creator card has no badge or highlight — equal with other feature cards
- Social proof section is static mockup only, not interactive

## [Thread Phase 5] — March 15, 2026 — Polish

### Added
- Thread nav item in sidebar (between Post and History)
- Agent 6 (Thread Generator) and Agent 7 (Thread Publisher) in AGENTS.md

### Changed
- components/sidebar.tsx — added Thread nav item
- docs/monetize-fan.md — Thread Creator marked as done, V2 items added to Phase 2
- docs/CLAUDE.md — updated API endpoints table and project structure
- docs/AGENTS.md — added Agent 6 and Agent 7

### Fixed
- Mobile responsive QA pass on /dashboard/thread
  (320px, 375px, 390px, 768px, 1024px, 1280px)

## [Thread History Phase 1] — March 15, 2026

### Added
- app/api/thread/history/route.ts
- app/api/thread/history/[id]/route.ts

## [Thread History Phase 2] — March 15, 2026 — Frontend

### Added
- app/dashboard/thread/_components/ThreadContent.tsx — Thread History table with pagination
- components/thread-detail-modal.tsx — Detail modal showing full thread content + tweet list
- components/ui/dialog.tsx — Dialog component from @base-ui/react/dialog

### Changed
- app/dashboard/thread/page.tsx — integrated Thread History section and detail modal

### Fixed
- components/thread-detail-modal.tsx — fixed incorrect shadcn/ui AlertDialog import, replaced with Dialog
- app/api/thread/history/[id]/route.ts — fixed params.id sync access, now properly awaited for Next.js 16 compatibility
