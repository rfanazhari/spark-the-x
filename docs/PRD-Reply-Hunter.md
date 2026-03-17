monetize-fan

**PRD --- Reply Hunter**

*Fitur pencari thread ramai & AI reply generator untuk meningkatkan
impressions secara organik*

v1.0 • March 17, 2026 • \@rfanazhari

**1. Overview**

Reply Hunter adalah fitur baru di monetize-fan yang membantu creator
menemukan thread ramai yang relevan dengan niche mereka, lalu
menggunakan AI untuk generate reply yang berkualitas --- semua dari satu
dashboard.

Insight dari data analytics \@rfanazhari (Mar 17, 2026) membuktikan
bahwa 2 post dengan impressi tertinggi hari itu adalah replies ke thread
orang lain, bukan konten original. Reply 2 kalimat menghasilkan 277
impressi, lebih tinggi dari thread 10 tweet yang ditulis sendiri.

Reply Hunter mengotomasi proses ini: discover thread relevan → generate
reply berkualitas → post langsung → track hasilnya.

**2. Problem Statement**

**2.1 Masalah Utama**

-   Membuat konten original setiap hari membutuhkan waktu dan energi
    yang besar

-   Reply manual ke thread ramai = proses yang lambat: cari thread →
    buka X → tulis reply → post

-   Tidak ada cara untuk track apakah reply yang ditulis menghasilkan
    impressi dan follower baru

-   Creator kehilangan peluang exposure besar karena tidak masuk ke
    conversation yang sudah ramai

**2.2 Insight Kunci**

Masuk ke conversation yang sudah ramai jauh lebih efisien dari broadcast
konten sendiri karena:

-   Thread ramai sudah punya audience yang engaged --- reply langsung
    tampil di depan mereka

-   Algoritma X memprioritaskan akun yang aktif 2 arah, bukan hanya
    broadcaster

-   Reply thoughtful = social proof instan --- orang tertarik klik
    profil kamu

**3. Goals & Success Metrics**

**3.1 Goals**

-   Membantu user menemukan thread relevan dalam \< 30 detik

-   Menghasilkan reply berkualitas yang sesuai brand identity user

-   Meningkatkan impressi harian user minimal 30% dalam 2 minggu
    pemakaian

-   Membuat engagement strategy lebih sistematis dan terukur

**3.2 Success Metrics**

  ------------------------------------------------------------------------
  **Metric**                     **Baseline**         **Target (30 hari)**
  ------------------------------ -------------------- --------------------
  Avg daily impressions          \~300/hari           \> 1,000/hari

  Reply engagement rate          \-                   \> 5%

  Time to find + reply thread    15-20 menit          \< 5 menit

  New followers dari reply       \-                   \> 10/minggu
  ------------------------------------------------------------------------

**4. User Stories**

**4.1 Primary User: \@rfanazhari (Tech Educator)**

-   Sebagai creator, aku ingin melihat thread tech yang sedang ramai
    hari ini, agar aku bisa masuk ke conversation yang relevan

-   Sebagai creator, aku ingin AI generate 3 opsi reply berdasarkan
    identity dan tone aku, agar reply-nya konsisten dengan brand aku

-   Sebagai creator, aku ingin posting reply langsung dari dashboard
    tanpa buka X, agar workflow-nya lebih cepat

-   Sebagai creator, aku ingin tahu berapa impressi yang datang dari
    setiap reply yang aku buat, agar aku bisa evaluasi strategi
    engagement-ku

**4.2 Future User: Creator Lain**

-   Sebagai creator baru, aku ingin set niche keyword aku sendiri, agar
    hasil discovery-nya relevan dengan topik yang aku bahas

-   Sebagai creator, aku ingin save thread yang menarik untuk di-reply
    nanti, agar aku tidak kehilangan peluang engagement

**5. Feature Specification**

**5.1 Thread Discovery**

**Deskripsi**

Halaman utama fitur yang menampilkan thread ramai berdasarkan
keyword/niche yang relevan dengan user.

**Input**

-   Keyword / niche (default dari IDENTITY.md user: AI, Tech,
    Programming, Indonesia)

-   Filter: minimum engagement (likes + replies + reposts), minimum
    follower author

-   Bahasa: Indonesia / English / Both

**Output**

-   List thread yang diurutkan berdasarkan engagement score

-   Per thread ditampilkan: author, follower count, preview tweet,
    engagement stats, waktu post

-   Badge visual: Hot (\>1000 engagements), Rising (growing fast), Niche
    (keyword match tinggi)

**Business Rules**

