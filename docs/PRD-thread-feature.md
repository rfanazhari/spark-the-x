# Product Requirements Document (PRD)
## Feature: AI-Powered Thread Creator

> Version: 1.2
> Date: March 15, 2026
> Author: rfanazhari
> Status: Draft
> Parent Doc: PRD-saas-transformation.md
> Changelog: v1.1 — Added DB storage, usage tracking, rate limiting
> Changelog: v1.2 — Added landing page update section

---

## 1. Overview

### 1.1 Background

Saat ini monetize-fan mendukung single tweet posting. Namun banyak konten yang membutuhkan lebih dari 280 karakter untuk disampaikan dengan baik — seperti tutorial, opini mendalam, tips berseri, atau artikel ringkas. Twitter/X mendukung format **thread** (rangkaian tweet yang terhubung via reply chain), yang menjadi salah satu format konten paling viral di platform.

Thread Creator adalah fitur premium yang akan menjadi salah satu **monetization lever** utama di SaaS ini. Free users dibatasi 5 thread per bulan, dengan plan berbayar untuk akses unlimited di masa depan.

### 1.2 Problem Statement

Content creator yang ingin berbagi konten panjang di Twitter menghadapi masalah:
- Memecah artikel/konten panjang menjadi thread secara manual memakan waktu
- Sulit menjaga konsistensi alur dan tone antar tweet dalam satu thread
- Tidak tahu cara membuat hook yang menarik di tweet pertama
- Sering lupa format yang ideal (numbering, CTA, hashtag)

### 1.3 Solution

Fitur **AI Thread Creator** yang memungkinkan user untuk:
1. Input topik (manual atau pilih dari trending topics)
2. Pilih AI model (Claude atau GPT-4o Mini)
3. AI generate thread lengkap dengan format yang optimal
4. Preview seluruh thread sebelum posting
5. Edit tiap tweet jika diperlukan
6. Post thread dengan satu klik — otomatis membuat reply chain di X
7. Semua thread tersimpan di DB untuk history dan analytics

---

## 2. Goals & Success Metrics

### 2.1 Feature Goals
- User bisa generate dan post thread dalam < 3 menit
- Thread yang dihasilkan selalu valid (setiap tweet ≤ 280 chars)
- Format thread konsisten: hook → konten → CTA+hashtag
- Partial post failure ditangani dengan graceful error handling
- Usage limit berjalan akurat per calendar month per user
- Data tersimpan di DB untuk future analytics & monetization

### 2.2 Success Metrics (1 Bulan Pertama)
| Metric | Target |
|---|---|
| Thread generated per user per week | 3 |
| Thread approval rate (generate → post) | 60% |
| Average tweets per thread | 5–8 |
| Post success rate (no partial failure) | 95% |
| Users hitting monthly limit | < 20% |

---

## 3. User Stories

- Sebagai user, aku ingin input topik thread secara manual atau pilih dari trending topics
- Sebagai user, aku ingin memilih AI model yang akan generate thread-ku
- Sebagai user, aku ingin AI generate thread yang sudah terformat dengan baik (hook, numbered, CTA, hashtag)
- Sebagai user, aku ingin preview semua tweet dalam thread sebelum posting
- Sebagai user, aku ingin bisa edit setiap tweet di preview dengan live char counter
- Sebagai user, aku ingin bisa regenerate thread jika hasilnya tidak sesuai
- Sebagai user, aku ingin post thread dengan satu klik tanpa perlu copy-paste manual
- Sebagai user, aku ingin tahu berapa sisa quota thread yang bisa aku buat bulan ini
- Sebagai user, aku ingin tombol generate disabled jika quota sudah habis
- Sebagai user, aku ingin tahu kapan quota akan reset

---

## 4. Scope

### 4.1 In Scope (V1)
- Input topik: manual text input + pilih dari trending topics
- AI model selector: Claude Sonnet / GPT-4o Mini
- AI generate thread (jumlah tweet ditentukan AI sesuai konten)
- Thread format: hook → numbered body tweets → CTA + hashtag di akhir
- Preview mode: tampilkan semua tweet urut sebelum post
- Edit mode: tiap tweet bisa diedit di preview dengan live char counter
- Regenerate: generate ulang seluruh thread dengan topik yang sama
- Post thread: sequential posting via X API reply chain
- Partial failure handling: tampilkan status per tweet jika ada yang gagal
- DB storage: simpan thread metadata + tweet status per posting
- Usage tracking: limit 5 thread per user per calendar month
- Hard block: Generate button disabled setelah limit tercapai
- Quota display: tampilkan sisa quota + tanggal reset di UI

