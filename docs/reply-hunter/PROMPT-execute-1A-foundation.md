# Prompt Execute: Phase 1A — Foundation
> Jalankan prompt ini di thread Codex baru.
> Selesaikan phase ini SEPENUHNYA sebelum lanjut ke Phase 1B.

---

## Context Project

Project: **monetize-fan** — SaaS dashboard untuk manage konten Twitter/X.

Tech stack: Next.js 16, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase (Auth + PostgreSQL), twitter-api-v2, Anthropic Claude API + OpenAI GPT-4o Mini.

Fitur yang sedang dibangun: **Reply Hunter** — fitur untuk cari thread ramai, generate AI reply, dan post langsung dari dashboard.

---

## Keputusan yang Sudah Ditetapkan

Sebelum coding, ini keputusan final yang harus diikuti:

1. **Metrics fallback**: jika `impressions` tidak tersedia dari X API, fallback ke `engagement_count` (likes + replies + reposts). Jika juga kosong, simpan `null` — tampilkan "-" di UI. Jangan blokir fitur.
2. **Duplicate reply rule**: time-window **24 jam** — user tidak bisa reply ke tweet yang sama dalam 24 jam terakhir. Enforce di DB unique constraint + app-level check.
3. **IDENTITY.md**: pakai file statis `docs/IDENTITY.md` untuk Phase 1. Satu file untuk semua user.
4. **Partial failure handling**: jika X API post sukses tapi DB insert gagal — log kritikal ke `lib/ai-trace.ts` + return partial-failure response ke UI dengan pesan jelas. Jangan silent fail.
5. **Data yang disimpan ke DB**: hanya data reply yang dibuat user. `original_tweet_*` fields adalah context saja (tweet yang di-reply), bukan data yang di-track.

---

## Scope Phase 1A — HANYA INI, TIDAK LEBIH

Phase ini fokus pada **infrastruktur database dan type definitions**. Jangan buat API routes atau UI apapun di phase ini.

### Yang Harus Dibuat

#### 1. File Migration SQL Baru
Buat file baru: `migrations/reply_hunter_001.sql`

Jangan edit `schema.sql` yang sudah ada.

Isi migration:

```sql
-- Table: reply_history
CREATE TABLE IF NOT EXISTS reply_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Context: tweet yang di-reply (read-only reference)
  original_tweet_id TEXT NOT NULL,
  original_tweet_text TEXT,
  original_author_handle TEXT,

  -- Data reply yang dibuat user
  reply_tweet_id TEXT NOT NULL,
  reply_text TEXT NOT NULL,
  tone_label TEXT CHECK (tone_label IN ('educational', 'bold', 'curious')),

  -- Metrics reply user (bukan metrics tweet original)
  impressions INTEGER,
  engagements INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metrics_synced_at TIMESTAMPTZ
);
```

Tambahkan juga:
- **RLS policies**: user hanya bisa SELECT/INSERT/UPDATE/DELETE row miliknya sendiri (`user_id = auth.uid()`)
- **Indexes**:
  - `(user_id, created_at DESC)` — untuk query history paginated
  - `(user_id, original_tweet_id, created_at DESC)` — untuk duplicate check 24 jam
- **Unique constraint** untuk anti-duplicate window 24 jam:
  Gunakan partial unique index atau handle di app-level check (pilih yang lebih sesuai dengan pola existing di `schema.sql`)

#### 2. Update TypeScript Types
Edit file: `lib/supabase/types.ts`

Tambahkan tipe baru untuk `reply_history`. Ikuti pola types yang sudah ada di file tersebut.

Tipe yang perlu ditambahkan:
- `ReplyHistory` — row type untuk tabel
- `ReplyHistoryInsert` — untuk insert baru
- `ReplyHistoryUpdate` — untuk update metrics

#### 3. Shared Types untuk Reply Hunter Feature
Buat file baru: `app/dashboard/reply-hunter/types.ts`

Definisikan contracts antara API dan UI:

