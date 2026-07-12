// ============================================================================
// Auth utilities & validation — client-safe (no server imports).
// Shared by client pages AND server functions so validation lives in one place.
// ============================================================================
import { z } from "zod";

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------
// OTP / SMS verification is intentionally disabled until an SMS provider is
// configured. While false: signup creates the account immediately (no OTP),
// and password recovery uses the dev-mode phone flow. Flip to true (and wire
// an SMS provider) to require OTP without redesigning any screen.
export const OTP_ENABLED = false;

// Alias domain used to represent phone numbers as Supabase email identities.
// Swapped for native Supabase phone auth once an SMS provider is enabled.
const PHONE_ALIAS_DOMAIN = "phone.campusmatch.app";

// ---------------------------------------------------------------------------
// Phone helpers (India, +91, 10 digits, starts 6-9)
// ---------------------------------------------------------------------------
/** Strip everything except digits, drop a leading 91/0 country/trunk prefix. */
export function normalizePhoneIN(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(-10);
}

export function isValidPhoneIN(raw: string): boolean {
  const d = normalizePhoneIN(raw);
  return /^[6-9]\d{9}$/.test(d);
}

/** E.164: +91XXXXXXXXXX */
export function toE164(raw: string): string {
  return `+91${normalizePhoneIN(raw)}`;
}

/** Supabase email-alias identity for a phone number. */
export function phoneToAlias(raw: string): string {
  return `91${normalizePhoneIN(raw)}@${PHONE_ALIAS_DOMAIN}`;
}

/** Pretty display: 98765 43210 */
export function formatPhoneIN(raw: string): string {
  const d = normalizePhoneIN(raw);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------
export type PasswordRule = { id: string; label: string; test: (v: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number", test: (v) => /\d/.test(v) },
  { id: "special", label: "One special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function passwordStrength(v: string): { passed: number; total: number; ok: boolean } {
  const passed = PASSWORD_RULES.filter((r) => r.test(v)).length;
  return { passed, total: PASSWORD_RULES.length, ok: passed === PASSWORD_RULES.length };
}

// ---------------------------------------------------------------------------
// Zod schemas (used on client AND server)
// ---------------------------------------------------------------------------
export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhoneIN)
  .refine((v) => /^[6-9]\d{9}$/.test(v), {
    message: "Enter a valid 10-digit Indian mobile number.",
  });

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.")
  .refine((v) => passwordStrength(v).ok, {
    message: "Password must include upper, lower, number and a special character.",
  });

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

export const resetSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

// ---------------------------------------------------------------------------
// Friendly, non-leaky error messages for Supabase auth failures
// ---------------------------------------------------------------------------
export function friendlyAuthError(message: string | undefined): string {
  const m = (message || "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "Incorrect mobile number or password.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("duplicate"))
    return "An account with this number already exists. Try signing in.";
  if (m.includes("rate") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Network error. Check your connection and try again.";
  if (m.includes("banned") || m.includes("disabled"))
    return "This account is not available. Please contact support.";
  return "Something went wrong. Please try again.";
}