-   Refresh otomatis setiap 30 menit

-   Maksimal 20 thread per load, ada tombol Load More

-   Filter thread dari akun yang sudah di-reply dalam 24 jam terakhir
    (hindari spam)

**5.2 AI Reply Generator**

**Deskripsi**

Setelah user memilih thread, AI generate 3 opsi reply yang sesuai dengan
identity, tone, dan niche user.

**Input**

-   Tweet yang dipilih (full text + context thread)

-   IDENTITY.md user sebagai system context

-   Pilihan tone: Agree & Add Value / Disagree Respectfully / Ask
    Insightful Question

**Output**

-   3 opsi reply, masing-masing max 280 karakter

-   Label tone per opsi: Educational / Bold / Curious

-   Character counter real-time

-   Edit inline sebelum posting

**Business Rules**

-   System prompt selalu inject IDENTITY.md user

-   Reply tidak boleh mengandung spam trigger words

-   Jika Claude gagal, fallback ke GPT-4o Mini (konsisten dengan
    existing pattern)

**5.3 Quick Post**

**Deskripsi**

Post reply langsung dari dashboard tanpa buka X.

**Flow**

-   User pilih salah satu dari 3 opsi reply (atau edit custom)

-   Preview reply + original tweet

-   Klik Post --- sistem post sebagai reply ke tweet tersebut

-   Konfirmasi sukses + link ke tweet

**Business Rules**

-   Rate limit: maksimal 10 reply per jam per user (sesuai X API limit)

-   Log setiap reply yang dipost ke tabel reply_history

**5.4 Reply Analytics**

**Deskripsi**

Dashboard sederhana yang track performance setiap reply yang dipost
melalui fitur ini.

**Metrics yang ditampilkan**

-   Impressions per reply (sync dari X API setiap 6 jam)

-   Engagements (likes, replies balik, reposts)

-   New follows yang datang dalam 24 jam setelah reply (estimasi via
    profile visits delta)

-   Top performing reply of the week

**6. Technical Specification**

**6.1 API Endpoints Baru**

  -------------------------------------------------------------------------------------
  **Endpoint**                     **Method**   **Auth**      **Deskripsi**
  -------------------------------- ------------ ------------- -------------------------
  /api/reply-hunter/discover       GET          Supabase JWT  Fetch thread ramai by
                                                              keyword

  /api/reply-hunter/generate       POST         Supabase JWT  AI generate reply options

  /api/reply-hunter/post           POST         Supabase JWT  Post reply ke X

  /api/reply-hunter/history        GET          Supabase JWT  Fetch reply history +
                                                              metrics

  /api/reply-hunter/sync-metrics   POST         Internal cron Sync metrics dari X API
  -------------------------------------------------------------------------------------

**6.2 Database Schema**

**Tabel: reply_history**

  ------------------------------------------------------------------------------
  **Column**               **Type**        **Deskripsi**
  ------------------------ --------------- -------------------------------------
  id                       uuid (PK)       Primary key

  user_id                  uuid (FK)       Reference ke auth.users

  original_tweet_id        text            ID tweet yang di-reply

  original_tweet_text      text            Isi tweet yang di-reply

  original_author_handle   text            Handle author tweet asli

  reply_tweet_id           text            ID reply yang dipost

  reply_text               text            Isi reply yang dipost

  tone_label               text            Educational / Bold / Curious

  impressions              integer         Impressions (sync berkala)

  engagements              integer         Total engagements

  created_at               timestamptz     Waktu posting

  metrics_synced_at        timestamptz     Waktu terakhir sync metrics
  ------------------------------------------------------------------------------

**6.3 X API Endpoints yang Digunakan**

  ------------------------------------------------------------------------
  **X API Endpoint**          **Method**    **Kegunaan**
  --------------------------- ------------- ------------------------------
  GET /2/tweets/search/recent Bearer Token  Search thread by keyword

  POST /2/tweets              OAuth 1.0a    Post reply
                                            (in_reply_to_tweet_id)

  GET /2/tweets/:id           Bearer Token  Fetch tweet metrics untuk sync
  ------------------------------------------------------------------------

**6.4 AI System Prompt Template**

Berikut adalah template system prompt yang digunakan di
/api/reply-hunter/generate:

You are a reply ghostwriter for {user.handle}, a {user.niche} educator.

Identity: {IDENTITY.md content}

Tweet to reply: {tweet.text}

Tone requested: {tone}

Generate 3 reply options. Max 280 chars each. Return JSON array.

**6.5 File Structure**