```typescript
// Thread hasil discover
export type DiscoveredThread = {
  tweetId: string
  text: string
  authorHandle: string
  authorName: string
  authorFollowers: number
  likeCount: number
  replyCount: number
  repostCount: number
  impressionCount: number | null
  engagementScore: number // computed: likes + replies + reposts
  createdAt: string
  badge: 'hot' | 'rising' | 'niche' | null
}

// Request/Response untuk /api/reply-hunter/discover
export type DiscoverRequest = {
  keywords?: string[]
  language?: 'id' | 'en' | 'all'
  minEngagement?: number
}

export type DiscoverResponse = {
  success: boolean
  data: DiscoveredThread[]
  error?: string
}

// Request/Response untuk /api/reply-hunter/generate
export type GenerateReplyRequest = {
  tweetId: string
  tweetText: string
  authorHandle: string
  tone: 'educational' | 'bold' | 'curious'
}

export type ReplyOption = {
  text: string
  tone: 'educational' | 'bold' | 'curious'
  charCount: number
}

export type GenerateReplyResponse = {
  success: boolean
  data?: ReplyOption[]
  model?: string
  fallbackReason?: string
  error?: string
}

// Request/Response untuk /api/reply-hunter/post
export type PostReplyRequest = {
  originalTweetId: string
  originalTweetText: string
  originalAuthorHandle: string
  replyText: string
  toneLabel: 'educational' | 'bold' | 'curious'
}

export type PostReplyResponse = {
  success: boolean
  replyTweetId?: string
  partialFailure?: boolean
  partialFailureReason?: string
  error?: string
}

// Response untuk /api/reply-hunter/history
export type ReplyHistoryItem = {
  id: string
  originalTweetId: string
  originalTweetText: string | null
  originalAuthorHandle: string | null
  replyTweetId: string
  replyText: string
  toneLabel: string | null
  impressions: number | null
  engagements: number | null
  createdAt: string
  metricsSyncedAt: string | null
}

export type HistoryResponse = {
  success: boolean
  data: ReplyHistoryItem[]
  total: number
  error?: string
}
```

---

## Yang TIDAK Boleh Dikerjakan di Phase Ini

- ❌ Jangan buat API routes (`/api/reply-hunter/*`)
- ❌ Jangan buat halaman UI (`/dashboard/reply-hunter/*`)
- ❌ Jangan modifikasi `components/sidebar.tsx`
- ❌ Jangan modifikasi file apapun selain yang disebutkan di atas

---

## Referensi File yang Perlu Dibaca

Sebelum mulai, baca file berikut untuk memahami pola existing:

```
1. schema.sql                    ← pola tabel, RLS, index existing
2. lib/supabase/types.ts         ← pola type definitions existing
3. docs/PRD-Reply-Hunter.md      ← spesifikasi lengkap fitur
```

---

## Test Checklist Setelah Phase Ini Selesai

Sebelum bilang "done" dan lanjut ke Phase 1B, pastikan:

- [ ] File `migrations/reply_hunter_001.sql` sudah ada dan valid SQL
- [ ] RLS policy sudah ditambahkan — user hanya bisa akses row miliknya
- [ ] Index `(user_id, created_at DESC)` sudah ada
- [ ] Index `(user_id, original_tweet_id, created_at DESC)` sudah ada
- [ ] `lib/supabase/types.ts` sudah include `ReplyHistory`, `ReplyHistoryInsert`, `ReplyHistoryUpdate`
- [ ] `app/dashboard/reply-hunter/types.ts` sudah ada dengan semua types di atas
- [ ] `npx tsc --noEmit` lulus tanpa error baru
- [ ] Tidak ada file lain yang dimodifikasi selain yang disebutkan

---

## Output yang Diharapkan

Setelah phase ini selesai, list semua file yang dibuat/dimodifikasi:

```
Created:
- migrations/reply_hunter_001.sql
- app/dashboard/reply-hunter/types.ts

Modified:
- lib/supabase/types.ts
```

Jika ada keputusan teknikal yang perlu dikonfirmasi selama implementasi, tanyakan sebelum melanjutkan.
