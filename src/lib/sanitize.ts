/**
 * Genesoft Infotech CRM - Security & Input Sanitization Engine
 * Protection against SQL Injection, NoSQL Injection, XSS, Buffer / Length Floods,
 * Control Character Injections, and Malformed Text Box Inputs.
 */

// 1. Username Validator (Alphanumeric, period, underscore, hyphen; 3-32 chars)
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

// 2. Standard Email Validator
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 3. Strict Phone / Mobile Validator (10 to 15 digits only)
const PHONE_REGEX = /^\d{10,15}$/;

// 4. Strict IPv4 / IPv6 Validators
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

// 5. Time Validator (HH:MM 24-hour format)
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Strips dangerous control characters, NULL bytes, script blocks, and HTML tags.
 * Limits the resulting string to max specified length.
 */
export function sanitizeText(raw: unknown, maxLength = 255): string {
  if (raw === null || raw === undefined) return "";
  let str = String(raw).trim();

  // Strip null bytes and non-printable control characters (ASCII 0-31, except newline and tab)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Strip entire script tags and their inner payload
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Strip remaining HTML tags
  str = str.replace(/<[^>]*>/g, "");

  // Enforce maximum length limit
  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }

  return str;
}

/**
 * Validates and sanitizes a username.
 * Blocks SQL injection vectors like "admin' OR 1=1 --", quotes, spaces, and special symbols.
 */
export function validateUsername(raw: unknown): { valid: boolean; value: string; error?: string } {
  const sanitized = sanitizeText(raw, 32).toLowerCase();
  if (!sanitized) {
    return { valid: false, value: "", error: "Username is required." };
  }
  if (!USERNAME_REGEX.test(sanitized)) {
    return {
      valid: false,
      value: sanitized,
      error: "Invalid username. Must be 3-32 characters, containing only letters, numbers, '.', '_', or '-'.",
    };
  }
  return { valid: true, value: sanitized };
}

/**
 * Validates password length and structure.
 * Caps at 128 characters to prevent bcrypt DoS hash floods.
 */
export function validatePassword(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string") {
    return { valid: false, value: "", error: "Password must be provided." };
  }
  if (raw.length < 6) {
    return { valid: false, value: "", error: "Password must be at least 6 characters." };
  }
  if (raw.length > 128) {
    return { valid: false, value: "", error: "Password exceeds maximum allowable length of 128 characters." };
  }
  return { valid: true, value: raw };
}

/**
 * Validates and sanitizes email address.
 */
export function validateEmail(raw: unknown): { valid: boolean; value: string; error?: string } {
  const sanitized = sanitizeText(raw, 150).toLowerCase();
  if (!sanitized) {
    return { valid: false, value: "", error: "Email address is required." };
  }
  if (!EMAIL_REGEX.test(sanitized)) {
    return { valid: false, value: sanitized, error: "Invalid email address format." };
  }
  return { valid: true, value: sanitized };
}

/**
 * Validates mobile number: extracts digits and strictly ensures 10-15 digits.
 * Rejects illegal characters (letters, SQL operators) to block injection.
 */
export function validateMobile(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (!raw) {
    return { valid: false, value: "", error: "Mobile number is required." };
  }
  const str = String(raw).trim();
  // Reject inputs with letters, SQL operators, or quotes
  if (/[a-zA-Z'"`=;\-]/.test(str)) {
    return {
      valid: false,
      value: "",
      error: "Mobile number must contain numeric digits only; letters and SQL operators are not permitted.",
    };
  }
  const digitsOnly = str.replace(/\D/g, "");
  if (!PHONE_REGEX.test(digitsOnly)) {
    return {
      valid: false,
      value: digitsOnly,
      error: "Mobile number must contain between 10 and 15 numeric digits.",
    };
  }
  return { valid: true, value: digitsOnly };
}

/**
 * Validates IP addresses (IPv4 or IPv6).
 */
export function validateIpAddress(raw: unknown): { valid: boolean; value: string; error?: string } {
  const sanitized = sanitizeText(raw, 45).trim();
  if (!sanitized) {
    return { valid: false, value: "", error: "IP address is required." };
  }
  const isV4 = IPV4_REGEX.test(sanitized);
  const isV6 = IPV6_REGEX.test(sanitized) || sanitized === "::1";
  if (!isV4 && !isV6) {
    return { valid: false, value: sanitized, error: "Invalid IP address syntax (must be a valid IPv4 or IPv6 address)." };
  }
  return { valid: true, value: sanitized };
}

/**
 * Validates 24-hour time string (HH:MM).
 */
export function validateTimeString(raw: unknown, fallback = "19:00"): string {
  const sanitized = sanitizeText(raw, 5).trim();
  if (TIME_REGEX.test(sanitized)) return sanitized;
  return fallback;
}
