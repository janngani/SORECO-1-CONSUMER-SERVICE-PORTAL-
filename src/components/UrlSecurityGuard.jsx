import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { detectSqlInjection, sanitizeUrl, safelyDecodeUri } from "@/src/lib/sqliDetector";

/**
 * UrlSecurityGuard Component
 * Continuously monitors URL changes, query parameters, and server-side threat redirect flags.
 * Strips malicious SQL injection payloads, resets URL to safe state, and surfaces security alert toasts.
 */
export function UrlSecurityGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastAlertTimeRef = useRef(0);

  const triggerSecurityToast = (customMessage) => {
    const now = Date.now();
    // Debounce alerts to prevent toast spamming on rapid re-renders
    if (now - lastAlertTimeRef.current < 2000) return;
    lastAlertTimeRef.current = now;

    toast.error(
      customMessage ||
        "Security Alert: Potential SQL Injection attempt detected in URL! The suspicious payload was blocked and sanitized.",
      {
        id: "sqli-security-alert",
        duration: 6500,
        description: "Malicious input signatures are prohibited to protect consumer data and cooperative systems."
      }
    );
  };

  useEffect(() => {
    const fullPathAndSearch = `${location.pathname}${location.search}`;
    const rawHref = typeof window !== "undefined" ? window.location.href : "";
    const decodedHref = safelyDecodeUri(rawHref);

    // 1. Check if server redirected here with a SQLi alert flag
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has("sqli_alert") || searchParams.has("sqli_blocked")) {
      searchParams.delete("sqli_alert");
      searchParams.delete("sqli_blocked");
      const cleanSearch = searchParams.toString();
      const cleanUrl = cleanSearch ? `${location.pathname}?${cleanSearch}` : location.pathname;

      triggerSecurityToast("Security Alert: Potential SQL Injection attempt intercepted and blocked!");
      navigate(cleanUrl, { replace: true });
      return;
    }

    // 2. Check if the current route pathname or search contains SQL injection patterns
    const isPathSuspicious = detectSqlInjection(location.pathname);
    const isSearchSuspicious = detectSqlInjection(location.search);
    const isFullHrefSuspicious = detectSqlInjection(decodedHref);

    if (isPathSuspicious || isSearchSuspicious || isFullHrefSuspicious) {
      triggerSecurityToast();

      const safeDestination = sanitizeUrl(location.pathname, location.search);
      // If the entire path was compromised, sanitizeUrl safely returns "/" or "/login"
      navigate(safeDestination, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return null;
}
