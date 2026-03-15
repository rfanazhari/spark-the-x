# Product Requirements Document (PRD)
## Feature: Dashboard Overview

> Version: 1.0
> Date: March 15, 2026
> Author: rfanazhari
> Status: Draft
> Parent Docs: PRD-saas-transformation.md, PRD-thread-feature.md

---

## 1. Overview

### 1.1 Background

Saat ini setelah login, user langsung diarahkan ke `/dashboard/profile`. Tidak ada halaman overview yang memberikan gambaran umum aktivitas dan status akun secara sekilas. Seiring bertambahnya fitur (post, thread, generate, trends), user butuh satu halaman sentral yang menjadi "home base" dashboard.

### 1.2 Problem Statement

User yang sudah login tidak punya cara cepat untuk:
- Melihat ringkasan aktivitas mereka (berapa tweet & thread yang sudah dibuat)
- Mengetahui status quota thread bulan ini
- Mengakses fitur utama dengan cepat tanpa harus navigasi manual
- Mendapat konteks tentang apa yang sebaiknya dilakukan selanjutnya

### 1.3 Solution

Halaman **Dashboard Overview** di `/dashboard` yang menjadi halaman pertama setelah login, menampilkan metric summary, quick actions, recent activity, dan AI-generated insight berdasarkan aktivitas user.

---

## 2. Goals & Success Metrics

### 2.1 Feature Goals
- User langsung mendapat gambaran aktivitas setelah login
- User bisa akses fitur utama dalam 1 klik dari dashboard
- Insight AI membantu user tetap konsisten posting
- Halaman load cepat (semua data dari DB, tidak ada external API call)

### 2.2 Success Metrics
| Metric | Target |
|---|---|
| Click-through dari Quick Actions | > 50% session |
| Time to first action after login | < 30 detik |
| Bounce dari dashboard ke fitur | > 70% |

---

## 3. User Stories

- Sebagai user, aku ingin melihat ringkasan aktivitasku setelah login
- Sebagai user, aku ingin tahu berapa tweet dan thread yang sudah aku buat
- Sebagai user, aku ingin tahu sisa quota thread bulan ini langsung dari dashboard
- Sebagai user, aku ingin bisa langsung ke Post, Thread, atau Generate dengan satu klik
- Sebagai user, aku ingin melihat 5 aktivitas terakhirku (post & thread)
- Sebagai user, aku ingin mendapat tip atau insight singkat berdasarkan aktivitasku
- Sebagai user, aku ingin melihat nama dan avatar Twitter-ku di header dashboard

---

## 4. Scope

### 4.1 In Scope (V1)
- Halaman /dashboard sebagai halaman baru
- Header: avatar + nama Twitter + greeting
- 3 metric cards: total tweets, total threads, thread quota
- 3 quick action buttons: Post, Thread, Generate
- Recent activity list: 5 item terbaru (gabungan post + thread)
- AI insight: 1 tip berdasarkan aktivitas user
- Update redirect setelah login dari /dashboard/profile → /dashboard
- Update middleware setup check redirect ke /dashboard
- Tambah Dashboard ke sidebar navigation

### 4.2 Out of Scope (V1)
- Grafik atau chart aktivitas
- Notifikasi atau alert system
- Engagement metrics dari X (likes, impressions, dll)
- Comparison dengan periode sebelumnya
- Customizable dashboard layout

### 4.3 Future Scope (V2+)
- Aktivitas posting chart (per hari/minggu)
- Engagement metrics dari X API
- Goal tracking (target posting per minggu)
- Personalized AI recommendations berdasarkan trend

---

## 5. UI Specification

### 5.1 Page Layout: /dashboard

```
┌─────────────────────────────────────┐
│ Header                              │
│ [Avatar] Good morning, @username!   │
│ Connected as @rfanazhari            │
├─────────────────────────────────────┤
│ Metric Cards (3 cards horizontal)   │
│ [Tweets] [Threads] [Quota]          │
├─────────────────────────────────────┤
│ Quick Actions                       │
│ [✍️ Post] [🧵 Thread] [✨ Generate] │
├─────────────────────────────────────┤
│ Recent Activity                     │
│ [list 5 items]                      │
├─────────────────────────────────────┤
│ AI Insight                          │
│ [tip card]                          │
└─────────────────────────────────────┘
```

