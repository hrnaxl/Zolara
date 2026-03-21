/**
 * Input sanitization utilities
 * Applied at the point of submission, not on every keystroke
 */

/** Strip HTML tags and dangerous characters, trim whitespace */
export function sanitizeText(val: string | null | undefined): string {
  if (!val) return "";
  return val
    .replace(/<[^>]*>/g, "")           // strip HTML tags
    .replace(/[<>"'`]/g, "")           // strip XSS characters
    .replace(/\s+/g, " ")              // collapse multiple spaces
    .trim();
}

/** Name: letters, spaces, hyphens, apostrophes only */
export function sanitizeName(val: string | null | undefined): string {
  if (!val) return "";
  return val
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-zA-ZÀ-ÿ\s'\-\.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Phone: digits, spaces, +, -, (, ) only. Strip everything else */
export function sanitizePhone(val: string | null | undefined): string {
  if (!val) return "";
  return val.replace(/[^\d\s+\-().]/g, "").trim();
}

/** Email: lowercase, trim, basic cleanup */
export function sanitizeEmail(val: string | null | undefined): string {
  if (!val) return "";
  return val.replace(/<[^>]*>/g, "").trim().toLowerCase();
}

/** Promo code: uppercase alphanumeric and hyphens only */
export function sanitizePromoCode(val: string | null | undefined): string {
  if (!val) return "";
  return val.replace(/[^A-Z0-9\-]/gi, "").toUpperCase().trim();
}

/** Notes/comments: strip HTML tags and script injection, allow most chars */
export function sanitizeNotes(val: string | null | undefined): string {
  if (!val) return "";
  return val
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

/** Number: ensure it's a valid positive number */
export function sanitizeNumber(val: string | number | null | undefined, fallback = 0): number {
  const n = Number(val);
  return isNaN(n) || n < 0 ? fallback : n;
}

/** Generic field sanitizer map */
export const sanitize = {
  text: sanitizeText,
  name: sanitizeName,
  phone: sanitizePhone,
  email: sanitizeEmail,
  notes: sanitizeNotes,
  promo: sanitizePromoCode,
  number: sanitizeNumber,
};
