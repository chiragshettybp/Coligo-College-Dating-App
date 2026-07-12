# System Module — Implementation Plan

The System module becomes the app's startup + infrastructure layer: a real splash/initialization engine, Supabase-controlled maintenance mode, and production 404/500 recovery. Everything reuses the existing `src/components/ds` design system and `src/lib/ds.ts` tokens — no redesign, no new visual language.

## What exists today (reused, not rebuilt)
- Design system: `Button`, `Text`, `GlassPanel`, `Skeleton`, `ProgressBar`, `Avatar` in `src/components/ds/glass.tsx`; tokens (`APP_BACKGROUND`, `colors`, `spacing`, `gradients`, `FONT_FAMILY`) in `src/lib/ds.ts`.
- Auth module: `profiles` (with `onboarding_completed`), `settings`, `user_roles` + `has_role()`, `handle_new_user()` trigger, `_authenticated/route.tsx` gate, session wiring in `__root.tsx`.
- A root `NotFoundComponent` + `errorComponent` already live in `__root.tsx` (will be redirected to the new pages).

---

## Phase 1 — Database & Security (one migration)
Add profile account-state column and six system tables. Every `public` table gets GRANTs → RLS → policies.

1. `profiles.account_status` — enum `account_status` (`active`, `suspended`, `deleted`), default `active`, not null. Splash reads it.
2. `application_settings` — single-row config: `maintenance_enabled bool`, `maintenance_title`, `maintenance_message`, `estimated_completion timestamptz`, `support_email`, `min_app_version`, timestamps. Public `SELECT TO anon, authenticated`; write only via `has_role(auth.uid(),'admin')`. Seed one row.
3. `feature_flags` — `key` unique, `enabled bool`, `payload jsonb`. Public read, admin write.
4. `app_versions` — `version`, `platform`, `min_supported`, `force_update bool`, `released_at`. Public read, admin write.
5. `system_logs` — analytics for unknown routes: `event_type`, `path`, `referrer`, `user_id nullable`, `metadata jsonb`, `created_at`. INSERT allowed to `anon`+`authenticated`; SELECT admin-only (no PII leak).
6. `error_reports` — `error_id` unique, `route`, `message`, `stack` (server-only), `user_id nullable`, `session_id`, `device_info jsonb`, `status`, `created_at`. INSERT to `anon`+`authenticated`; SELECT admin-only.
7. `device_sessions` — `user_id`, `device_token`, `platform`, `last_seen_at`, `revoked bool`. Owner-scoped RLS (`auth.uid() = user_id`).
8. Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.application_settings;` so maintenance toggles push instantly.
9. `update_updated_at_column` triggers on the mutable tables.

## Phase 2 — Server functions & client helpers
- `src/lib/system.functions.ts` (`createServerFn`, anon publishable client for reads):
  - `getAppConfig` — returns `application_settings` + active `feature_flags` + latest `app_versions` in one call.
  - `logUnknownRoute({ path, referrer })` — inserts a `system_logs` row (fire-and-forget).
  - `reportError({ route, message, stack, sessionId, deviceInfo })` — inserts `error_reports`, returns generated `error_id`.
  - `createSupportTicket({ errorId, message })` — inserts a `contact_messages`/ticket row linked to the error (reuses existing contact table).
- `src/lib/system.ts` (client-safe): TanStack Query options (`appConfigQuery`), device-info collector, `resolveDestination(state)` pure function implementing the redirect matrix, session-id helper.
- `src/lib/profile.functions.ts`: extend `myProfileQuery` result to include `accountStatus` (already fetches profile).

## Phase 3 — Splash screen (`/system/splash`)
New route `src/routes/system.splash.tsx` (public route — it runs the auth check itself; `ssr:false` to read the browser session).
- Sequential-but-parallelized init pipeline, each task with a timeout wrapper and progress messaging driven by `ProgressBar`/`Skeleton`:
  1. connect Supabase + `supabase.auth.getUser()` (refreshes token automatically)
  2. if no user → redirect Landing (`/`)
  3. load profile + settings via `myProfileQuery`
  4. `getAppConfig`
  5. branch via `resolveDestination`:
     - `maintenance_enabled` → `/system/maintenance`
     - `account_status = suspended|deleted` → `supabase.auth.signOut()` → `/`
     - onboarding incomplete → onboarding route (falls back to `/app` until Onboarding module ships)
     - else → Home (`/app`)
  6. register device token into `device_sessions`, subscribe realtime.
- Network failure → inline retry with auto-retry backoff (no blank screen). Reduced-motion respected. Loop-guard: splash never redirects to itself; a `?from=` guard prevents flicker.
- Logo animation reuses existing brand mark + `gradients.primaryButton`.

## Phase 4 — Maintenance page (`/system/maintenance`)
`src/routes/system.maintenance.tsx` — public route.
- Reads `appConfigQuery`; shows `maintenance_title`, `maintenance_message`, `estimated_completion` (relative), `support_email` contact link, and a **Retry** button.
- Realtime subscription on `application_settings`: when `maintenance_enabled` flips false, auto-continue to `/system/splash`. Manual Retry re-fetches; auto-retry every few minutes.
- If opened while maintenance is OFF, immediately bounce to `/system/splash` (prevents dead-end).

## Phase 5 — 404 & 500 pages
- `src/routes/404.tsx` + wire `__root.tsx` `notFoundComponent` to render it. Content: friendly copy, **Home** (auth-aware: `/app` vs `/`), **Back** (history, fallback Home), **Contact support**. On mount, calls `logUnknownRoute` with path/referrer/user.
- `src/routes/500.tsx` + wire `__root.tsx` `errorComponent` + router `defaultErrorComponent` to render it. Content: friendly copy, **Retry** (`router.invalidate()` + `reset()`), **Home**, **Report Issue** (calls `reportError` → shows `error_id`, then optional `createSupportTicket`). Stack captured server-side only, never shown to users. Integrates with existing `error-capture.ts`/`lovable-error-reporting.ts`.
- Direct routes `/404` and `/500` also exist for explicit navigation/testing.

## Phase 6 — Integration & wiring
- Auth handoff: after login / signup / password reset / session restore, redirect to `/system/splash` (instead of `/app`) so splash becomes the single routing engine. Update `auth.login.tsx`, `auth.signup.tsx`, `auth.reset-password.tsx`, and the `_authenticated` post-auth path.
- `_authenticated/route.tsx`: on gate entry, if `application_settings.maintenance_enabled` (from cached config) → redirect maintenance, preserving the session. Root realtime listener already in `__root.tsx` extended to invalidate config on maintenance change so any authenticated screen can react.
- Landing "Get started" / CTAs unchanged (still → `/auth`).

## Phase 7 — Verification
- `tsgo --noEmit` clean.
- Playwright end-to-end: splash redirect matrix (guest→landing, authed→home), toggle `maintenance_enabled` in DB → confirm realtime redirect, visit unknown URL → 404 logs a `system_logs` row, force a thrown error → 500 writes an `error_reports` row and returns an `error_id`. Screenshot each page at mobile (375px) and desktop widths.

---

## Technical notes
- All reads use an anon publishable-key server client + narrow `TO anon` SELECT policies; writes to logs/errors are INSERT-only for anon (no read-back). Admin-only tables never expose stack traces or PII to non-admins.
- Splash and maintenance are `ssr:false` public routes because they depend on the browser Supabase session.
- No mock data, no fake timers: every delay is a real awaited init task with timeout protection.
- Extension points kept open for forced updates (`app_versions.force_update`), feature-flag rollouts, and an Admin dashboard — no redesign needed later.
