# Product Requirements Document (PRD)
## monetize-fan — SaaS Transformation

> Version: 1.0
> Date: March 14, 2026
> Author: rfanazhari
> Status: Draft

---

## 1. Overview

### 1.1 Background

monetize-fan awalnya dibangun sebagai tool personal untuk manage satu akun Twitter (@rfanazhari). Seiring berkembangnya kebutuhan, produk ini akan ditransformasi menjadi platform SaaS yang memungkinkan siapapun mendaftar, menghubungkan akun Twitter mereka, dan menggunakan semua fitur yang ada.

### 1.2 Problem Statement

Content creator, pebisnis, dan individu yang ingin monetisasi akun Twitter mereka tidak punya tools yang:
- Terjangkau untuk skala kecil
- Mudah disetup tanpa background teknis
- Menggabungkan AI content generation dengan Twitter management dalam satu platform

### 1.3 Solution

Platform SaaS berbasis web yang memungkinkan user untuk:
1. Mendaftar dan login dengan mudah via Magic Link
2. Menghubungkan akun Twitter mereka dengan aman
3. Menggunakan semua fitur dashboard (profile, post, trends, generate, history)
4. Mengelola konten Twitter mereka dengan bantuan AI

---

## 2. Goals & Success Metrics

### 2.1 Business Goals
- Transformasi dari personal tool ke produk yang bisa dimonetisasi
- Membangun user base awal sebagai validasi market
- Menjadi revenue stream melalui subscription atau credit-based pricing

### 2.2 Product Goals
- User bisa onboard dan mulai posting dalam < 5 menit
- Zero data leakage antar user (credentials terisolasi per user)
- Platform stabil untuk skala awal 0–100 users

### 2.3 Success Metrics (3 Bulan Pertama)
| Metric | Target |
|---|---|
| Registered users | 100 |
| Users yang berhasil connect Twitter | 70% dari registered |
| Weekly active users | 40% dari registered |
| Avg posts per user per week | 5 |

---

## 3. User Personas

### Persona 1 — Content Creator Pemula
- Umur: 18–25 tahun
- Latar belakang: mahasiswa atau fresh graduate
- Goal: Grow Twitter following, mulai monetisasi
- Pain point: Tidak tahu harus posting apa, tidak konsisten

### Persona 2 — Pebisnis / Startup Founder
- Umur: 25–35 tahun
- Latar belakang: punya bisnis kecil atau startup early stage
- Goal: Bangun personal brand, attract customers via Twitter
- Pain point: Terlalu sibuk, butuh automation tapi tetap personal

### Persona 3 — Professional / Side Hustler
- Umur: 25–40 tahun
- Latar belakang: pekerja kantoran yang ingin income tambahan
- Goal: Monetisasi knowledge via Twitter
- Pain point: Tidak punya waktu riset tren dan buat konten setiap hari

---

## 4. Scope

### 4.1 In Scope (V1 SaaS)
- Authentication system (Magic Link via Supabase)
- User profile management (app-level, bukan Twitter profile)
- Twitter credentials setup & secure storage
- Per-user Twitter client (credentials from DB)
- Semua existing features: Profile, Post, History, Trends, Generate
- Row Level Security untuk isolasi data antar user
- Enkripsi credentials Twitter di database
- Onboarding flow (setup page setelah register)
- Middleware proteksi route

### 4.2 Out of Scope (V1)
- Multiple Twitter accounts per user
- Subscription/billing system
- Admin dashboard
- Analytics per user
- Team/collaboration features
- Mobile native app

### 4.3 Future Scope (V2+)
- Multiple Twitter accounts per user
- Subscription tiers (Free, Pro, Business)
- Usage-based billing
- Team workspace
- Scheduled posting (queue)
- Analytics dashboard

---

## 5. User Stories