### 5.2 Header Section

- Avatar: profile_image_url dari twitter_accounts table (fallback: initials circle)
- Greeting: "Good morning / Good afternoon / Good evening" berdasarkan waktu lokal
- Name: twitter_username dari twitter_accounts table (format: "@username")
- Subtitle: "Here's your overview for [Month Year]"

### 5.3 Metric Cards

3 cards dalam satu row horizontal (stack vertikal di mobile):

**Card 1 — Total Tweets Posted**
- Icon: PenLine
- Value: count dari post history (tweets yang berhasil dipost, bukan dari thread)
- Label: "Tweets posted"
- Subtitle: "All time"

**Card 2 — Total Threads Created**
- Icon: AlignLeft
- Value: count dari threads table WHERE status = 'posted' OR 'partial'
- Label: "Threads created"
- Subtitle: "All time"

**Card 3 — Thread Quota**
- Icon: Zap
- Value: "X / 5" (remaining / limit)
- Label: "Threads this month"
- Subtitle: "Resets [date]"
- Color: green jika remaining > 1, amber jika remaining = 1, red jika remaining = 0

### 5.4 Quick Actions

3 buttons dalam satu row (stack di mobile):

| Button | Icon | Label | Destination |
|---|---|---|---|
| Primary | PenLine | Create Post | /dashboard/post |
| Secondary | AlignLeft | Create Thread | /dashboard/thread |
| Secondary | Sparkles | Generate with AI | /dashboard/generate |

### 5.5 Recent Activity

Title: "Recent Activity"
Subtitle: "Your last 5 posts and threads"

List 5 item terbaru, gabungan dari:
- Single tweets (dari tweet_history / X API — gunakan data lokal jika ada)
- Threads (dari threads table WHERE status = posted/partial)
- Sort: by created_at/posted_at DESC

Per item:
- Type badge kiri: "Post" (blue) | "Thread" (purple)
- Content preview: truncated tweet text atau thread topic
- Date: "14 Mar 2026"
- Status badge kanan: posted (green) / partial (amber) / failed (red)
- Clickable → navigate ke halaman relevan:
  - Post → /dashboard/history
  - Thread → /dashboard/thread (scroll ke history section)

Empty state: "Belum ada aktivitas. Mulai posting sekarang!"

### 5.6 AI Insight

Title: "AI Insight"
Single card dengan satu tip yang di-generate berdasarkan kondisi user.

**Insight logic (generate server-side, bukan via AI API):**

Rule-based insight berdasarkan data user:

| Kondisi | Insight |
|---|---|
| Belum pernah post sama sekali | "Yuk mulai! Buat tweet pertamamu atau coba Thread Creator untuk share ilmu kamu." |
| Tidak ada aktivitas 7 hari terakhir | "Sudah [X] hari sejak posting terakhir. Konsistensi adalah kunci — yuk buat konten hari ini!" |
| Quota thread hampir habis (remaining = 1) | "Sisa 1 thread quota bulan ini. Gunakan dengan bijak untuk topik yang paling impactful!" |
| Quota thread habis (remaining = 0) | "Thread quota bulan ini sudah habis. Quota baru tersedia [tanggal reset]." |
| Sudah post hari ini | "Bagus! Kamu sudah posting hari ini. Konsistensi seperti ini yang membangun audience." |
| Default (aktif tapi belum post hari ini) | "Trending topics hari ini bisa jadi bahan konten yang bagus. Cek Trends sekarang!" |

Insight card elements:
- Small icon kiri (lightbulb atau info)
- Insight text
- Optional CTA button kecil yang relevan dengan insight

**Note:** Insight ini rule-based, tidak memanggil AI API — untuk menjaga performa dan tidak menambah cost.

---

## 6. Technical Architecture

