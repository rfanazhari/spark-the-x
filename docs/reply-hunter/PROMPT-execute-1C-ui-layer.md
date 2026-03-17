# Prompt Execute: Phase 1C — UI Layer
> Jalankan prompt ini di thread Codex BARU setelah Phase 1B selesai.
> Pastikan semua API endpoints Phase 1B sudah jalan dan test checklist 100%.

---

## Context Project

Project: **monetize-fan** — SaaS dashboard untuk manage konten Twitter/X.

Tech stack: Next.js 16, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase (Auth + PostgreSQL).

---

## Keputusan Final

1. **Metrics null**: tampilkan "-" jika `impressions` atau `engagements` null.
2. **Duplicate reply**: user tidak bisa reply tweet sama dalam 24 jam — tampilkan pesan jelas di UI jika API return 409.
3. **Partial failure**: tampilkan toast warning "Posted but history may not be saved." jika API return `partialFailure: true`.
4. **Rate limit UI**: tampilkan countdown "Coba lagi dalam X menit" jika API return 429.

---

## Prerequisites dari Phase 1A & 1B

- Tabel `reply_history` sudah ada di Supabase
- Semua types ada di `app/dashboard/reply-hunter/types.ts`
- Semua 4 API endpoints sudah jalan:
  - `GET /api/reply-hunter/discover`
  - `POST /api/reply-hunter/generate`
  - `POST /api/reply-hunter/post`
  - `GET /api/reply-hunter/history`

---

## Scope Phase 1C — HANYA INI, TIDAK LEBIH

Phase ini fokus pada **UI layer**. Jangan modifikasi API routes.

---

### File Structure yang Harus Dibuat

```
app/dashboard/reply-hunter/
├── page.tsx                          ← wrapper page
└── _components/
    ├── ReplyHunterContent.tsx        ← main orchestrator
    ├── ThreadCard.tsx                ← card per thread hasil discover
    ├── ReplyModal.tsx                ← modal generate + post reply
    └── AnalyticsPanel.tsx           ← panel history + metrics
```

---

### 1. Custom Hook: `useReplyHunter`

Buat di dalam `_components/ReplyHunterContent.tsx` atau file terpisah `_hooks/useReplyHunter.ts`.

State yang dikelola:

```typescript
// Discover state
threads: DiscoveredThread[]
isLoadingThreads: boolean
discoverError: string | null
keywords: string[]  // default: ["AI", "programming", "tech", "Indonesia"]

// Selected thread
selectedThread: DiscoveredThread | null

// Generate state
replyOptions: ReplyOption[]
isGenerating: boolean
generateError: string | null
selectedTone: 'educational' | 'bold' | 'curious'

// Post state
isPosting: boolean
postError: string | null

// History state
history: ReplyHistoryItem[]
isLoadingHistory: boolean
historyError: string | null
```

Actions:
- `fetchThreads(keywords?)` — call `/api/reply-hunter/discover`
- `selectThread(thread)` — set selectedThread, buka modal
- `generateReplies(tone)` — call `/api/reply-hunter/generate`
- `postReply(replyText, toneLabel)` — call `/api/reply-hunter/post`, lalu refresh history
- `fetchHistory()` — call `/api/reply-hunter/history`

---

### 2. `page.tsx`

**Referensi**: ikuti pola `app/dashboard/trends/page.tsx`

```typescript
// Sederhana — wrapper + header
import { DashboardHeader } from "@/components/dashboard-header"
import { ReplyHunterContent } from "./_components/ReplyHunterContent"

export default function ReplyHunterPage() {
  return (
    <div>
      <DashboardHeader
        title="Reply Hunter"
        description="Temukan thread ramai & reply dengan AI"
      />
      <ReplyHunterContent />
    </div>
  )
}
```

---

### 3. `ReplyHunterContent.tsx`

**Referensi**: ikuti pola `app/dashboard/trends/_components/TrendsContent.tsx`

Layout: 2 kolom di desktop, stack di mobile:
- Kolom kiri (60%): thread list + discover controls
- Kolom kanan (40%): AnalyticsPanel (history)

Konten kolom kiri:
- Keyword input + tombol Refresh
- Loading state: 6 skeleton cards
- Empty state: ilustrasi + pesan "Tidak ada thread ditemukan. Coba ubah keyword."
- Error state: inline alert + tombol Retry
- List ThreadCard (max 20)

Auto-fetch saat komponen mount:
- `fetchThreads()` dengan default keywords
- `fetchHistory()`

---

### 4. `ThreadCard.tsx`

Tampilkan per thread:

```
┌─────────────────────────────────────────────┐
│ [Badge: HOT/RISING/NICHE]                   │
│ @authorHandle · {followerCount} followers   │
│                                             │
│ {tweetText preview, max 3 baris truncated}  │
│                                             │
│ ❤ {likes}  💬 {replies}  🔄 {reposts}      │
│                                             │
│ [Reply with AI]        [View on X ↗]        │
└─────────────────────────────────────────────┘
```

Badge styling:
- `hot`: background merah muda, text merah
- `rising`: background orange muda, text orange
- `niche`: background biru muda, text biru
- `null`: tidak tampilkan badge

"Reply with AI" → panggil `selectThread(thread)` → buka ReplyModal
"View on X" → buka `https://x.com/i/web/status/{tweetId}` di tab baru

---

### 5. `ReplyModal.tsx`

**Referensi**: ikuti pola `app/dashboard/generate/_components/PreviewModal.tsx`

Modal behavior:
- Buka saat `selectedThread` tidak null
- Lock (tidak bisa ditutup) saat `isPosting === true`

