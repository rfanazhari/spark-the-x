# monetize-fan

> AI-powered Twitter/X management platform for content creators and builders.

## Overview

monetize-fan is a SaaS dashboard that helps you grow and monetize your Twitter presence using AI. Connect your Twitter account, generate trending content with Claude or GPT-4o, and manage everything from one place.

## Features

- **AI Post Generator** — Generate 3 tweet options using Claude Sonnet or GPT-4o Mini based on trending topics
- **Trending Topics** — Real-time trends from Indonesia & worldwide via X API
- **Post & Manage** — Create, preview, and publish tweets directly from the dashboard
- **Post History** — View, track metrics, and delete past tweets
- **Profile Manager** — Update your Twitter profile from the dashboard
- **Secure Credentials** — All Twitter API keys encrypted with AES-256-GCM per user

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth & DB | Supabase (Magic Link + PostgreSQL) |
| Twitter SDK | twitter-api-v2 |
| AI | Anthropic Claude + OpenAI GPT-4o Mini |
| Encryption | Node.js crypto (AES-256-GCM) |

## Environment Variables

Create a `.env.local` file at the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Encryption
ENCRYPTION_KEY=   # 32-byte hex string

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

## Project Structure
```
monetize-fan/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── auth/
│   │   ├── login/page.tsx                # Magic link login
│   │   ├── callback/route.ts             # Supabase auth callback
│   │   └── logout/route.ts              # Logout handler
│   ├── setup/
│   │   └── page.tsx                      # Twitter credentials setup (3-step)
│   └── dashboard/
│       ├── layout.tsx                    # Dashboard layout + sidebar
│       ├── profile/page.tsx              # Twitter profile manager
│       ├── post/page.tsx                 # Create & publish tweets
│       ├── history/page.tsx              # Post history + metrics
│       ├── trends/page.tsx               # Trending topics
│       └── generate/page.tsx             # AI post generator
├── components/
│   ├── sidebar.tsx                       # Navigation sidebar
│   └── dashboard-header.tsx             # Per-page header
├── lib/
│   ├── auth.ts                           # getAuthUser() helper
│   ├── twitter.ts                        # getTwitterClient(userId) factory
│   ├── encryption.ts                     # AES-256-GCM encrypt/decrypt
│   └── supabase/
│       ├── client.ts                     # Browser Supabase client
│       ├── server.ts                     # Server Supabase client
│       ├── admin.ts                      # Service role client
│       └── types.ts                      # TypeScript types
├── app/api/
│   ├── twitter/
│   │   ├── profile/route.ts             # GET + PATCH profile
│   │   ├── post/route.ts                # POST tweet
│   │   ├── trends/route.ts              # GET trending topics
│   │   └── history/
│   │       ├── route.ts                 # GET tweet history
│   │       └── [id]/route.ts            # DELETE tweet
│   ├── setup/
│   │   ├── validate/route.ts            # POST validate Twitter credentials
│   │   └── save/route.ts                # POST encrypt + save credentials
│   └── ai/
│       └── generate/route.ts            # POST AI tweet generation
├── docs/
│   ├── monetize-fan.md                  # Project documentation & roadmap
│   ├── PRD-saas-transformation.md       # Product requirements document
│   ├── CHANGELOG.md                     # All notable changes
│   ├── IDENTITY.md                      # Brand identity & AI context
│   ├── revamp-ui-v1.md                  # UI revamp plan
│   └── revamp-ui-v1-report.md           # QA report (post-revamp)
├── middleware.ts                         # Route protection + setup check
├── CLAUDE.md                            # AI coding instructions
├── AGENTS.md                            # Agent definitions & workflows
├── .env.local                           # Environment variables (never commit)
└── .gitignore
```