### Authentication
- Sebagai user baru, aku ingin bisa daftar dengan email saja tanpa password
- Sebagai user, aku ingin menerima magic link di email dan langsung masuk ke dashboard
- Sebagai user, aku ingin sesi login tetap aktif selama beberapa hari tanpa harus login ulang
- Sebagai user, aku ingin bisa logout kapan saja

### Onboarding & Setup
- Sebagai user baru yang baru login pertama kali, aku ingin diarahkan ke halaman setup
- Sebagai user di setup page, aku ingin bisa input credentials Twitter saya dengan panduan yang jelas
- Sebagai user, aku ingin credentials Twitter saya tersimpan dengan aman (tidak plain text)
- Sebagai user yang sudah setup, aku ingin langsung masuk ke dashboard tanpa setup ulang

### Dashboard & Features
- Sebagai user, aku ingin semua fitur (Profile, Post, Trends, Generate, History) bekerja dengan akun Twitter saya sendiri
- Sebagai user, aku ingin data saya tidak bisa diakses oleh user lain
- Sebagai user, aku ingin bisa update credentials Twitter saya jika ada perubahan

---

## 6. Technical Architecture

### 6.1 Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth (Magic Link) |
| Database | Supabase (PostgreSQL) |
| ORM | Supabase JS Client |
| Twitter SDK | twitter-api-v2 |
| AI | Anthropic Claude + OpenAI GPT-4o Mini |
| Encryption | Node.js crypto (AES-256-GCM) |
| Hosting | Vercel (planned) |

### 6.2 Database Schema

```sql
-- Managed by Supabase Auth
-- auth.users (id, email, created_at, ...)

-- App-level user profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Twitter account credentials per user
CREATE TABLE twitter_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitter_username TEXT NOT NULL,
  twitter_user_id TEXT,
  consumer_key TEXT NOT NULL,        -- encrypted
  consumer_secret TEXT NOT NULL,     -- encrypted
  access_token TEXT NOT NULL,        -- encrypted
  access_token_secret TEXT NOT NULL, -- encrypted
  bearer_token TEXT NOT NULL,        -- encrypted
  client_id TEXT,                    -- encrypted (optional, OAuth 2.0)
  client_secret TEXT,                -- encrypted (optional, OAuth 2.0)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 Row Level Security (RLS)

```sql
-- profiles: user can only read/write their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- twitter_accounts: user can only access their own accounts
ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own twitter accounts"
  ON twitter_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own twitter accounts"
  ON twitter_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own twitter accounts"
  ON twitter_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own twitter accounts"
  ON twitter_accounts FOR DELETE USING (auth.uid() = user_id);
