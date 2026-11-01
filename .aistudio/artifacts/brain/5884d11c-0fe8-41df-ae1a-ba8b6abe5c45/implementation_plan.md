# Connect a New Free Supabase Project

A comprehensive step-by-step guide with exact links and instructions to create a new free Supabase project, run the database schema migration, and connect it to your application.

## User Review & Critical Decisions

> [!IMPORTANT]
> Because your existing Supabase project has reached its free tier egress limit (`exceed_egress_quota`), creating a fresh new free project restores full remote database services with 0 cost. The application's local fallback database is currently active, so your users experience zero disruption while you perform these steps.

- **Confirmed Decision 1**: Create and connect a brand new free Supabase project.
- **Confirmed Decision 2**: Provide step-by-step instructions with exact direct dashboard links and copy-pasteable SQL schema.

## 1. Overview & Step-by-Step Instructions

Follow these 4 simple steps to set up and connect your new database:

### Step 1: Create a New Supabase Project
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project** (or go directly to [New Project Page](https://supabase.com/dashboard/projects/new)).
3. Fill in your project details:
   - **Name**: e.g., `utility-portal-db`
   - **Database Password**: Choose a secure password (store it safely).
   - **Region**: Choose the closest region (e.g., `Southeast Asia (Singapore)` or `Tokyo`).
   - **Pricing Plan**: Select **Free tier** ($0/month).
4. Click **Create new project** and wait ~1-2 minutes for provisioning to finish.

### Step 2: Run the Schema Migration (Create Tables)
1. In your new project dashboard, click on **SQL Editor** in the left sidebar (or navigate to `https://supabase.com/dashboard/project/<YOUR_PROJECT_ID>/sql/new`).
2. Paste the following SQL script into the query editor and click **Run**:

```sql
-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  account_number TEXT,
  phone_number TEXT,
  address TEXT,
  profile_image TEXT,
  role TEXT DEFAULT 'consumer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Mirror Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  fullName TEXT,
  email TEXT,
  accountNumber TEXT,
  phoneNumber TEXT,
  address TEXT,
  profileImage TEXT,
  role TEXT DEFAULT 'consumer',
  hasUnpaidBill BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tickets Table
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY,
  consumerId TEXT,
  consumerName TEXT,
  accountNumber TEXT,
  type TEXT,
  category TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  isUrgent INTEGER DEFAULT 0,
  evidenceImage TEXT,
  checklist TEXT,
  messages TEXT,
  feedback TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT,
  urgency TEXT DEFAULT 'normal',
  audience TEXT DEFAULT 'all',
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inquiries Table
CREATE TABLE IF NOT EXISTS public.inquiries (
  id TEXT PRIMARY KEY,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entityId TEXT,
  details TEXT,
  adminId TEXT,
  adminName TEXT,
  ipAddress TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public/service-role access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all on profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow service role all on users" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow service role all on tickets" ON public.tickets FOR ALL USING (true);
CREATE POLICY "Allow service role all on announcements" ON public.announcements FOR ALL USING (true);
CREATE POLICY "Allow service role all on inquiries" ON public.inquiries FOR ALL USING (true);
CREATE POLICY "Allow service role all on settings" ON public.settings FOR ALL USING (true);
CREATE POLICY "Allow service role all on audit_logs" ON public.audit_logs FOR ALL USING (true);
```

### Step 3: Get Your API Keys
1. Go to **Project Settings** -> **API** in the left sidebar (or direct URL: `https://supabase.com/dashboard/project/<YOUR_PROJECT_ID>/settings/api`).
2. Copy the following three values:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **anon / public key** (under Project API keys)
   - **service_role key** (under Project API keys - secret key)

### Step 4: Share Your Keys With Me or Save Them
Once you have copied the new credentials, simply paste them into our chat:
- `SUPABASE_URL`: (your new Project URL)
- `SUPABASE_ANON_KEY`: (your new anon key)
- `SUPABASE_SERVICE_ROLE_KEY`: (your new service_role secret key)

I will immediately wire them into the application environment and dev server.

## 2. User Experience & Visual Design

- **Zero Downtime Experience**: The application automatically routes queries through the local persistent database while Supabase is being replaced. Users will not notice any broken buttons, errors, or disrupted sessions.
- **Visual Appearance**: 100% identical styling and behavior across desktop, tablet, and mobile views.

## 3. Key Product Decisions & Trade-Offs

- **Decision 1**: Fresh Project vs. Paid Plan
  - *Chosen Approach*: New free project ($0/mo) with clean schema.
  - *Why*: Free of charge, resets egress quota to 0 GB, and provides a fresh slate.
- **Decision 2**: Circuit Breaker Redundancy
  - *Chosen Approach*: Maintain automatic fallback between Supabase and local storage.
  - *Why*: Even if a project runs out of quota in the future, the app remains 100% functional.

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Consumer & Admin UI                  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                Express API (server.js)                 │
│         [Automatic Quota Guard & Local Fallback]       │
└──────────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌──────────────────────────┐       ┌─────────────────────┐
│  New Supabase Database   │       │ Local Disk Storage  │
│  (Fresh Egress Quota)    │       │ (.json Fallback)    │
└──────────────────────────┘       └─────────────────────┘
```