Layout dalam modal:

```
┌─── Reply Hunter ─────────────────────────────┐
│                                              │
│ Replying to @{authorHandle}:                 │
│ ┌──────────────────────────────────────────┐ │
│ │ {tweetText — full, scrollable jika panjang}│ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Tone:  [Educational] [Bold] [Curious]        │
│                                              │
│ [Generate Replies ↗]  ← disabled saat loading│
│                                              │
│ ── Setelah generate ──────────────────────── │
│                                              │
│ Pilih salah satu:                            │
│ ┌──────────────────────────────────────────┐ │
│ │ Option 1 text...              [Select]   │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Option 2 text...              [Select]   │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Option 3 text...              [Select]   │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ── Edit sebelum post ─────────────────────── │
│ ┌──────────────────────────────────────────┐ │
│ │ {selectedReply — editable textarea}       │ │
│ └──────────────────────────────────────────┘ │
│                     {charCount}/280          │
│                                              │
│ [Cancel]                    [Post Reply →]   │
└──────────────────────────────────────────────┘
```

Rules:
- Char counter real-time — merah jika > 280
- "Post Reply" disabled jika: charCount > 280, isPosting, atau text kosong
- Saat posting: semua tombol disabled, tampilkan loading spinner di "Post Reply"
- Setelah sukses: tutup modal, tampilkan toast "Reply posted!" + refresh history
- Setelah partial failure: tutup modal, tampilkan toast warning (kuning)
- Setelah error lain: tampilkan inline error dalam modal (tidak tutup)

Error messages spesifik:
- 429: "Rate limit tercapai. Maksimal 10 reply per jam."
- 409: "Kamu sudah reply tweet ini dalam 24 jam terakhir."
- 422: "Tweet tidak dapat di-reply. Mungkin sudah dihapus."
- Lainnya: "Gagal posting reply. Coba lagi."

---

### 6. `AnalyticsPanel.tsx`

Panel di kolom kanan, tampilkan reply history:

```
┌─── Reply History ────────────────────────────┐
│                                              │
│ [Loading skeleton saat fetch]                │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ @{originalAuthor}                        │ │
│ │ "{replyText preview, max 2 baris}"        │ │
│ │ 👁 {impressions | "-"}  ❤ {engagements | "-"} │
│ │ {relativeTime: "2 jam lalu"}             │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ [Empty state jika history kosong]            │
│ "Mulai reply pertama kamu!"                  │
└──────────────────────────────────────────────┘
```

Auto-refresh: setelah `postReply` sukses, panggil `fetchHistory()` otomatis.

---

### 7. Modifikasi `components/sidebar.tsx`

Tambahkan entry "Reply Hunter" di bawah "Trends".

Baca file `components/sidebar.tsx` dulu untuk memahami pola yang ada (mobile drawer + desktop sidebar). Pastikan entry baru muncul di **kedua mode** (mobile dan desktop).

Icon yang disarankan: `MessageSquarePlus` dari lucide-react (atau icon serupa yang sudah diimport).

Route: `/dashboard/reply-hunter`

---

## Referensi File yang Harus Dibaca

```
1. app/dashboard/trends/page.tsx
2. app/dashboard/trends/_components/TrendsContent.tsx
3. app/dashboard/generate/_components/PreviewModal.tsx
4. app/dashboard/generate/_components/TweetCard.tsx
5. components/sidebar.tsx
6. components/dashboard-header.tsx
7. app/dashboard/reply-hunter/types.ts    ← dari Phase 1A
```

---

## Yang TIDAK Boleh Dikerjakan di Phase Ini

- ❌ Jangan modifikasi API routes
- ❌ Jangan buat sync-metrics endpoint (Phase 2)
- ❌ Jangan tambahkan fitur di luar scope di atas

---

## Test Checklist Setelah Phase Ini Selesai

- [ ] Sidebar entry "Reply Hunter" muncul di mobile dan desktop
- [ ] Navigasi ke `/dashboard/reply-hunter` berhasil
- [ ] Thread list tampil saat halaman dimuat
- [ ] Loading skeleton muncul saat fetch
- [ ] Empty state muncul jika tidak ada thread
- [ ] Klik "Reply with AI" → ReplyModal terbuka
- [ ] Tone selector berfungsi (3 tab)
- [ ] Generate replies → 3 opsi muncul
- [ ] Select opsi → muncul di edit area
- [ ] Edit area berfungsi + char counter real-time
- [ ] Char counter merah jika > 280
- [ ] "Post Reply" disabled saat charCount > 280
- [ ] Posting lock (modal tidak bisa ditutup saat isPosting)
- [ ] Toast sukses muncul setelah post berhasil
- [ ] History refresh otomatis setelah post
- [ ] Error 429 tampil pesan rate limit
- [ ] Error 409 tampil pesan duplicate
- [ ] AnalyticsPanel tampil history dengan metrics
- [ ] `npx tsc --noEmit` lulus tanpa error baru
- [ ] Responsive: layout stack di mobile, 2 kolom di desktop

---

## Output yang Diharapkan

```
Created:
- app/dashboard/reply-hunter/page.tsx
- app/dashboard/reply-hunter/types.ts (sudah ada dari 1A)
- app/dashboard/reply-hunter/_components/ReplyHunterContent.tsx
- app/dashboard/reply-hunter/_components/ThreadCard.tsx
- app/dashboard/reply-hunter/_components/ReplyModal.tsx
- app/dashboard/reply-hunter/_components/AnalyticsPanel.tsx

Modified:
- components/sidebar.tsx
```