### 4.2 Out of Scope (V1)
- Schedule thread
- Draft & save thread tanpa post
- Thread dari artikel/URL yang diimport
- Thread dengan media/gambar per tweet
- Paid plan / upgrade flow (placeholder UI saja)
- Thread analytics per tweet

### 4.3 Future Scope (V2+)
- Paid plan dengan thread unlimited
- Import artikel dari URL → AI summarize jadi thread
- Schedule thread posting
- Draft & save thread
- Thread analytics (impressions per tweet)
- Thread template library

---

## 5. Thread Format Specification

### 5.1 Structure
```
Tweet 1  — Hook (kalimat pembuka yang kuat, tanpa numbering)
Tweet 2  — Body (2/N)
Tweet 3  — Body (3/N)
...
Tweet N  — CTA + hashtag (tanpa numbering)
```

### 5.2 Character Budget
```
Max total        : 280 chars
Numbering (X/N)  : ~8 chars
Body tweet budget: 272 chars
Hook & CTA       : 280 chars full
```

### 5.3 Format Rules
- Hook: kalimat yang memancing rasa ingin tahu / bold statement
- Body: setiap tweet = satu poin/ide yang berdiri sendiri
- CTA: ajak interaksi + 1-3 hashtag relevan
- Tone & bahasa: sesuai IDENTITY.md

---

## 6. Database Schema

### 6.1 New Tables

```sql
-- Thread sessions
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  model TEXT NOT NULL,
  total_tweets INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',   -- draft | posted | partial | failed
  first_tweet_id TEXT,
  first_tweet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ
);

-- Tweet items per thread
CREATE TABLE IF NOT EXISTS thread_tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  index INTEGER NOT NULL,
  type TEXT NOT NULL,                     -- hook | body | cta
  text TEXT NOT NULL,
  char_count INTEGER NOT NULL,
  tweet_id TEXT,
  tweet_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | posted | failed
  error TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking per user per month
CREATE TABLE IF NOT EXISTS thread_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,                    -- format: 'YYYY-MM'
  thread_count INTEGER NOT NULL DEFAULT 0,
  limit_count INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);
```

### 6.2 RLS Policies

```sql
-- threads
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own threads"
  ON threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own threads"
  ON threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own threads"
  ON threads FOR UPDATE USING (auth.uid() = user_id);

-- thread_tweets
ALTER TABLE thread_tweets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own thread tweets"
  ON thread_tweets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own thread tweets"
  ON thread_tweets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own thread tweets"
  ON thread_tweets FOR UPDATE USING (auth.uid() = user_id);

-- thread_usage
ALTER TABLE thread_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage"
  ON thread_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage"
  ON thread_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage"
  ON thread_usage FOR UPDATE USING (auth.uid() = user_id);
```

### 6.3 TypeScript Types (tambahkan ke lib/supabase/types.ts)

```typescript
export interface Thread {
  id: string
  user_id: string
  topic: string
  model: 'claude' | 'openai'
  total_tweets: number
  status: 'draft' | 'posted' | 'partial' | 'failed'
  first_tweet_id: string | null
  first_tweet_url: string | null
  created_at: string
  posted_at: string | null
}

export interface ThreadTweet {
  id: string
  thread_id: string
  user_id: string
  index: number
  type: 'hook' | 'body' | 'cta'
  text: string
  char_count: number
  tweet_id: string | null
  tweet_url: string | null
  status: 'pending' | 'posted' | 'failed'
  error: string | null
  posted_at: string | null
  created_at: string
}

export interface ThreadUsage {
  id: string
  user_id: string
  month: string
  thread_count: number
  limit_count: number
  created_at: string
  updated_at: string
}
```

---

## 7. Usage Limit Logic

### 7.1 Rules
- Free users: 5 threads per calendar month
- Reset: tanggal 1 setiap bulan
- Month key: `YYYY-MM`
- Hard block: Generate button disabled setelah limit

### 7.2 Check Flow
```
User klik Generate
  → GET /api/thread/usage
  → Jika thread_count >= limit_count → BLOCK
  → Jika thread_count < limit_count → allow generate
```

