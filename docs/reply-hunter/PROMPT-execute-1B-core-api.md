# Prompt Execute: Phase 1B — Core API
> Jalankan prompt ini di thread Codex BARU setelah Phase 1A selesai.
> Pastikan checklist Phase 1A sudah 100% sebelum mulai phase ini.

---

## Context Project

Project: **monetize-fan** — SaaS dashboard untuk manage konten Twitter/X.

Tech stack: Next.js 16, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase (Auth + PostgreSQL), twitter-api-v2, Anthropic Claude API + OpenAI GPT-4o Mini.

---

## Keputusan Final (Sama dengan Phase 1A)

1. **Metrics fallback**: jika `impressions` tidak tersedia, fallback ke `engagement_count`. Jika kosong, simpan `null` — tampilkan "-" di UI.
2. **Duplicate reply rule**: time-window **24 jam** — cek `reply_history` apakah user sudah reply tweet yang sama dalam 24 jam. Enforce di app-level + DB.
3. **IDENTITY.md**: baca file statis `docs/IDENTITY.md` sebagai system context AI.
4. **Partial failure**: jika X post sukses tapi DB insert gagal — log ke `lib/ai-trace.ts` + return `partialFailure: true` ke client.
5. **Data di DB**: hanya reply milik user yang disimpan. `original_tweet_*` adalah context.

---

## Prerequisites dari Phase 1A

Phase ini mengasumsikan hal berikut sudah ada:
- Tabel `reply_history` sudah di-migrate ke Supabase
- Types `ReplyHistory`, `ReplyHistoryInsert`, `ReplyHistoryUpdate` sudah ada di `lib/supabase/types.ts`
- Shared types sudah ada di `app/dashboard/reply-hunter/types.ts`

---

## Scope Phase 1B — HANYA INI, TIDAK LEBIH

Phase ini fokus pada **4 API endpoints**. Jangan buat UI apapun.

---

### Endpoint 1: `/api/reply-hunter/discover/route.ts`

**Tujuan**: Search thread ramai by keyword via X API, return list thread yang sudah di-score dan di-filter.

**Referensi pola**: `app/api/twitter/trends/route.ts`

**Implementasi**:

```
Method: GET
Query params:
  - keywords: string (comma-separated, default: "AI,programming,tech,Indonesia")
  - language: "id" | "en" | "all" (default: "all")
  - minEngagement: number (default: 10)

Auth: wajib getAuthUser() — return 401 jika tidak authenticated

X API yang digunakan:
  - GET /2/tweets/search/recent
  - Auth: Bearer Token (bukan OAuth, ini read-only)
  - Fields: id, text, author_id, created_at, public_metrics
  - Expansions: author_id (untuk handle + follower count)
  - Max results: 20

Scoring logic:
  engagementScore = like_count + reply_count + repost_count
  badge logic:
    - "hot": engagementScore > 500
    - "rising": engagementScore > 100 && created_at < 6 jam lalu
    - "niche": keyword match tinggi (1+ keyword exact match di text)
    - null: selain itu

Filter sebelum return:
  - Hapus tweet dengan engagementScore < minEngagement
  - Deduplicate by tweet_id
  - Exclude retweets (text tidak dimulai dengan "RT @")

Sort: engagementScore DESC

Error handling:
  - Rate limit X API (429): return { success: false, error: "X API rate limit. Coba lagi dalam beberapa menit.", retryAfter: <seconds> }
  - No results: return { success: true, data: [] }
  - Tweet dihapus/suspended: filter out saat normalisasi
```

---

### Endpoint 2: `/api/reply-hunter/generate/route.ts`

**Tujuan**: Generate 3 opsi reply menggunakan Claude (fallback GPT-4o Mini) berdasarkan tweet target dan IDENTITY.md user.

**Referensi pola**: `app/api/ai/generate/route.ts` — ikuti pola Claude → OpenAI fallback dan ai-trace yang sudah ada.

**Implementasi**:

```
Method: POST
Body: GenerateReplyRequest (dari app/dashboard/reply-hunter/types.ts)
  - tweetId: string
  - tweetText: string
  - authorHandle: string
  - tone: "educational" | "bold" | "curious"

Auth: wajib getAuthUser() — return 401 jika tidak authenticated

Validasi input:
  - tone harus salah satu dari whitelist ("educational" | "bold" | "curious") — return 400 jika invalid
  - tweetText tidak boleh kosong

IDENTITY.md loading:
  - Baca file docs/IDENTITY.md menggunakan fs.readFileSync
  - Jika file tidak ditemukan/kosong: gunakan fallback system prompt hardcoded + log warning ke ai-trace

System prompt template:
  "You are a reply ghostwriter for @rfanazhari, a tech educator from Indonesia.
  
  IDENTITY CONTEXT:
  {isi IDENTITY.md}
  
  TONE REQUESTED: {tone}
  - educational: add value, share knowledge, cite data if relevant
  - bold: confident hot take, disagree respectfully if needed
  - curious: ask an insightful question that sparks discussion
  
  TWEET TO REPLY:
  @{authorHandle}: {tweetText}
  
  Generate exactly 3 reply options. Each must be under 280 characters.
  
  Return ONLY valid JSON, no markdown, no preamble:
  [
    { "text": "reply option 1", "tone": "{tone}" },
    { "text": "reply option 2", "tone": "{tone}" },
    { "text": "reply option 3", "tone": "{tone}" }
  ]"

Post-validation setelah AI return:
  - Parse JSON strict — jika gagal: retry 1x, jika masih gagal return 502
  - Filter opsi yang > 280 chars — regenerate jika semua invalid
  - Check banned terms sederhana (list minimal: spam trigger words)

Fallback: Claude gagal → GPT-4o Mini (sama persis pola di app/api/ai/generate/route.ts)
Jika keduanya gagal: return 502 + log ke ai-trace sebagai "system" event

Response: GenerateReplyResponse (dari types.ts)
  - include model yang digunakan + fallbackReason jika ada
```