```

### 6.4 Encryption Strategy
- Algorithm: AES-256-GCM
- Key: `ENCRYPTION_KEY` (32-byte hex) stored in `.env.local`
- Each field encrypted individually before insert
- Decrypted on-the-fly when building Twitter client
- Never return decrypted credentials to client-side

### 6.5 Twitter Client Factory

```typescript
// lib/twitter.ts (new)
export async function getTwitterClient(userId: string) {
  // 1. Fetch encrypted credentials from DB
  // 2. Decrypt each field
  // 3. Return rwClient (twitter-api-v2)
}
```

### 6.6 Route Protection (Middleware)

```
/                    → public (landing page)
/auth/*              → public (login, callback)
/setup               → protected (auth required, redirect if already setup)
/dashboard/*         → protected (auth + setup required)
/api/twitter/*       → protected (auth + setup required)
/api/ai/*            → protected (auth required)
```

---

## 7. User Flow

### 7.1 New User Flow
```
Landing Page
  → Klik "Get Started"
  → /auth/login (input email)
  → Cek inbox, klik Magic Link
  → Callback → create profile di DB
  → Cek twitter_accounts → belum ada
  → Redirect ke /setup
  → Input Twitter credentials
  → Credentials dienkripsi → simpan ke DB
  → Redirect ke /dashboard/profile
```

### 7.2 Returning User Flow
```
Landing Page / Direct URL
  → /auth/login (input email)
  → Klik Magic Link
  → Callback → cek twitter_accounts → sudah ada
  → Redirect ke /dashboard/profile
```

### 7.3 Dashboard API Flow
```
User action (e.g. Post Tweet)
  → /api/twitter/post (POST)
  → Middleware: cek auth session
  → getTwitterClient(userId)
    → fetch credentials from DB
    → decrypt credentials
    → return rwClient
  → rwClient.v2.tweet(text)
  → Return response
```

---

## 8. Pages & Routes

| Route | Description | Auth Required | Setup Required |
|---|---|---|---|
| `/` | Landing page | ❌ | ❌ |
| `/auth/login` | Magic link login | ❌ | ❌ |
| `/auth/callback` | Supabase auth callback | ❌ | ❌ |
| `/setup` | Twitter credentials setup | ✅ | ❌ |
| `/dashboard/profile` | Twitter profile manager | ✅ | ✅ |
| `/dashboard/post` | Create tweet | ✅ | ✅ |
| `/dashboard/history` | Post history | ✅ | ✅ |
| `/dashboard/trends` | Trending topics | ✅ | ✅ |
| `/dashboard/generate` | AI post generator | ✅ | ✅ |

---

## 9. Security Requirements

| Requirement | Implementation |
|---|---|
| Credentials tidak disimpan plain text | AES-256-GCM encryption |
| Data terisolasi antar user | Supabase RLS |
| Route protection | Next.js middleware |
| Session management | Supabase Auth JWT |
| API route protection | Server-side session check |
| Credentials tidak leak ke client | Decrypt hanya di server |
| Rate limiting | Per-user middleware check |

---

## 10. Environment Variables (Updated)

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

# Removed: all TWITTER_* vars (now stored per-user in DB)
```

---

## 11. Implementation Phases

### Phase A — Supabase Setup
- Create Supabase project
- Run schema SQL (profiles + twitter_accounts)
- Enable RLS + policies
- Configure env vars

### Phase B — Auth Flow
- Magic Link login page
- Auth callback handler
- Profile auto-create on first login
- Middleware for route protection
- Logout functionality

### Phase C — Setup Page
- /setup form (input Twitter credentials)
- Validate credentials by test API call
- Encrypt + save to DB
- Redirect to dashboard after setup

### Phase D — Refactor Twitter Client
- Remove lib/twitter.ts singleton
- Create getTwitterClient(userId) factory
- Decrypt credentials on-the-fly
- Update all /api/twitter/* routes

### Phase E — Update API Routes
- Pass userId from session to all routes
- Replace rwClient import with getTwitterClient(userId)
- Test all existing features still work

### Phase F — Landing Page
- Simple landing page with product description
- CTA: "Get Started Free"
- Link to /auth/login

### Phase G — Documentation & Changelog
- Update monetize-fan.md
- Update CLAUDE.md
- Update AGENTS.md
- Append to CHANGELOG.md

---

## 12. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Encryption key lost | High | Backup key, document recovery process |
| Supabase RLS misconfiguration | High | Test each policy thoroughly |
| Twitter credentials invalid at setup | Medium | Validate by test API call before saving |
| Session expired mid-use | Low | Graceful redirect to login |
| Rate limit per user on Twitter API | Medium | Show clear error, link to X billing |

---

## 13. Definition of Done (V1 SaaS)

- [ ] User bisa register dan login via Magic Link
- [ ] User baru diarahkan ke /setup setelah login pertama
- [ ] Credentials Twitter tersimpan terenkripsi di DB
- [ ] Semua fitur dashboard berjalan dengan credentials dari DB
- [ ] Data antar user terisolasi (RLS aktif)
- [ ] Route protection berjalan di semua protected pages
- [ ] Existing features tidak ada yang broken
- [ ] Mobile responsive tetap terjaga

---

*Last updated: March 14, 2026*
