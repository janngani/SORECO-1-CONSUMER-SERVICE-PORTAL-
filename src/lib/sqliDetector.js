/**
 * SQL Injection Detection and Sanitization Utility
 * Designed to detect and neutralize URL-based SQL Injection attempts (OWASP A03:2021)
 */

// Regular expressions targeting SQL Injection signatures
const SQLI_PATTERNS = [
  // Classic tautologies and boolean-based injections (e.g., ' OR '1'='1, " or 1=1, ' or 'a'='a, ' or ''=')
  /('|"|%27|%22)\s*(or|and|%6f%72|%61%6e%64)\s*('?[\w]+'?|\d+)\s*(=|%3d)\s*('?[\w]+'?|\d+)/i,
  /\b(or|and)\b\s+('?[0-9a-zA-Z]+'?|\d+)\s*=\s*('?[0-9a-zA-Z]+'?|\d+)/i,
  /\b(or|and)\b\s+true\b/i,
  /('|"|%27|%22)\s*(or|and)\s+('|"|%27|%22)/i,

  // Authentication bypass patterns with trailing comments (e.g., admin'--, ' or 1=1--, ' #)
  /('|"|%27|%22)\s*(--|#|\/\*)/i,
  /(--|%2d%2d)\s*$/i,
  /;\s*(--|#|\/\*)/i,

  // Union-based SQL injection (e.g., UNION SELECT, UNION ALL SELECT)
  /\bunion\b\s+(all\s+)?\bselect\b/i,
  /\bselect\b[\s\S]+?\bfrom\b/i,

  // Piggybacked queries & DDL/DML injection (e.g., ; DROP TABLE, ; DELETE FROM)
  /;\s*(drop|truncate|alter|delete|update|insert|exec|execute|shutdown|create)\b/i,

  // Blind SQLi timing and utility functions
  /\b(benchmark|sleep|pg_sleep|waitfor\s+delay)\s*\(/i,
  /\b(load_file|into\s+outfile|into\s+dumpfile)\b/i,
  /\b(information_schema|sys\.tables|pg_stat_activity|sysobjects)\b/i,

  // Hex encoded payloads and char conversions commonly used in SQLi
  /0x[0-9a-fA-F]{4,}/i,
  /\bchar\s*\(\s*\d+/i,
  /\b(concat|concat_ws)\s*\(/i,
  /\bxp_cmdshell\b/i
];

/**
 * Safely decodes a URI string, handling multiple layers of URL encoding and malformed sequences
 */
export function safelyDecodeUri(str) {
  if (!str || typeof str !== "string") return "";
  let decoded = str;
  let iterations = 0;
  while (iterations < 3) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
      iterations++;
    } catch {
      // If malformed URI, break and use current string
      break;
    }
  }
  return decoded;
}

/**
 * Checks if a URL path, query string, or combined URL contains SQL injection patterns
 * @param {string} urlString - The URL, path, or query string to inspect
 * @returns {boolean} - True if SQL injection signature is detected
 */
export function detectSqlInjection(urlString) {
  if (!urlString || typeof urlString !== "string") return false;

  const raw = urlString;
  const decoded = safelyDecodeUri(urlString);

  // Normalize spaces and lowercase for reliable pattern matching
  const targets = [
    raw,
    decoded,
    decoded.replace(/\+/g, " "),
    decoded.replace(/%20/g, " ")
  ];

  for (const target of targets) {
    for (const pattern of SQLI_PATTERNS) {
      if (pattern.test(target)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Sanitizes a URL by stripping malicious path segments or query parameters
 * @param {string} pathname - Current window or router pathname
 * @param {string} search - Current search query string (e.g. ?user=' or 1=1)
 * @returns {string} - Clean, safe URL to navigate to
 */
export function sanitizeUrl(pathname = "/", search = "") {
  // If the pathname itself contains SQL injection, fall back to safe root or login
  if (detectSqlInjection(pathname)) {
    if (pathname.toLowerCase().includes("login")) return "/login";
    if (pathname.toLowerCase().includes("register")) return "/register";
    return "/";
  }

  // If pathname is clean, check search query params
  if (search && detectSqlInjection(search)) {
    try {
      const params = new URLSearchParams(search);
      const safeParams = new URLSearchParams();

      for (const [key, value] of params.entries()) {
        if (!detectSqlInjection(key) && !detectSqlInjection(value)) {
          safeParams.append(key, value);
        }
      }

      const cleanQuery = safeParams.toString();
      return cleanQuery ? `${pathname}?${cleanQuery}` : pathname;
    } catch {
      return pathname;
    }
  }

  return `${pathname}${search || ""}`;
}