-   app/dashboard/reply-hunter/page.tsx --- Halaman utama fitur

-   app/dashboard/reply-hunter/\_components/ThreadCard.tsx --- Card per
    thread

-   app/dashboard/reply-hunter/\_components/ReplyModal.tsx --- Modal
    generate + post reply

-   app/dashboard/reply-hunter/\_components/AnalyticsPanel.tsx --- Panel
    analytics

-   app/api/reply-hunter/discover/route.ts --- Search thread endpoint

-   app/api/reply-hunter/generate/route.ts --- AI generate reply
    endpoint

-   app/api/reply-hunter/post/route.ts --- Post reply endpoint

-   app/api/reply-hunter/history/route.ts --- Fetch history endpoint

-   app/api/reply-hunter/sync-metrics/route.ts --- Cron sync metrics

**7. UI/UX Specification**

**7.1 Layout**

-   Sidebar entry baru: \'Reply Hunter\' di bawah \'Trends\'

-   Halaman terbagi 2 panel: kiri (thread list) + kanan (reply composer
    / analytics)

-   Mobile: stack vertical, thread list di atas, composer di bawah

**7.2 Thread Card**

-   Avatar + handle + follower count author

-   Preview tweet (max 2 baris, truncated)

-   Engagement bar: likes, replies, reposts dalam format ringkas

-   Badge: Hot / Rising / Niche

-   Tombol: \'Reply with AI\' (primary) + \'View on X\' (secondary)

**7.3 Reply Modal**

-   Original tweet ditampilkan di atas sebagai context

-   Tone selector: 3 tab (Educational \| Bold \| Curious)

-   3 opsi reply dalam card, bisa diklik untuk select

-   Edit area inline untuk modifikasi sebelum post

-   Character counter real-time (merah jika \> 280)

-   Tombol Post + loading state

**8. Phasing & Timeline**

  -----------------------------------------------------------------------------
  **Phase**   **Nama**         **Scope**                         **Estimasi**
  ----------- ---------------- --------------------------------- --------------
  Phase 1     Core Loop        Thread discovery + AI generate +  3-4 hari
                               post reply                        

  Phase 2     Analytics        Reply history + metrics sync +    2-3 hari
                               analytics panel                   

  Phase 3     Polish           Filters, badges, rate limit UI,   1-2 hari
                               notifikasi                        

  Phase 4     Multi-user       Custom keywords per user,         2-3 hari
                               IDENTITY.md per user              
  -----------------------------------------------------------------------------

**9. Risks & Mitigations**

  -----------------------------------------------------------------------
  **Risk**                 **Severity**    **Mitigation**
  ------------------------ --------------- ------------------------------
  X API rate limit untuk   Medium          Cache hasil search 30 menit,
  search                                   batasi 20 thread per load

  Reply dianggap spam oleh High            Rate limit 10 reply/jam,
  X                                        filter spam trigger words,
                                           jangan auto-post

  AI generate reply yang   Medium          Selalu inject IDENTITY.md,
  off-brand                                user wajib review sebelum post

  Metrics sync tidak       Low             Label jelas \'last synced X
  akurat                                   hours ago\', refresh manual
                                           tersedia

  X API cost tinggi untuk  Medium          Phase 1: limit discover 5
  search volume besar                      request/hari/user + cache 15
                                           menit per user+keywords
  -----------------------------------------------------------------------

**10. Vibe Coding Prompt**

Gunakan prompt berikut untuk mulai build fitur ini:

Add a new feature called \'Reply Hunter\' to monetize-fan.

GOAL: Help users find trending threads in their niche and generate
AI-powered replies.

NEW PAGE: /dashboard/reply-hunter

Add \'Reply Hunter\' to sidebar below \'Trends\'.

FEATURES:

1\. Thread Discovery --- GET /api/reply-hunter/discover

Use GET /2/tweets/search/recent with Bearer Token.

Default keywords: AI, programming, tech, Indonesia.

Sort by engagement. Return max 20 results.

2\. AI Reply Generator --- POST /api/reply-hunter/generate

Use Claude API with IDENTITY.md as system context.

Generate 3 reply options. Max 280 chars. Return JSON.

Tone options: educational, bold, curious.

Fallback to GPT-4o Mini if Claude fails.

3\. Post Reply --- POST /api/reply-hunter/post

Use rwClient.v2.tweet() with reply: { in_reply_to_tweet_id }.

Save to reply_history table in Supabase.

Rate limit: max 10 replies per hour per user.

monetize-fan • PRD Reply Hunter v1.0 • March 2026 • \@rfanazhari
