# CLAUDE.md

> Instructions for Claude AI when working on the **monetize-fan** codebase.
> This file tells Claude how to behave, what tools to use, and how the project is structured.

---

## Project Overview

**monetize-fan** is a Next.js fullstack dashboard for automating and monetizing a Twitter/X account (`@rfanazhari`).
It uses the official X API v2 to manage profiles, create posts, track trends, and generate AI-powered content.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| Twitter SDK | twitter-api-v2 |
| AI | Claude API (`claude-sonnet-4-20250514`) |
| Runtime | Node.js 18+ |

---

## Project Structure

```
monetize-fan/
├── app/
│   ├── dashboard/
│   │   ├── profile/page.tsx       # Manage Twitter profile
│   │   ├── post/page.tsx          # Create & schedule posts
│   │   ├── trends/page.tsx        # View trending topics
│   │   └── generate/page.tsx      # AI post generator
│   └── api/
│       ├── twitter/
│       │   ├── profile/route.ts   # GET & PATCH profile
│       │   ├── post/route.ts      # POST tweet
│       │   └── trends/route.ts    # GET trends
│       └── ai/
│           └── generate/route.ts  # AI content generation
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
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=
TWITTER_BEARER_TOKEN=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
ANTHROPIC_API_KEY=
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
// Standard API route pattern
export async function GET() {
  try {
    // logic here
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

### Twitter Client
Always import from `@/lib/twitter`, never instantiate directly in route files:
```typescript
import { rwClient } from '@/lib/twitter'
```

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

---

## X API Usage Notes

- **Rate limits** apply on pay-per-use — avoid unnecessary API calls
- **Bearer Token** → read-only, app-level auth
- **OAuth 1.0a** (Consumer Key + Access Token) → read/write on behalf of `@rfanazhari`
- Trending topics endpoint: `rwClient.v1.trendsByPlace(woeid)`
  - `woeid: 1` = Worldwide
  - `woeid: 23424846` = Indonesia
- Profile update uses v1: `rwClient.v1.updateAccountProfile()`
- Tweet posting uses v2: `rwClient.v2.tweet()`

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

*Last updated: March 14, 2026*
