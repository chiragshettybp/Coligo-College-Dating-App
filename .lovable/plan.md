# Authentication Module — Implementation Plan

Production phone-number (+91) authentication for the College Dating App, built on Supabase Auth and reusing the existing `src/components/ds/*` design system. Five routes: `/auth/login`, `/auth/signup`, `/auth/verify-otp`, `/auth/forgot-password`, `/auth/reset-password`.

## ⚠️ Prerequisite decision (blocks real OTP)

Real SMS OTP to +91 numbers **cannot** work without an SMS provider. Supabase phone auth needs a provider (Twilio / MSG91 / Vonage) enabled in the Supabase dashboard with credentials stored as secrets. There is no way around this for "no mock data".

**You must pick one before I build:**
- **A. Twilio Verify / MSG91 (recommended, real production):** you create the account, I wire Supabase phone auth + store the API secret. Real SMS to Indian numbers.
- **B. Build the full flow now, you enable the provider later:** every screen, table, validation, and redirect is real; OTP simply won't deliver until the provider is switched on in Supabase Auth settings. No mock code — just a dormant provider.

I recommend **A**. Everything below is identical for both; only SMS delivery differs.

## Scope boundary

Only the 5 auth pages are built. Onboarding / Splash / Home are **separate future modules** — I create the DB flag and redirect logic that targets them, plus a thin `/splash` forwarder, but do not build those screens here.

## Phase 1 — Database & security

New tables (migration, with GRANTs + RLS + updated_at triggers):
- `profiles` — `id` (FK `auth.users`, cascade), `phone`, `onboarding_completed` (bool), `verification_status`, `last_login_at`, timestamps. RLS: users read/update own row only.
- `user_settings` — per-user prefs (`id`, `user_id`, notification/privacy flags). RLS: own row.
- `device_tokens` — `id`, `user_id`, `token`, `platform`, `last_seen`. RLS: own rows. (Supports future push.)
- Trigger `handle_new_user()` on `auth.users` insert → auto-creates `profiles` + `user_settings`.

No roles table needed yet (single user type); structured so an `app_role` table can be added later without redesign.

## Phase 2 — Auth infrastructure

- `_authenticated/route.tsx` gate (integration pattern, `ssr:false`, redirect to `/auth/login`).
- `src/lib/auth.functions.ts` server functions: `getMyProfile`, `touchLastLogin`, `ensureProfile` (all `requireSupabaseAuth`).
- `useAuth` hook wrapping `supabase.auth` session + `onAuthStateChange`, cross-tab sync, token refresh, and `getUser()` revalidation.
- Root `onAuthStateChange` subscriber (filtered) → `router.invalidate()` + query invalidation.
- Redirect resolver: after auth → `getMyProfile` → `onboarding_completed ? /splash→home : /splash→onboarding`.

## Phase 3 — Shared auth UI (design-system only)

Reused from `src/components/ds/*` (no new visual language): `AuthShell` layout, `PhoneInput` (+91 fixed prefix, 10-digit mask), `OtpInput` (6 boxes, auto-advance, paste, backspace nav), `PasswordField` (show/hide), `PasswordStrengthMeter` + live requirements checklist, `ResendTimer` (cooldown), inline validation + `role="alert"` messaging. Zod schemas in `src/lib/auth-schemas.ts` (phone, password, otp) shared client + server.

## Phase 4 — The five pages

- **`/auth/login`** — phone + password, remember-me, show/hide, forgot link, signup link. `signInWithPassword`, map errors (wrong password, unverified, disabled, rate-limited, network) to safe messages, disable button while pending, then redirect resolver.
- **`/auth/signup`** — phone only → duplicate check → `signInWithOtp`/`signUp` → store pending session → `/auth/verify-otp`.
- **`/auth/verify-otp`** — 6-box OTP, countdown, resend (cooldown + invalidates prior OTP), change number, `verifyOtp`; on success create/confirm account, set password if strategy requires, create profile, → `/splash`.
- **`/auth/forgot-password`** — phone input, **generic response** (no account enumeration) → send recovery OTP → verify-otp in recovery mode.
- **`/auth/reset-password`** — validates recovery session, new+confirm password, strength meter, `updateUser({ password })`, invalidates other sessions, → `/splash`.

## Phase 5 — Integration & polish

- Landing "Login" / "Get Started" buttons → `/auth/login` / `/auth/signup`; legal links stay reachable.
- Loading states, disabled-during-submit, offline/Supabase-down handling, recovery paths everywhere.
- Accessibility: labels, ARIA, focus management, keyboard nav, reduced-motion, visible focus.
- Deep-link/refresh/back-nav session restoration; protected-route redirects.

## Phase 6 — Verification

Typecheck, Playwright end-to-end (signup→OTP→profile row, login→redirect, forgot→reset, protected-route redirect, refresh persistence), console/error check, DB row assertions after each event.

## Technical notes

- Identity = phone (`+91XXXXXXXXXX`). Supabase `signUp({ phone, password })` + `verifyOtp({ type: 'sms' })`; login via `signInWithPassword({ phone })`; reset via OTP re-auth + `updateUser`.
- All writes via `createServerFn` + `requireSupabaseAuth`; RLS scoped to `auth.uid()`; never expose internal errors.
- Rate limiting: relies on Supabase Auth's built-in limits (no custom backend limiter available); resend cooldown enforced client + via provider.
- The old single `/auth` route is replaced by `/auth/login` (redirect kept for existing links).

## Decisions I need from you
1. SMS provider path **A or B** above (and which provider if A).
2. Confirm phone-**password** model (spec implies password + OTP). Alternative is passwordless OTP-only login — say if you prefer that.
