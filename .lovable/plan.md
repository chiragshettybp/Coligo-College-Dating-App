# Authentication Module — Implementation Plan

Build the full `/auth` module for CampusMatch: 5 routes, real Supabase auth, phone (+91) identity, protected routing, and a database foundation the rest of the app will build on. Everything reuses the existing design system in `src/components/ds/*` — no new visual language.

## Key decisions & tradeoffs (please confirm on approval)

1. **Identity = phone (+91) + password, via Supabase.** OTP/SMS requires a paid SMS provider that isn't configured, and you asked to disable OTP for now. So each account is created in Supabase with a **stable internal email alias derived from the phone** (`91XXXXXXXXXX@phone.campusmatch.app`) plus the user's password. This is real Supabase auth (real sessions, refresh, RLS) and works today with zero SMS setup. The real +91 number is stored on the profile and shown everywhere. When you later enable an SMS provider, we swap the alias for native Supabase phone auth without redesigning the UI.
2. **OTP disabled mode.** `/auth/verify-otp` is built to spec but runs behind an `OTP_ENABLED = false` flag: signup goes phone → set password → account created immediately, skipping OTP. Re-enabling later is a config flip, not a rebuild.
3. **Password recovery while OTP is off.** With no SMS/email channel for phone accounts, `/auth/forgot-password` verifies the number exists and routes to `/auth/reset-password` directly. This is acceptable only in OTP-disabled dev mode and is **not production-safe** (anyone knowing a number could reset it). It becomes secure automatically once OTP is enabled. Flagged clearly in code.
4. **Roles live in a separate `user_roles` table** (never on profiles) with a `has_role()` security-definer function, per security best practice.

## Phase 1 — Database foundation (migration)

- `app_role` enum (`user`, `moderator`, `admin`).
- `profiles`: `id` (FK auth.users, cascade), `phone` (unique, E.164), `display_name`, `avatar_url`, `verification_status`, `onboarding_completed` (bool default false), `last_login_at`, timestamps.
- `settings`: per-user preferences row (notifications, discovery prefs placeholder columns), FK to auth.users.
- `device_tokens`: `user_id`, `token`, `platform`, timestamps (for future push).
- `user_roles`: `user_id`, `role`, unique(user_id, role).
- `has_role(_user_id, _role)` security-definer function.
- `handle_new_user()` trigger on `auth.users` insert → creates `profiles` + `settings` row + default `user` role.
- `update_updated_at_column` triggers on all tables.
- RLS: users read/update only their own profile/settings/device_tokens; `user_roles` readable by authenticated self; all GRANTs (`authenticated`, `service_role`) per table.

## Phase 2 — Auth infrastructure

- `src/routes/_authenticated/route.tsx` — integration-managed gate (`ssr: false`, redirect to `/auth/login`).
- Root session wiring in `__root.tsx`: single `onAuthStateChange` → `router.invalidate()` + query invalidation (identity transitions only).
- `src/lib/auth.ts` (client-safe): `phoneToAlias()`, `formatPhoneIN()`, zod schemas (phone, password strength, OTP), `OTP_ENABLED` flag, post-auth redirect resolver (reads `onboarding_completed`).
- `src/lib/profile.functions.ts`: `getMyProfile` (requireSupabaseAuth), `checkPhoneAvailable` (public server fn, anon), `touchLastLogin`.

## Phase 3 — Route restructure

- Convert single `src/routes/auth.tsx` into a layout + children:
  `auth.tsx` (shared shell/branding + `<Outlet/>`), `auth.login.tsx`, `auth.signup.tsx`, `auth.verify-otp.tsx`, `auth.forgot-password.tsx`, `auth.reset-password.tsx`.
- `/auth` redirects to `/auth/login`.
- Update `PublicNav` + landing CTAs: "Login" → `/auth/login`, "Get Started" → `/auth/signup`. Legal links stay reachable in the auth shell footer.

## Phase 4 — Pages (mobile-first, DS components only)

Each page uses `TextField`, `Button`, `SegmentControl`, `Text`, `GlassPanel`, `Checkbox` from `src/components/ds`, with loading states, disabled-on-submit, inline validation, `role="alert"`/`aria-live`, focus management, and reduced-motion support.

- **Login**: +91 phone, password + show/hide, remember-me, submit → `signInWithPassword({email: alias, password})` → resolve redirect. Handles wrong password / disabled / network / rate messages generically.
- **Signup**: +91 phone → `checkPhoneAvailable` → (OTP off) set-password step → `signUp` → profile created by trigger → redirect.
- **Verify-OTP**: 6-box auto-advance + paste + countdown + resend/change-number UI, built but bypassed while `OTP_ENABLED=false`.
- **Forgot-password**: phone input, generic response, → reset (dev mode).
- **Reset-password**: new/confirm password, live strength meter + requirements checklist, submit disabled until met, `updateUser({password})`.

## Phase 5 — Post-auth handoff

- Redirect resolver sends new users to onboarding and completed users home. Since Splash/Onboarding/Home are separate future modules, this module lands on a minimal protected `/app` route confirming the session so the flow completes end-to-end (clearly marked as the handoff point for the next module).

## Phase 6 — Verification

- `tsgo --noEmit` clean.
- Playwright: render all 5 routes, complete a real signup → account in DB → session persists across refresh → login → protected redirect works → unauthenticated access to `/app` bounces to `/auth/login`. Confirm zero console/runtime errors.

## Technical notes

- Server functions only for DB access; `requireSupabaseAuth` for user-scoped reads, publishable-anon client for `checkPhoneAvailable`.
- No secrets in client; bearer attachment already wired via `attachSupabaseAuth` in `src/start.ts`.
- All validation duplicated client + server (zod).
- Architecture leaves clean extension points for real OTP, MFA, social login, device management, and admin controls without redesign.

Approve and I'll build Phase 1 → 6 in order.
