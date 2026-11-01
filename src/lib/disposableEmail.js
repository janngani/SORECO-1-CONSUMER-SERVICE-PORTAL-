// Client-side and universal disposable email detector
// Specifically rejects domains such as vtmpj.com, tempmail, mailinator, etc.

const KNOWN_DISPOSABLE_DOMAINS = new Set([
  "vtmpj.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "trashmail.com",
  "trashmail.net",
  "trashmail.me",
  "dispostable.com",
  "getnada.com",
  "dropmail.me",
  "throwawaymail.com",
  "crazymailing.com",
  "maildrop.cc",
  "mohmal.com",
  "emailondeck.com",
  "fakeinbox.com",
  "tempail.com",
  "tempr.email",
  "discard.email",
  "discardmail.com",
  "spambog.com",
  "mailnull.com",
  "generator.email",
  "mytemp.email",
  "burnermail.io",
  "inboxkitten.com",
  "mytrashmail.com",
  "meltmail.com",
  "mailcatch.com",
  "mintemail.com",
  "harakirimail.com",
  "guerrillamail.de",
  "incognitomail.org",
  "boun.cr",
  "tmail.ws",
  "fakemailgenerator.com"
]);

export function isDisposableEmail(email) {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();

  // Specifically check user-reported address
  if (clean === "pnlytplavledblqcmr@vtmpj.com") return true;

  const parts = clean.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1].trim().toLowerCase();

  if (KNOWN_DISPOSABLE_DOMAINS.has(domain)) return true;

  // Subdomain check
  const subparts = domain.split(".");
  for (let i = 0; i < subparts.length - 1; i++) {
    const parent = subparts.slice(i).join(".");
    if (KNOWN_DISPOSABLE_DOMAINS.has(parent)) return true;
  }

  // Regex heuristic for disposable keywords
  if (/(vtmpj|tempmail|dispos|fakemail|trashmail|throwaway|burnermail|guerrilla|10minute|dropmail|mailinator|yopmail|mohmal|sharklaser|spam4)/i.test(domain)) {
    return true;
  }

  return false;
}

/**
 * Validates that a name does not contain numbers and is not obvious gibberish.
 */
export function validateName(name) {
  if (!name || typeof name !== "string") return { isValid: false, error: "Name is required." };
  const trimmed = name.trim();
  if (trimmed.length < 2) return { isValid: false, error: "Name must be at least 2 letters." };
  if (trimmed.length > 100) return { isValid: false, error: "Name cannot exceed 100 characters." };
  
  // 1. Check for numbers
  if (/\d/.test(trimmed)) {
    return { isValid: false, error: "Numbers are not allowed in names. Please use letters only." };
  }

  // 2. Check for special characters (only letters, spaces, dots, hyphens, and ñ are allowed)
  const validNameRegex = /^[A-Za-z\s\.\-ñÑ',]+$/;
  if (!validNameRegex.test(trimmed)) {
    return { isValid: false, error: "Names can only contain letters and standard separators (., -)." };
  }

  // 3. Gibberish detection (e.g. "sdfhksgd")
  const alphaOnly = trimmed.toLowerCase().replace(/[^a-zñ]/g, "");
  
  // No vowels in a long string
  const vowels = alphaOnly.match(/[aeiouyñ]/g) || [];
  if (vowels.length === 0 && alphaOnly.length >= 4) {
    return { isValid: false, error: "Please enter a valid legal name. Random characters are not allowed." };
  }

  // Too many consecutive consonants
  if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(alphaOnly)) {
    return { isValid: false, error: "The name provided appears to be invalid. Please enter your real legal name." };
  }

  // Too many repeating characters
  if (/(.)\1{3,}/.test(alphaOnly)) {
    return { isValid: false, error: "Repeated characters detected. Please enter a valid name." };
  }

  return { isValid: true };
}

/**
 * Validates Philippine mobile number: 11 digits, starts with 09
 */
export function validatePhoneNumber(phone) {
  if (!phone) return { isValid: false, error: "Mobile number is required." };
  if (typeof phone === "string" && phone.length > 100) {
    return { isValid: false, error: "Mobile number cannot exceed 100 characters." };
  }
  const digits = phone.replace(/\D/g, "");
  
  if (digits.length !== 11) {
    return { isValid: false, error: "Mobile number must be exactly 11 digits." };
  }
  
  if (!digits.startsWith("09")) {
    return { isValid: false, error: "Philippine mobile numbers must start with '09'." };
  }
  
  return { isValid: true };
}

