# CLAUDE.md

> Instructions for Claude AI when working on the **monetize-fan** codebase.
> This file tells Claude how to behave, what tools to use, and how the project is structured.

---

## Project Overview

**monetize-fan** is a Next.js SaaS dashboard for automating and monetizing Twitter/X accounts.
It supports multi-user onboarding with Supabase Auth, per-user encrypted credentials, and AI-powered content workflows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| Twitter SDK | twitter-api-v2 |
| AI | Claude API (`claude-sonnet-4-20250514`) + OpenAI GPT-4o Mini |
| Runtime | Node.js 18+ |

---

## Project Structure

```
monetize-fan/
├── app/
│   ├── dashboard/
│   │   ├── profile/page.tsx       # Manage Twitter profile
│   │   ├── post/page.tsx          # Create & schedule posts
│   │   ├── thread/page.tsx        # AI Thread Creator
│   │   ├── trends/page.tsx        # View trending topics
│   │   └── generate/page.tsx      # AI post generator
│   └── api/
│       ├── twitter/
│       │   ├── profile/route.ts   # GET & PATCH profile
│       │   ├── post/route.ts      # POST tweet
│       │   ├── thread/route.ts    # POST thread
│       │   └── trends/route.ts    # GET trends
│       ├── ai/
│           ├── generate/route.ts  # AI content generation
│           └── thread/route.ts    # AI thread generation
│       └── thread/
│           └── usage/route.ts     # GET thread usage + quota
├── lib/
│   └── twitter.ts                 # Twitter client singleton
├── components/                    # Shared UI components
├── CLAUDE.md                      # This file
├── AGENTS.md                      # Agent task definitions
└── .env.local                     # API keys (never commit)
```

---

## Environment Variables

Always read from `.env.local`. Never expose to client-side code.

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Encryption
ENCRYPTION_KEY=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## Coding Conventions

### General
- Always use **TypeScript** with strict types — no `any` unless absolutely necessary
- Use **async/await** over `.then()` chains
- All API routes must have **try/catch** with proper error responses
- All async UI actions must show **loading states**
- Mobile responsive by default

### API Routes
```typescript
// Standard API route pattern (auth required)
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // logic here (use user.id)
    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

### Twitter Client
Always import from `@/lib/twitter`, never instantiate directly in route files:
```typescript
import { getTwitterClient } from '@/lib/twitter'
```
Use `getTwitterClient(userId)` for read/write and `getTwitterBearerClient(userId)` for bearer-only calls.

### Components
- Use **shadcn/ui** components first before building custom ones
- Dark mode is default — use CSS variables, not hardcoded colors
- Keep components small and focused (single responsibility)

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/twitter/profile` | Fetch current profile |
| PATCH | `/api/twitter/profile` | Update profile fields |
| POST | `/api/twitter/post` | Create a tweet |
| GET | `/api/twitter/trends` | Get trending topics |
| POST | `/api/ai/generate` | Generate tweet options via Claude |
| GET | `/api/thread/usage` | Fetch monthly thread usage + quota |
| POST | `/api/ai/thread` | Generate thread via AI |
| POST | `/api/twitter/thread` | Post thread as reply chain |

---

## X API Usage Notes

- **Rate limits** apply on pay-per-use — avoid unnecessary API calls
- **Bearer Token** → read-only, app-level auth
- **OAuth 1.0a** (Consumer Key + Access Token) → read/write on behalf of `@rfanazhari`
- Trending topics endpoint: `getTwitterClient(userId).v1.trendsByPlace(woeid)`
  - `woeid: 1` = Worldwide
  - `woeid: 23424846` = Indonesia
- Profile update uses v1: `client.v1.updateAccountProfile()`
- Tweet posting uses v2: `client.v2.tweet()`

---

## What Claude Should NOT Do

- Never commit or log API keys/secrets
- Never expose Twitter credentials to client-side components
- Never use `any` type without a comment explaining why
- Never skip error handling in API routes
- Never make API calls directly from React components — always go through `/api/` routes
- Never add unnecessary dependencies — check if shadcn/ui or built-ins cover it first

---

## When Making Changes

1. Check `AGENTS.md` for the task being worked on
2. Follow existing file/folder structure
3. Add loading + error states to any new async feature
4. Update `monetize-fan.md` if a new feature is completed
5. Keep components under 200 lines — split if larger

---

*Last updated: March 15, 2026*
