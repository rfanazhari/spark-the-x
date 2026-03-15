# Product Requirements Document (PRD)
## Feature: Thread History & Detail

> Version: 1.0
> Date: March 15, 2026
> Author: rfanazhari
> Status: Draft
> Parent Doc: docs/PRD-thread-feature.md

---

## 1. Overview

### 1.1 Background

Thread Creator (PRD-thread-feature.md) sudah menyimpan semua data thread ke DB sejak Phase 1. Data ini belum dimanfaatkan untuk ditampilkan ke user. Thread History adalah fitur lanjutan yang memungkinkan user melihat semua thread yang pernah dibuat, memantau statusnya, dan melihat detail konten per thread.

### 1.2 Problem Statement

User yang sudah membuat beberapa thread tidak punya cara untuk:
- Melihat riwayat thread yang pernah dibuat
- Mengecek status thread (apakah berhasil dipost atau partial)
- Melihat kembali konten tweet dalam thread tertentu
- Mengakses link thread yang sudah live di X

### 1.3 Solution

Tambahkan **Thread History section** di bagian bawah halaman `/dashboard/thread` yang menampilkan tabel riwayat thread, dengan kemampuan melihat detail setiap thread via modal popup.

---

## 2. Goals & Success Metrics

### 2.1 Feature Goals
- User bisa melihat semua thread yang pernah dibuat dalam satu tampilan
- User bisa mengakses detail konten setiap thread
- User bisa langsung buka thread di X dari history
- Modal detail responsive di semua ukuran layar

### 2.2 Success Metrics
| Metric | Target |
|---|---|
| User yang klik detail thread | > 30% dari user yang punya history |
| Time to find a thread | < 10 detik |

---

## 3. User Stories

- Sebagai user, aku ingin melihat semua thread yang pernah aku buat di halaman yang sama
- Sebagai user, aku ingin tabel diurutkan dari yang paling baru
- Sebagai user, aku ingin tahu status setiap thread (posted/partial/failed/draft)
- Sebagai user, aku ingin bisa langsung buka thread di X dari tabel
- Sebagai user, aku ingin lihat detail konten tweet dalam thread tertentu via popup
- Sebagai user, aku ingin popup detail thread responsive di mobile

---

## 4. Scope

### 4.1 In Scope (V1)
- Thread History table di `/dashboard/thread` (scroll ke bawah)
- Table selalu tampil — tidak bergantung pada state generate
- Kolom: Topic, Model, Tweets, Status, Date, Link
- Sort: latest created_at first
- Pagination: 10 per page
- Detail modal: popup dengan konten lengkap thread
- Mobile responsive modal

### 4.2 Out of Scope (V1)
- Filter atau search thread history
- Delete thread dari history
- Re-post thread yang failed
- Export thread history

### 4.3 Future Scope (V2+)
- Filter by status (posted/failed/draft)
- Search by topic
- Delete thread dari history
- Re-post partial/failed thread

---

## 5. UI Specification

### 5.1 Page Layout: /dashboard/thread

```
┌─────────────────────────────────┐
│ Quota Banner                    │
├─────────────────────────────────┤
│ Input Section                   │
│ (topic + model + generate btn)  │
├─────────────────────────────────┤
│ Preview Section                 │
│ (tampil setelah generate)       │
├─────────────────────────────────┤
│ ─────── Thread History ──────── │
│                                 │
│ [Table: 10 rows per page]       │
│ [Pagination]                    │
└─────────────────────────────────┘
```

Section header: "Thread History"
Subtitle: "Semua thread yang pernah kamu buat"

### 5.2 Table Columns

| Kolom | Lebar | Detail |
|---|---|---|
| Topic | flex | Truncated jika panjang, max 2 lines |
| Model | 100px | Badge: "Claude" (purple) atau "GPT-4o" (green) |
| Tweets | 80px | Angka jumlah tweet |
| Status | 100px | Badge warna per status (lihat 5.3) |
| Date | 120px | Format: "14 Mar 2026" |
| Link | 60px | Icon link → buka firstTweetUrl di tab baru (hanya jika status posted/partial) |

Setiap row clickable → buka Detail Modal
Kursor pointer saat hover row

### 5.3 Status Badges

| Status | Warna | Label |
|---|---|---|
| posted | Green | Posted |
| partial | Amber | Partial |
| failed | Red | Failed |
| draft | Gray | Draft |

### 5.4 Empty State

