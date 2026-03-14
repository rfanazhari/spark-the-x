# monetize-fan — Project Documentation

> Twitter/X account automation tool for content monetization

---

## ✅ What's Been Done

### 1. X Developer Account Setup
- Created project **"lacigua"** di X Developer Console
- Model: **Pay-Per-Use** (no monthly subscription)
- App name: **monetize-fan** (Production environment)

### 2. Credentials Generated
| Credential | Status |
|---|---|
| Consumer Key | ✅ Generated |
| Consumer Secret | ✅ Generated |
| Bearer Token | ✅ Generated |
| Access Token (`@rfanazhari`) | ✅ Generated — Read & Write |
| Access Token Secret | ✅ Generated |
| Client ID (OAuth 2.0) | ✅ Generated |
| Client Secret | ✅ Generated |

### 3. OAuth & App Permissions
- OAuth 1.0 Keys: ✅ Configured
- OAuth 2.0 Keys: ✅ Configured
- User Authentication Settings: ✅ Set up
- Permission level: **Read and Write**

### 4. Vibe Coding Prompt
- Full Next.js fullstack prompt generated (see below)
- Tech stack: Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, twitter-api-v2

---

## 🏗️ Current Phase — Phase 1: Core Features

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Twitter SDK**: twitter-api-v2 (npm)
- **AI**: Claude API (claude-sonnet-4-20250514)

### Features in This Phase
| Feature | Route | Status |
|---|---|---|
| Manage Profile | `/dashboard/profile` | 🔨 In Progress |
| Create Post | `/dashboard/post` | 🔨 In Progress |
| Trending Topics | `/dashboard/trends` | 🔨 In Progress |
| AI Post Generator | `/dashboard/generate` | 🔨 In Progress |

---

## 🗺️ Next Phases

### Phase 2 — Scheduling & Automation
- [ ] Post scheduler (queue system)
- [ ] Auto-post based on trending topics (cron job)
- [ ] Bulk post queue management
- [ ] Best time to post analytics

### Phase 3 — Analytics & Insights
- [ ] Tweet performance dashboard (impressions, likes, reposts, replies)
- [ ] Follower growth tracking
- [ ] Top performing content analysis
- [ ] Engagement rate monitoring

### Phase 4 — Monetization Features
- [ ] Niche audience targeting via trend filters
- [ ] Affiliate link auto-insertion in posts
- [ ] Sponsored post management
- [ ] Revenue tracking dashboard

### Phase 5 — Multi-Account & Scale
- [ ] Support multiple Twitter accounts
- [ ] Team collaboration (multi-user)
- [ ] Role-based access control
- [ ] API usage & billing monitor

---

## 🎯 Goals

### Short Term
- Automate daily posting for `@rfanazhari`
- Post content relevant to trending topics in Indonesia & worldwide
- Grow followers organically through consistent, trend-relevant content

### Long Term
- Monetize through affiliate marketing, sponsored posts, and digital products
- Scale to manage multiple niche accounts
- Build a SaaS product from this tool for other creators

---

## 📁 Project Structure (Target)

```
monetize-fan/
├── app/
│   ├── dashboard/
│   │   ├── profile/page.tsx
│   │   ├── post/page.tsx
│   │   ├── trends/page.tsx
│   │   └── generate/page.tsx
│   └── api/
│       ├── twitter/
│       │   ├── profile/route.ts
│       │   ├── post/route.ts
│       │   └── trends/route.ts
│       └── ai/
│           └── generate/route.ts
├── lib/
│   └── twitter.ts
└── .env.local
```

---

## 🤖 Vibe Coding Prompt (Next.js)

```
Build a Next.js fullstack app called "monetize-fan" for managing a Twitter/X account via the official X API v2.

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- twitter-api-v2 (npm package)
- shadcn/ui for components

## Environment Variables (.env.local)
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=
TWITTER_BEARER_TOKEN=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

## Features to Build

### 1. Manage Profile (`/dashboard/profile`)
- Display current profile: name, username, bio, location, website, profile picture, follower/following count
- Edit form: update name, bio, location, website
- PATCH /api/twitter/profile endpoint using rwClient.v1.updateAccountProfile()
- GET /api/twitter/profile using rwClient.v2.me() with user.fields

### 2. Create Post (`/dashboard/post`)
- Text area for tweet content (280 char counter)
- Support media upload (image)
- Schedule post option (datetime picker)
- POST /api/twitter/post endpoint using rwClient.v2.tweet()
- Post history list

### 3. Trending Topics (`/dashboard/trends`)
- Fetch trending topics (woeid: 1 = worldwide, 23424846 = Indonesia)
- Display as clickable cards with tweet count
- GET /api/twitter/trends endpoint using rwClient.v1.trendsByPlace()

### 4. AI-Powered Post Generator (`/dashboard/generate`)
- User clicks a trending topic
- App calls Claude API (claude-sonnet-4-20250514) to generate 3 tweet options related to that trend
- User picks one and posts directly
- POST /api/ai/generate endpoint

## Twitter API Setup (lib/twitter.ts)
Use twitter-api-v2 package:
- twitterClient = new TwitterApi({ appKey, appSecret, accessToken, accessSecret })
- export rwClient = twitterClient.readWrite

## UI Layout
- Sidebar navigation: Profile | Post | Trends | Generate
- Dark mode by default
- Clean dashboard layout

## Important
- All API keys from .env.local, never exposed to client
- Error handling on all API routes
- Loading states on all async actions
- Mobile responsive

## Documentation
See monetize-fan.md for full project documentation, next phases, and goals.
```

---

*Last updated: March 14, 2026*