---

### Endpoint 3: `/api/reply-hunter/post/route.ts`

**Tujuan**: Post reply ke X, enforce rate limit, save ke reply_history, handle partial failure.

**Referensi pola**: `app/api/twitter/post/route.ts`

**Implementasi**:

```
Method: POST
Body: PostReplyRequest (dari app/dashboard/reply-hunter/types.ts)

Auth: wajib getAuthUser() — return 401 jika tidak authenticated

Pre-flight checks (urutan):

  1. Rate limit check:
     Query reply_history WHERE user_id = ? AND created_at > NOW() - INTERVAL '1 hour'
     Jika count >= 10: return 429 + { error: "Rate limit: maksimal 10 reply per jam.", resetAt: <timestamp> }

  2. Duplicate check (24 jam):
     Query reply_history WHERE user_id = ? AND original_tweet_id = ? AND created_at > NOW() - INTERVAL '24 hours'
     Jika ada: return 409 + { error: "Kamu sudah reply tweet ini dalam 24 jam terakhir." }

  3. Validasi reply text:
     - Tidak boleh kosong
     - Tidak boleh > 280 chars
     - Return 400 jika invalid

Post ke X API:
  - Gunakan getTwitterClient(userId)
  - rwClient.v2.tweet({ text: replyText, reply: { in_reply_to_tweet_id: originalTweetId } })
  - Jika tweet target tidak ada (404) atau protected (403): return 422 + { error: "Tweet tidak dapat di-reply. Mungkin sudah dihapus atau akun protected." }

DB Insert (setelah X post sukses):
  - Insert ke reply_history
  - Jika INSERT gagal:
    → Log kritikal ke ai-trace: { provider: "system", event: "db_insert_failed", tweetId: replyTweetId }
    → Return { success: true, replyTweetId, partialFailure: true, partialFailureReason: "Posted but history may not be saved." }
  - Jika INSERT sukses:
    → Return { success: true, replyTweetId }

Jangan implementasi optimistic UI di sini — itu urusan UI layer.
```

---

### Endpoint 4: `/api/reply-hunter/history/route.ts`

**Tujuan**: Fetch paginated reply history milik user beserta metrics.

**Referensi pola**: `app/api/twitter/history/route.ts`

**Implementasi**:

```
Method: GET
Query params:
  - page: number (default: 1)
  - limit: number (default: 10, max: 50)

Auth: wajib getAuthUser() — return 401 jika tidak authenticated

Query Supabase:
  SELECT * FROM reply_history
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT {limit} OFFSET {(page-1) * limit}

Response: HistoryResponse (dari types.ts)
  - data: ReplyHistoryItem[]
  - total: total count untuk pagination
  - null-safe: semua nullable fields (impressions, engagements, dll) boleh null

Error: return { success: false, error: "..." } + status 500 jika query gagal
```

---

## Pola Wajib yang Harus Diikuti di Semua Endpoint

Baca file-file ini dulu dan ikuti polanya PERSIS:

```
1. lib/auth.ts                          ← getAuthUser() pattern
2. lib/twitter.ts                       ← getTwitterClient(userId) pattern
3. lib/ai-trace.ts                      ← logging pattern
4. app/api/ai/generate/route.ts         ← Claude → OpenAI fallback pattern
5. app/api/twitter/post/route.ts        ← X API post pattern
6. app/api/twitter/trends/route.ts      ← X API read pattern
7. app/api/twitter/history/route.ts     ← Supabase query pattern
8. app/dashboard/reply-hunter/types.ts  ← semua request/response types
```

---

## Yang TIDAK Boleh Dikerjakan di Phase Ini

- ❌ Jangan buat halaman UI (`/dashboard/reply-hunter/*`)
- ❌ Jangan modifikasi `components/sidebar.tsx`
- ❌ Jangan buat sync-metrics endpoint (Phase 2)
- ❌ Jangan modifikasi schema.sql atau migration (sudah selesai di Phase 1A)

---

## Test Checklist Setelah Phase Ini Selesai

- [ ] `GET /api/reply-hunter/discover` — return thread list, auth guard jalan
- [ ] `GET /api/reply-hunter/discover` — empty result jika keyword tidak match (tidak error)
- [ ] `POST /api/reply-hunter/generate` — return 3 opsi reply semua <= 280 chars
- [ ] `POST /api/reply-hunter/generate` — tone invalid return 400
- [ ] `POST /api/reply-hunter/generate` — Claude fallback ke GPT-4o Mini jika Claude gagal
- [ ] `POST /api/reply-hunter/post` — rate limit 10/jam enforced
- [ ] `POST /api/reply-hunter/post` — duplicate 24 jam return 409
- [ ] `POST /api/reply-hunter/post` — partial failure return `partialFailure: true` jika DB gagal
- [ ] `GET /api/reply-hunter/history` — return paginated history user
- [ ] `npx tsc --noEmit` lulus tanpa error baru

---

## Output yang Diharapkan

```
Created:
- app/api/reply-hunter/discover/route.ts
- app/api/reply-hunter/generate/route.ts
- app/api/reply-hunter/post/route.ts
- app/api/reply-hunter/history/route.ts

Modified:
- (tidak ada yang dimodifikasi)
```
