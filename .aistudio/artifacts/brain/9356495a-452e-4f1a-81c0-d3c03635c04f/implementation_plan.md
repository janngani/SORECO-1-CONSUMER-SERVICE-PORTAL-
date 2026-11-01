# Role-Based URL Protection & URL SQL Injection Security Defense

Implementation plan to enforce strict bidirectional route segregation between Admin and Consumer portals, along with real-time detection and neutralization of SQL injection payloads in URL paths and parameters with alert toasts.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during clarification:
> - **Cross-Role Access Action**: Automatically redirect unauthorized access attempts to the user's appropriate role dashboard (Consumers attempting `/admin` $\rightarrow$ `/dashboard`; Admins attempting `/dashboard` $\rightarrow$ `/admin`) and trigger an alert toast.
> - **SQL Injection Action**: Strip malicious query parameters and path segments, redirect safely, and immediately trigger a high-priority red security alert toast.

- **Confirmed Decision 1**: Role segregation is mutual. Consumers are restricted from all `/admin` and `/barangays` routes; Admins are restricted from consumer-specific routes (e.g., `/dashboard`, service applications).
- **Confirmed Decision 2**: SQL Injection defense is dual-layered (client-side React Router guard + server-side Express middleware) to catch both in-app navigation and direct browser URL entries (e.g., `soreco-1.com/' OR '1'='1'`).

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Strict Bidirectional Route Boundary**: Prevents consumers from accessing admin-only views (`/admin`, `/barangays`, `/barangays/:name`) and prevents administrators from accessing consumer-only views (`/dashboard`, service request forms, etc.). Unauthorized role navigations are automatically redirected to their respective home dashboard accompanied by an informative security toast.
  2. **URL SQL Injection Shield**: Actively inspects URL paths, queries, and hash fragments for SQL injection patterns (such as `' OR '1'='1`, `UNION SELECT`, `--`, `/*`, `DROP TABLE`, `admin'--`, etc.). When detected, it neutralizes the malicious input, redirects the user to safety, and surfaces a security alert toast notification.
- **Target Audience**: Cooperative consumers and SORECO-1 administrators, safeguarding system integrity and preventing privilege escalation or tampering attempts.
- **Key Value**: Protects the portal against OWASP Top 10 Injection and Broken Access Control vulnerabilities (A01:2021 & A03:2021) while delivering real-time UX feedback.

---

## 2. User Experience & Visual Design

- **Cross-Role Route Rejection Flow**:
  - *Consumer accesses `/admin` or `/barangays`*:
    - Automatically redirected to `/dashboard`.
    - Toast: `toast.error("Access Denied: You do not have administrator privileges to view this section.")`
  - *Admin accesses `/dashboard` or consumer service pages*:
    - Automatically redirected to `/admin`.
    - Toast: `toast.info("Notice: Consumer portal route is restricted. Redirected to Admin Dashboard.")`
  - *Unauthenticated guest accesses protected routes*:
    - Automatically redirected to `/login`.
    - Toast: `toast.warning("Authentication required. Please sign in to access your portal.")`
- **SQL Injection URL Interception Flow**:
  - *User enters payload in URL (e.g., `soreco-1.com/' OR '1'='1` or `/login?user=' OR 1=1--`)*:
    - Navigation is immediately intercepted before page execution.
    - URL is cleaned and sanitized; user is safely transitioned to `/` or `/login`.
    - Toast: `toast.error("Security Alert: Malicious SQL injection payload detected in URL. The suspicious input was blocked and sanitized.", { duration: 6000 })`

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Layer (Client + Server) URL Scanning**
  - *Chosen Approach*: Implement a client-side navigation guard (`UrlSecurityGuard`) in React Router and an Express middleware in `server.js`.
  - *Why*: Direct address-bar entries or cURL/automated vulnerability scanners hit Express first; client-side React Router transitions hit client hooks first. Covering both layers guarantees complete protection.
- **Decision 2: Sonner Toast Rate-Limiting & Debouncing**
  - *Chosen Approach*: Track recently triggered security toasts in session state / memory with a 1.5s debounce.
  - *Why*: Prevents toast spamming if a browser or redirection loop rapidly attempts to re-evaluate the same URL fragment.
- **Decision 3: Dedicated Consumer vs. Admin ProtectedRoute Components**
  - *Chosen Approach*: Refactor `ProtectedRoute` in `src/App.jsx` to support `adminOnly`, `consumerOnly`, and general authenticated routes with proactive toast messaging upon denial.

---

## 4. Technical Architecture & Component Layout

```
┌──────────────────────────────────────────────────────────────┐
│                    Client (Browser / React)                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    UrlSecurityGuard                    │  │
│  │  - Inspects window.location.pathname & search          │  │
│  │  - Matches SQLi Regex patterns                         │  │
│  │  - Strips payload -> Redirects -> Fires Sonner Toast   │  │
│  └──────────────────────────┬─────────────────────────────┘  │
│                             │ Safe URL                       │
│  ┌──────────────────────────▼─────────────────────────────┐  │
│  │                    ProtectedRoute                      │  │
│  │  - Checks auth token & session validity                │  │
│  │  - If admin visits consumer-only -> Redirect to /admin  │  │
│  │  - If consumer visits admin-only -> Redirect to /dash   │  │
│  │  - Dispatches specific role-violation toast alert      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────▲───────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                    Express Backend (server.js)               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │               URL SQLi Defense Middleware              │  │
│  │  - Decodes URI components & checks against SQLi regex  │  │
│  │  - If detected, sanitizes & redirects with safe param  │  │
│  │  - Logs threat details to server console               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Key Implementation Steps
1. **Create SQL Injection Detection Utility (`src/lib/sqliDetector.js`)**:
   - Comprehensive regex patterns covering standard SQLi keywords (`UNION SELECT`, `' OR '1'='1`, `OR 1=1`, `--`, `/* */`, `DROP TABLE`, `BENCHMARK`, hex values, etc.).
2. **Implement Client-Side `UrlSecurityGuard` Component (`src/components/UrlSecurityGuard.jsx`)**:
   - Listens to React Router location changes (`useLocation()`).
   - Checks both `pathname` and `search` query parameters.
   - Cleans the URL and triggers `toast.error` when a threat is identified.
3. **Enhance `ProtectedRoute` in `src/App.jsx`**:
   - Add bidirectional checks (`adminOnly` vs `consumerOnly`).
   - Trigger `toast.error` / `toast.info` during unauthorized redirections.
   - Guard consumer routes (`/dashboard`, `/services/*`, etc.) so admins cannot cross over, and vice-versa for admin routes.
4. **Add Express URL Security Middleware in `server.js`**:
   - Checks incoming requests for raw or encoded SQL injection payloads before dispatching to Vite or static assets.
   - Redirects to sanitized URLs with `?sqli_alert=1` so the client toast displays if direct HTTP requests contained the payload.
5. **Validation & Verification**:
   - Test admin navigating to `/dashboard`.
   - Test consumer navigating to `/admin`.
   - Test navigating to URLs containing SQL injection payloads such as `/' OR '1'='1` or `?test=' UNION SELECT 1,2--`.
   - Verify smooth redirects and prompt toast notifications.