### 7.3 Increment Flow
```
AI generate berhasil
  → Upsert thread_usage (increment thread_count)
  → INSERT thread record (status: 'draft')
  → INSERT thread_tweets records
```

### 7.4 Important Rules
- Usage hanya diincrement jika AI generate BERHASIL
- Generate gagal → tidak increment counter
- Regenerate (ulang thread yang sama) → TIDAK increment counter
- Hanya generate thread BARU yang increment

### 7.5 API: GET /api/thread/usage
```typescript
// Response
{
  success: true,
  month: '2026-03',
  threadCount: 3,
  limitCount: 5,
  remaining: 2,
  isLimited: false,
  resetsAt: '2026-04-01T00:00:00Z'
}
```

---

## 8. Technical Architecture

### 8.1 New Files
```
app/
├── dashboard/
│   └── thread/
│       └── page.tsx
└── api/
    ├── ai/
    │   └── thread/route.ts
    ├── twitter/
    │   └── thread/route.ts
    └── thread/
        └── usage/route.ts
```

### 8.2 API: POST /api/ai/thread

Server logic:
1. Auth check → 401
2. Usage check → 429 jika limited
3. Generate via AI model
4. Validate semua tweet ≤ 280 chars
5. Recalculate numbering server-side
6. Upsert thread_usage (increment)
7. INSERT threads record (status: draft)
8. INSERT thread_tweets records
9. Return data + usage info

Request:
```typescript
{
  topic: string
  model: 'claude' | 'openai'
  tweetVolume?: number
  fromTrend?: boolean
}
```

Response:
```typescript
{
  success: true,
  threadId: string,
  model: string,
  topic: string,
  tweets: { index, text, type, charCount }[],
  totalTweets: number,
  usage: { threadCount, limitCount, remaining },
  generatedAt: string
}
```

### 8.3 API: POST /api/twitter/thread

Server logic:
1. Auth check → 401
2. Fetch thread dari DB, verify ownership
3. Post tweet[0] → update thread_tweets[0] status
4. Loop tweet[1..N] dengan reply.in_reply_to_tweet_id
5. Update thread_tweets[i] status per tweet
6. Update threads.status → posted/partial/failed
7. Update threads.first_tweet_id + first_tweet_url
8. Return hasil

Request:
```typescript
{
  threadId: string
  tweets: string[]    // final text setelah user edit
}
```

Response:
```typescript
{
  success: true,
  threadId: string,
  totalPosted: number,
  status: 'posted' | 'partial' | 'failed',
  firstTweetUrl: string | null,
  tweets: { index, tweetId, url, status, error? }[]
}
```

---

## 9. UI Specification

### 9.1 Quota Banner (selalu tampil)
```
[🧵 Thread quota: 3 / 5 used · Resets Apr 1, 2026]
```
- Gray: masih ada sisa
- Amber: 4/5 terpakai
- Red: 5/5 (limit tercapai) → "Monthly limit reached · Upgrade for unlimited"

### 9.2 Input Section
- Topik toggle: "✍️ Manual" | "🔥 From Trends"
- From trends: 5 trend cards, clickable
- AI model selector (sama dengan Generate page)
- Generate button:
  - DISABLED + tooltip jika quota habis
  - DISABLED jika topik kosong
  - Loading: "Generating thread..."

### 9.3 Preview Section
- Model badge + tweet count + Regenerate button
- Tweet cards stacked dengan connector line
- Per card: type badge + editable textarea + char counter
- Warning jika >280 chars
- Post button: disabled jika ada tweet >280

### 9.4 Post Progress
- Per tweet: ⏳ Waiting → 🔄 Posting → ✅ Posted / ❌ Failed

### 9.5 Result State
- Success: "Thread posted! 🎉" + link + updated quota
- Partial: status per tweet + info yang sudah live

---

## 10. Error Handling

| Error | HTTP | Handling |
|---|---|---|
| Usage limit reached | 429 | Disable button + banner merah |
| AI generate gagal | 500 | Toast error, tidak increment usage |
| Tweet >280 dari AI | 500 | Retry 1x, jika gagal return error |
| Partial post failure | 207 | Status per tweet |
| Rate limit X API | 429 | Pesan jelas + link X billing |

---

