# AGENTS.md

> Defines all AI agent tasks, workflows, and responsibilities for the **monetize-fan** project.
> Used by Claude and any AI coding agent working on this codebase.

---

## Agent Overview

monetize-fan uses AI agents to automate content creation and posting workflows.
Each agent has a specific role, input, output, and set of tools it can use.

---

## Agent 1 — Trend Fetcher

**Role**: Fetch and filter trending topics from X API

**Trigger**: On demand or scheduled (cron)

**Input**: Location preference (`worldwide` | `indonesia`)

**Output**:
```typescript
{
  trends: {
    name: string        // e.g. "#AI2026"
    tweetVolume: number // e.g. 52000
    url: string         // X search URL
  }[]
}
```

**API Used**: `GET /api/twitter/trends`

**Rules**:
- Filter out trends with `tweetVolume < 1000`
- Sort by `tweetVolume` descending
- Return top 10 trends only
- Cache results for 15 minutes to avoid excessive API calls

---

## Agent 2 — Content Generator

**Role**: Generate tweet options based on a trending topic using Claude AI

**Trigger**: User selects a trending topic from the dashboard

**Input**:
```typescript
{
  trend: string       // e.g. "#AI2026"
  tweetVolume: number
  niche: string       // e.g. "tech", "finance", "lifestyle"
  tone: string        // e.g. "casual", "professional", "humorous"
}
```

**Output**:
```typescript
{
  options: {
    text: string      // Tweet content (max 280 chars)
    hook: string      // Why this tweet works
    hashtags: string[]
  }[]                 // Always return 3 options
}
```

**API Used**: `POST /api/ai/generate`

**Claude Prompt Template**:
```
You are a viral Twitter content strategist.
Generate 3 tweet options about the trending topic: {trend} ({tweetVolume} tweets).
Niche: {niche}. Tone: {tone}.
Each tweet must be under 280 characters, include relevant hashtags, and have a strong hook.
Respond ONLY in JSON format.
```

**Rules**:
- Always generate exactly 3 options
- Each tweet must be ≤ 280 characters
- Include 1–3 relevant hashtags per tweet
- Do not fabricate facts or statistics
- Avoid controversial or sensitive topics

---

## Agent 3 — Post Publisher

**Role**: Publish a selected tweet to `@rfanazhari`

**Trigger**: User clicks "Post" after selecting a generated tweet option

**Input**:
```typescript
{
  text: string         // Final tweet text
  mediaIds?: string[]  // Optional uploaded media
  scheduleAt?: string  // ISO datetime, optional
}
```

**Output**:
```typescript
{
  success: boolean
  tweetId: string
  url: string          // e.g. https://x.com/rfanazhari/status/...
  postedAt: string     // ISO datetime
}
```

**API Used**: `POST /api/twitter/post`

**Rules**:
- Validate tweet length ≤ 280 chars before posting
- If `scheduleAt` is provided, queue the post (Phase 2)
- Log all posted tweets with timestamp and tweetId
- Show success toast with link to live tweet

---

## Agent 4 — Profile Manager

**Role**: Read and update the Twitter profile for `@rfanazhari`

**Trigger**: User visits `/dashboard/profile` or submits profile edit form

**Input** (for update):
```typescript
{
  name?: string        // Display name (max 50 chars)
  description?: string // Bio (max 160 chars)
  location?: string    // Location string
  url?: string         // Website URL
}
```

**Output**:
```typescript
{
  id: string
  name: string
  username: string
  description: string
  location: string
  url: string
  profileImageUrl: string
  publicMetrics: {
    followersCount: number
    followingCount: number
    tweetCount: number
  }
}
```

**API Used**:
- `GET /api/twitter/profile` → fetch
- `PATCH /api/twitter/profile` → update

**Rules**:
- Validate field lengths before sending to API
- Show diff of what changed after successful update
- Refresh profile display immediately after update

---

## Agent 5 — Auto Poster (Phase 2)

**Role**: Fully automated trend-to-post pipeline, runs on schedule

**Trigger**: Cron job (e.g. every 6 hours)

**Workflow**:
```
1. Agent 1 → Fetch top 5 trends
2. Agent 2 → Generate 1 tweet per trend (auto-select best option)
3. Agent 3 → Post the tweet
4. Log result to post history
```

**Rules**:
- Only runs if auto-post is enabled in settings
- Max 4 auto-posts per day to avoid spam detection
- Skip trends already posted about in last 24 hours
- Always include relevant hashtags
- Notify user via dashboard after each auto-post

---

## Shared Rules (All Agents)

- **Never expose API keys** in logs, responses, or client-side code
- **Always handle errors gracefully** — return structured error objects
- **Rate limit awareness** — check X API usage before making calls
- **Idempotency** — don't post duplicate tweets within 1 hour window
- **Logging** — log all agent actions with timestamp to console (Phase 3: store in DB)

---

## Agent Communication Flow

```
User Action
    │
    ▼
Dashboard (Next.js)
    │
    ├──► /api/twitter/trends   → Agent 1 (Trend Fetcher)
    │
    ├──► /api/ai/generate      → Agent 2 (Content Generator)
    │                                    │
    │                              Claude API
    │
    ├──► /api/twitter/post     → Agent 3 (Post Publisher)
    │                                    │
    │                              X API v2
    │
    └──► /api/twitter/profile  → Agent 4 (Profile Manager)
                                         │
                                   X API v1 + v2
```

---

## Future Agents (Planned)

| Agent | Phase | Description |
|---|---|---|
| Analytics Tracker | Phase 3 | Pull tweet metrics daily |
| Affiliate Inserter | Phase 4 | Auto-append affiliate links |
| Audience Analyzer | Phase 4 | Identify top follower segments |
| Multi-Account Router | Phase 5 | Route posts to correct account |

---

*Last updated: March 14, 2026*