### 6.1 New Files
```
app/
└── dashboard/
    └── page.tsx                    # Dashboard Overview page

app/
└── api/
    └── dashboard/
        └── overview/
            └── route.ts            # GET: all dashboard data in one call
```

### 6.2 API: GET /api/dashboard/overview

Single endpoint yang mengambil semua data yang dibutuhkan dashboard dalam satu call untuk performa optimal.

Server logic:
- Auth check → 401
- Fetch twitter_username + profile_image_url dari twitter_accounts
- Count total tweets posted (dari post history)
- Count total threads (status posted/partial) dari threads table
- Fetch thread quota dari thread_usage
- Fetch 5 recent items (threads, gabungkan + sort by date)
- Generate rule-based insight berdasarkan data
- Return semua dalam satu response

Response contract:
```typescript
{
  success: boolean,
  profile: {
    username: string,
    profileImageUrl: string | null
  },
  metrics: {
    totalTweets: number,
    totalThreads: number,
    threadQuota: {
      used: number,
      limit: number,
      remaining: number,
      resetsAt: string
    }
  },
  recentActivity: {
    id: string,
    type: 'post' | 'thread',
    preview: string,
    status: string,
    createdAt: string,
    url: string | null
  }[],
  insight: {
    text: string,
    ctaLabel: string | null,
    ctaHref: string | null
  }
}
```

### 6.3 Auth & Redirect Changes

Update these files:
- `app/auth/callback/route.ts` — change redirect from `/dashboard/profile` to `/dashboard`
- `proxy.ts` (middleware) — update default redirect after auth from `/dashboard/profile` to `/dashboard`

### 6.4 Sidebar Update
Add Dashboard nav item as first item:
- href: /dashboard
- label: Dashboard
- icon: LayoutDashboard from lucide-react

Final nav order:
1. Dashboard ← new (first)
2. Profile
3. Post
4. Thread
5. History
6. Trends
7. Generate

---

## 7. Data Sources

| Data | Source | Notes |
|---|---|---|
| Twitter username + avatar | twitter_accounts table | Fetch once, no X API call |
| Total tweets | Post history count | Count all-time posted tweets |
| Total threads | threads table | Count status = posted OR partial |
| Thread quota | thread_usage table | Current month only |
| Recent activity | threads table | Top 5 by created_at DESC |
| Insight | Rule-based logic | Server-side, no AI API call |

**Important:** Dashboard tidak melakukan external API call ke X API — semua data dari Supabase DB untuk menjaga performa dan tidak menambah cost X API credits.

---

## 8. Error Handling

| Error | Handling |
|---|---|
| API call gagal | Tampilkan skeleton dengan error state per section |
| Avatar tidak tersedia | Fallback ke initials circle (2 huruf pertama username) |
| Tidak ada recent activity | Empty state message |
| Thread quota tidak ditemukan | Tampilkan 5/5 remaining (assume fresh user) |

---

## 9. Performance Considerations

- Single API call untuk semua data (bukan multiple parallel calls dari client)
- No X API calls — semua dari Supabase
- Insight rule-based, tidak panggil AI API
- Avatar image lazy loaded

---

## 10. Implementation Phases

### Phase 1 — Backend
- GET /api/dashboard/overview

### Phase 2 — Frontend
- app/dashboard/page.tsx
- Sidebar update (tambah Dashboard)
- Auth redirect update (callback + middleware)

---

## 11. Definition of Done

- [ ] GET /api/dashboard/overview returns all required data
- [ ] /dashboard page tampil dengan semua sections
- [ ] Header menampilkan avatar + greeting + username
- [ ] 3 metric cards tampil dengan data akurat
- [ ] Quick actions navigate ke halaman yang benar
- [ ] Recent activity menampilkan 5 item terbaru
- [ ] Insight card tampil dengan teks yang relevan
- [ ] Dashboard menjadi nav item pertama di sidebar
- [ ] Setelah login redirect ke /dashboard (bukan /dashboard/profile)
- [ ] Mobile responsive (320px+)
- [ ] Loading skeleton saat fetch
- [ ] CHANGELOG.md diupdate

---

*Last updated: March 15, 2026*