## 11. Monetization Foundation

`thread_usage.limit_count` dirancang fleksibel per user:
| Plan | limit_count |
|---|---|
| Free | 5 |
| Pro (V2) | 50 |
| Business (V2) | -1 (unlimited) |

Semua user saat ini = Free (limit_count = 5). Upgrade flow ditambahkan di V2.

---

## 12. Landing Page Update

### 12.1 Scope Perubahan
Setelah Thread Creator live, landing page (app/page.tsx) perlu diupdate untuk mengkomunikasikan fitur baru kepada calon user.

### 12.2 Features Section Update

Tambahkan Thread Creator sebagai card ke-3 di features grid. Semua feature cards tampil equal tanpa badge atau highlight khusus.

Updated features grid (4 cards, 2x2):
- [AI post generator] [Trending topics]
- [AI thread creator] [Post & track]

Thread Creator card:
- Icon: AlignLeft dari lucide-react
- Title: "AI thread creator"
- Desc: "Turn any topic into a full Twitter thread. AI writes the hook, body, and CTA — you just review and post."
- Styling: sama persis dengan card lainnya

### 12.3 How it Works Section Update

Update dari 3 steps menjadi 4 steps:
- Step 1: Create your account — Sign up with just your email
- Step 2: Connect Twitter — Add your X API credentials once
- Step 3: Generate content — Pick a trend, choose AI model, get tweet or thread options
- Step 4: Post and grow — Preview, edit if needed, post with one click

Step 3 diubah dari "Start posting" menjadi "Generate content" untuk mencakup single tweet dan thread.

### 12.4 Thread Social Proof Section (New)

Tambahkan section baru setelah features section, sebelum How it works.

Section label: "Thread example"
Headline: "From topic to thread in seconds"
Subheadline: "Just type a topic — AI handles the writing, formatting, and structure."

Layout: 2 kolom side by side (stack single column pada mobile)

Kiri — Input card:
- Topic input field
- Model selector: Claude Sonnet / GPT-4o Mini
- Generate button (indigo)

Kanan — Thread preview mockup:
- Tweet 1: Hook + avatar @rfanazhari + Hook badge
- Tweet 2: Body tweet + numbering (2/6)
- Tweet 3: Skeleton placeholder (kesan AI masih generate)
- Tweet N: CTA tweet + CTA badge + hashtag
- Connector line antar tweet sebagai visual thread indicator

Tone: dark background (#0a0a0a) konsisten dengan landing page.

### 12.5 Definition of Done (Landing Page)
- [ ] Thread Creator card di features section tanpa badge/highlight
- [ ] How it works diupdate menjadi 4 steps
- [ ] Thread social proof section ditambahkan
- [ ] Mobile responsive (320px+)
- [ ] Tidak ada breaking change pada sections lain

---

## 13. Implementation Phases

### Phase 1 — DB Setup
- Run SQL di Supabase (3 table baru)
- Enable RLS + policies
- Update lib/supabase/types.ts

### Phase 2 — Backend
- GET /api/thread/usage
- POST /api/ai/thread (generate + save + increment)
- POST /api/twitter/thread (post + update DB)

### Phase 3 — Frontend
- /dashboard/thread page
- Quota banner
- Input + model selector
- Preview + edit + post progress
- Result state

### Phase 4 — Polish
- Sidebar nav (tambah Thread antara Post dan History)
- Mobile QA (320px+)
- Update CHANGELOG.md
- Update monetize-fan.md

---

## 14. Definition of Done

- [ ] 3 table baru di Supabase dengan RLS aktif
- [ ] GET /api/thread/usage berjalan akurat
- [ ] Generate dari topik manual dan trending topics
- [ ] Usage diincrement hanya saat generate berhasil
- [ ] Generate button disabled saat quota habis
- [ ] Quota banner akurat dengan info reset date
- [ ] Thread & tweets tersimpan ke DB
- [ ] Thread terposting sebagai reply chain di X
- [ ] Status per tweet tersimpan setelah post
- [ ] Partial failure ditampilkan dengan jelas
- [ ] Mobile responsive (320px+)
- [ ] CHANGELOG.md diupdate
- [ ] Thread Creator card di landing page features section
- [ ] How it works diupdate menjadi 4 steps
- [ ] Thread social proof section live di landing page

---

*Last updated: March 15, 2026*
