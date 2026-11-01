-- ========================================================
-- Supabase Schema Migration Script
-- Run this in your new Supabase Project SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ========================================================

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

-- Enable RLS and public/service-role access policies
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
