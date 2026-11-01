# Cooperative Consumer & Admin Service Portal

A fully featured, responsive client-server portal built for cooperative consumers to file service requests (e.g., reconnection, billing disputes, ticket follow-ups) and for administrators to manage tickets, dispatch crews, and communicate with consumers.

---

##  Key Features

- **Consumer Dashboard**: Seamlessly request reconnections, file billing disputes, send follow-up messages in real time, and rate ticket resolutions.
- **Admin Control Center**: Complete ticketing workspace to review inquiries, update status, dispatch crews, maintain announcements, and update cooperative system settings.
- **Hybrid Data Layer**: Built with dynamic failover capabilities that utilize a local server-side database backup (SQLite) if Supabase environment variables are not configured.
- **Clean Responsive UI**: Visually rich styling using **Tailwind CSS**, interactive charts via **Recharts**, and icons from **Lucide-react**.

---

##  Database Schema & Supabase Setup

To hook the portal up to your **Supabase Cloud Database**, navigate to your Supabase SQL Editor and run the complete SQL script below. 

This provisions the tables for consumers' requests, chat threads, and administrators' responses:

```sql
-- 1. Create Profiles Table (Can be linked to Auth Users if permissions allow)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY, -- Matches the Supabase Auth User ID
  full_name VARCHAR(255),
  account_number VARCHAR(255),
  role VARCHAR(50),
  phone_number VARCHAR(50),
  address TEXT,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Fallback Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  "fullName" VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  "accountNumber" VARCHAR(255),
  role VARCHAR(50),
  "phoneNumber" VARCHAR(50),
  address TEXT,
  "profileImage" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Tickets Table (Stores consumer requests & admin responses in 'messages' & 'feedback')
CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(255) PRIMARY KEY,
  "consumerId" VARCHAR(255),
  "consumerName" VARCHAR(255),
  "accountNumber" VARCHAR(255),
  type VARCHAR(50),
  category VARCHAR(255),
  description TEXT,
  status VARCHAR(50),
  "isUrgent" INTEGER DEFAULT 0,
  "evidenceImage" TEXT,
  checklist TEXT,     -- Stores custom action steps as JSON
  messages TEXT,      -- Stores consumer requests and admin responses thread as JSON array
  feedback TEXT,      -- Stores admin final response and rating feedback as JSON
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create System Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT
);

-- 6. Create Public Inquiries Table
CREATE TABLE IF NOT EXISTS inquiries (
  id VARCHAR(255) PRIMARY KEY,
  "fullName" VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  subject VARCHAR(255),
  message TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Disable Row-Level Security (RLS) on all tables for easy API operations
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries DISABLE ROW LEVEL SECURITY;
```

---

##  Environment Variables

Configure your `.env` file at the root of the project to allow the application server and frontend client to connect with Supabase:

```env
# Client-side configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Server-side configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

---

##  Tech Stack & Structure

- **Frontend**: React 18 (JS & JSX), Vite, Tailwind CSS, Lucide Icons, Recharts, Framer Motion (for animations).
- **Backend**: Express Server running on Node.js.
- **Port**: Bound strictly to port `3000` internally.
- **Language**: Standard, clean modern ES6+ JavaScript, CSS, and HTML (TypeScript compiled out for streamlined execution).