Jika belum ada thread:
- Ilustrasi sederhana atau icon
- Text: "Belum ada thread. Buat thread pertamamu di atas!"
- Tidak ada pagination

### 5.5 Pagination

- "← Previous" | "Page X of Y" | "Next →"
- Disable Prev pada page 1
- Disable Next pada page terakhir
- Touch-friendly (44px min height)

---

## 6. Detail Modal Specification

### 6.1 Trigger
- Klik anywhere pada table row
- Kecuali klik pada Link icon (itu buka tab baru)

### 6.2 Modal Header
- Title: topic thread (truncated jika panjang)
- Close button (X) top right
- Subtitle row: model badge + tweet count + date

### 6.3 Modal Body

**Info section:**
- Status badge (full width row)
- "View thread on X →" link button (hanya jika firstTweetUrl tersedia)

**Divider**

**Tweets section:**
- Label: "Thread content"
- List semua tweet urut by index:
  - Per tweet: type badge (Hook/number/CTA) + tweet text
  - Tweet status badge (posted/failed/pending) di kanan
  - Jika status posted: small link icon → buka tweet individual di X

### 6.4 Modal Footer
- Single "Close" button

### 6.5 Mobile Behavior
- Modal full width dengan safe padding
- Max height: 85vh dengan scroll di body
- Header dan footer sticky (tidak ikut scroll)
- Tweet list scrollable
- Touch-friendly close button (44px min)
- Backdrop tap untuk close

---

## 7. Technical Architecture

### 7.1 New API

**GET /api/thread/history**

Query params:
- `page` (default: 1)
- `limit` (default: 10)

Server logic:
1. Auth check → 401
2. Fetch threads WHERE user_id = current user
3. Order by created_at DESC
4. Paginate
5. Return threads + pagination meta

Response shape:
```typescript
{
  success: true,
  data: Thread[],
  meta: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**GET /api/thread/history/[id]**

Server logic:
1. Auth check → 401
2. Fetch thread WHERE id = param AND user_id = current user → 404 if not found
3. Fetch thread_tweets WHERE thread_id = id ORDER BY index ASC
4. Return thread + tweets

Response shape:
```typescript
{
  success: true,
  thread: Thread,
  tweets: ThreadTweet[]
}
```

### 7.2 New Files
```
app/
└── api/
    └── thread/
        ├── history/
        │   ├── route.ts          # GET: paginated thread list
        │   └── [id]/
        │       └── route.ts      # GET: thread detail + tweets
```

### 7.3 Component
```
components/
└── thread-detail-modal.tsx       # Reusable detail modal
```

---

## 8. Data Flow

```
Page load
  → GET /api/thread/history?page=1
  → Render table rows

User klik row
  → GET /api/thread/history/{id}
  → Open modal dengan data thread + tweets

User klik link icon di table
  → window.open(firstTweetUrl, '_blank')
  → Modal tidak terbuka

User klik pagination
  → GET /api/thread/history?page=N
  → Update table rows
```

---

## 9. Error Handling

| Error | Handling |
|---|---|
| Fetch history gagal | Toast error + tampilkan empty state |
| Fetch detail gagal | Toast error + tutup modal |
| Thread tidak punya firstTweetUrl | Sembunyikan link icon di table dan modal |
| Loading state | Skeleton rows saat fetch |

---

## 10. Implementation Phases

### Phase 1 — Backend
- GET /api/thread/history (paginated list)
- GET /api/thread/history/[id] (detail + tweets)

### Phase 2 — Frontend
- Thread History section di /dashboard/thread
- Table dengan pagination
- thread-detail-modal.tsx component
- Empty state
- Loading skeleton

---

## 11. Definition of Done

- [ ] GET /api/thread/history returns paginated data correctly
- [ ] GET /api/thread/history/[id] returns thread + tweets
- [ ] Table tampil di bawah form dan preview section
- [ ] Semua 6 kolom tampil dengan format yang benar
- [ ] Status badges warna sesuai
- [ ] Pagination berfungsi
- [ ] Klik row membuka modal detail
- [ ] Modal menampilkan semua tweet dengan type badge
- [ ] "View on X" link berfungsi di table dan modal
- [ ] Empty state tampil jika belum ada thread
- [ ] Modal responsive di mobile (320px+)
- [ ] Backdrop tap menutup modal
- [ ] Loading skeleton saat fetch
- [ ] docs/CHANGELOG.md diupdate

---

*Last updated: March 15, 2026*
