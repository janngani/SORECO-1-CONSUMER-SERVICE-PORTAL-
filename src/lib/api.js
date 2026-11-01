import { supabase } from "./supabase";

const API_BASE = "/api";

async function request(endpoint, options = {}) {
  const publicAuthEndpoints = [
    "/auth/login",
    "/auth/register",
    "/auth/send-otp",
    "/auth/verify-otp",
    "/auth/reset-password",
    "/auth/resend-confirmation",
    "/auth/lockout-status"
  ];
  const isPublicAuth = publicAuthEndpoints.some(p => endpoint.startsWith(p));
  let token = null;

  if (!isPublicAuth) {
    token = localStorage.getItem("auth_token");
    if (token && token.length > 4096) {
      localStorage.removeItem("auth_token");
      token = null;
    }

    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token && data.session.access_token.length <= 4096) {
          token = data.session.access_token;
          localStorage.setItem("auth_token", token);
        }
      } catch {
        // ignore
      }
    }
  }

  const getHeaders = (currToken) => ({
    "Content-Type": "application/json",
    ...(!isPublicAuth && currToken ? { "Authorization": `Bearer ${currToken}` } : {}),
    ...options.headers
  });
  
  let response;
  let attempts = 0;
  const maxAttempts = 3;
  let retryDelay = 200;
  const isGet = !options.method || options.method.toUpperCase() === "GET";

  while (attempts < maxAttempts) {
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: getHeaders(token)
      });
      break;
    } catch (err) {
      attempts++;
      if (attempts >= maxAttempts) {
        if (isGet) {
          try {
            const cached = localStorage.getItem(`api_cache_${endpoint}`);
            if (cached) {
              console.warn(`[Network Offline] Returning cached fallback for ${endpoint}`);
              return JSON.parse(cached);
            }
          } catch {
            // cache read failed
          }
        }
        throw new Error(`Network connection error on ${endpoint}: ${err.message || 'Failed to fetch'}`);
      }
      await new Promise((r) => setTimeout(r, retryDelay));
      retryDelay *= 2;
    }
  }

  // If unauthorized, attempt a session refresh via Supabase once
  if (response.status === 401 && token) {
    try {
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshData?.session?.access_token) {
        const newToken = refreshData.session.access_token;
        localStorage.setItem("auth_token", newToken);
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers: getHeaders(newToken)
        });
      }
    } catch {
      // Refresh failed
    }
  }

  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`;
    let errorObj = null;
    try {
      const textData = await response.text();
      if (textData) {
        try {
          const errorData = JSON.parse(textData);
          errorObj = errorData;
          errorMsg = errorData.error || textData;
        } catch {
          errorMsg = textData;
        }
      }
    } catch {
    }

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth-expired", { detail: { error: errorMsg } }));
    }

    const err = new Error(errorMsg);
    err.status = response.status;
    if (errorObj && typeof errorObj === "object") {
      Object.assign(err, errorObj);
    }
    throw err;
  }
  const result = await response.json();
  if (isGet && result) {
    try {
      localStorage.setItem(`api_cache_${endpoint}`, JSON.stringify(result));
    } catch {
      // ignore storage quota errors
    }
  }
  return result;
}
export const api = {
  auth: {
    me: () => request("/auth/me"),
    completeOnboarding: (data) => request("/auth/complete-onboarding", { method: "POST", body: JSON.stringify(data) }),
    updateProfile: (data) => request("/auth/profile", { method: "PATCH", body: JSON.stringify(data) }),
    sendOtp: (email) => request("/auth/send-otp", { method: "POST", body: JSON.stringify({ email }) }),
    verifyOtp: (email, otp) => request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) }),
    resetPassword: (email, password, otp) => request("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, password, otp }) }),
    login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    checkLockout: (email) => request(`/auth/lockout-status?email=${encodeURIComponent(email || "")}`),
    register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    checkAccountNumber: (accountNumber, excludeUserId = "") => request(`/auth/check-account-number?accountNumber=${encodeURIComponent(accountNumber)}&excludeUserId=${encodeURIComponent(excludeUserId)}`),
    forgotPassword: (email) => request("/auth/send-otp", { method: "POST", body: JSON.stringify({ email }) }),
    resendConfirmation: (email) => request("/auth/resend-confirmation", { method: "POST", body: JSON.stringify({ email }) })
  },
  tickets: {
    list: () => request("/tickets"),
    get: (id) => request(`/tickets/${id}`),
    create: (data) => request("/tickets", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => request(`/tickets/${id}`, { method: "DELETE" })
  },
  announcements: {
    list: () => request("/announcements"),
    create: (data) => request("/announcements", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    reorder: (items) => request("/announcements/reorder", { method: "POST", body: JSON.stringify({ items }) }),
    delete: (id) => request(`/announcements/${id}`, { method: "DELETE" })
  },
  public: {
    getRatings: () => request("/public/ratings")
  },
  settings: {
    get: (key) => request(`/settings/${key}`),
    set: (key, value) => request(`/settings/${key}`, { method: "POST", body: JSON.stringify({ value }) })
  },
  users: {
    list: () => request("/users"),
    create: (data) => request("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => request(`/users/${id}`, { method: "DELETE" })
  },
  backend: {
    status: () => request("/backend-status")
  },
  admin: {
    backupStatus: () => request("/admin/backup-status"),
    triggerBackup: () => request("/admin/trigger-backup", { method: "POST" }),
    resyncDatabase: () => request("/admin/resync-database", { method: "POST" })
  },
  inquiries: {
    list: () => request("/inquiries"),
    listMy: () => request("/my-inquiries"),
    create: (data) => request("/inquiries", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/inquiries/${id}`, { method: "PATCH", body: JSON.stringify(data) })
  },
  auditLogs: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/audit-logs${qs ? `?${qs}` : ""}`);
    },
    create: (data) => request("/audit-logs", { method: "POST", body: JSON.stringify(data) }),
    clear: () => request("/audit-logs", { method: "DELETE" })
  }
};
