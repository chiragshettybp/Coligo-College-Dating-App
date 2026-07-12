# Onboarding Module — Implementation Plan

Builds the 12-screen `/onboarding` flow as a real, Supabase-backed experience that plugs into the existing Auth + Splash pipeline. Reuses the established design system (`src/components/ds/*`, tokens in `src/lib/ds.ts`) — no redesign, no new interaction patterns.

## Current state (verified)
- `profiles` exists: `id, phone, display_name, avatar_url, verification_status, onboarding_completed, account_status, last_login_at`. **No onboarding fields yet.**
- Only `featured_colleges` exists (marketing table). **No `colleges`, `departments`, `interests`, `user_interests`, `photos` tables, no storage bucket.**
- Splash's `resolveDestination` already branches on `onboardingCompleted` but currently sends everyone to `/app`. It will be pointed at `/onboarding` when incomplete.
- Design system provides: `GlassPanel, Button, Text, TextField, Chip, ProgressBar, Skeleton, Avatar, Toggle, IconButton` + `card`, `empty-state`, `navigation`.

---

## Phase 1 — Database & Storage (one migration)
Extend `profiles` with onboarding columns:
`full_name, gender, date_of_birth (date), college_id (fk), graduation_year (int), semester (int), department_id (fk), looking_for, bio (text), onboarding_step (text, default 'name')`.

New tables (each with GRANTs → `authenticated`/`service_role`, RLS, `updated_at` trigger):
- `colleges` (name, city, is_active) — public `anon`+`authenticated` SELECT.
- `departments` (name, is_active) — public SELECT.
- `interests` (name, category, is_active) — public SELECT.
- `user_interests` (user_id, interest_id, unique pair) — owner-scoped RLS.
- `photos` (user_id, storage_path, position int, is_primary bool) — owner-scoped RLS.

Enums (extensible): `gender_option`, `looking_for_option`.
Storage: private bucket `profile-photos` + `storage.objects` RLS so a user reads/writes only files under their own `user_id/` prefix.
Realtime: add `profiles`, `user_interests`, `photos`, `interests` to `supabase_realtime`.
Seed reference data (`colleges`, `departments`, `interests`) via the migration so lists are never empty (no hardcoding in the client).

## Phase 2 — Server functions (`src/lib/onboarding.functions.ts`, `requireSupabaseAuth`)
All writes are server-side + Zod-validated (client validates too):
- `getOnboardingState()` — returns profile onboarding fields + selected interests + photos for resume.
- `saveOnboardingStep({ step, values })` — validates per-step, updates `profiles`, advances `onboarding_step`.
- `listColleges/listDepartments/listInterests` — public read fns (server publishable client, `TO anon`).
- `setInterests({ ids })` — min/max enforced, replaces `user_interests`.
- `createPhotoUploadTarget` / `savePhoto` / `deletePhoto` / `reorderPhotos` / `setPrimaryPhoto` — manage `photos` rows + storage paths; enforce 2–6 photos.
- `completeOnboarding()` — server-side verifies ALL required fields + ≥2 photos + ≥ min interests, sets `onboarding_completed=true` atomically, idempotent (prevents duplicate completion).

## Phase 3 — Shared onboarding shell
- `src/routes/onboarding/route.tsx` — layout under **`_authenticated`-style gate**: verifies session (redirect `/auth/login`), diverts on maintenance, loads onboarding state once. Renders persistent `ProgressBar` (step N of 12) + Back button + `<Outlet/>`.
- `src/lib/onboarding.ts` — step order array, per-step Zod schemas, age calc, next/prev helpers, guard that blocks skipping ahead of `onboarding_step`.
- Reusable `OnboardingScreen` wrapper (title, subtitle, body, sticky Continue) + `SelectableCard`/`SelectableChip` built from existing `Chip`/`card` — used by all choice screens.

## Phase 4 — Text/選択 steps
`name` (text, trim, 2–50), `gender` (cards), `date-of-birth` (native date, ≥18 rejection, timezone-safe), `graduation-year` (dynamic year range), `semester` (1–8 cards), `looking-for` (cards), `bio` (multiline + counter, ≤500). Each: live validation, disabled Continue until valid, save on Continue, advance.

## Phase 5 — Searchable relational steps
`college` and `department` — instant client-side search over Supabase-loaded lists, store FK id, skeleton loaders, empty-state, network-failure retry. `interests` — searchable chips, multi-select with min (e.g. 3) / max (e.g. 10) counter, realtime insert of new admin-added interests, saves to `user_interests`.

## Phase 6 — Photos
Grid of up to 6 slots. Client: validate type/size, compress (canvas) before upload, per-file progress, upload to `profile-photos/{userId}/`, persist `photos` row. Replace/delete/reorder (drag where supported, arrow controls fallback), first photo = primary → mirrored to `profiles.avatar_url`. Handles failure/cancel/duplicate with preserved state; min 2 to continue.

## Phase 7 — Complete + wiring
`complete` — success animation (reuse motion tokens), calls `completeOnboarding()`, prevents duplicate submits, on success navigates to `/app` (Home handoff). Update `resolveDestination` + splash so incomplete users resume at their saved `onboarding_step` and completed users skip onboarding. `/app` handoff copy updated to reflect real completion.

## Phase 8 — Verification
`tsgo` typecheck + production build clean; Playwright mobile (390×844) walkthrough of the full flow against live Supabase (create → save each step → upload → complete → land on `/app`); confirm resume-after-refresh, back-nav, guard against skipping, and DB rows written. Cleanup any test data.

---

## Technical notes
- Every screen mobile-first, one-handed; large screens only widen/space.
- No mock data, no fake delays — reference lists and all writes are live Supabase.
- Photos bucket is **private** (dating PII); discovery will later use signed URLs. Confirm if you'd prefer public.
- Accessibility: semantic inputs, ARIA labels, focus states, reduced-motion, keyboard nav on all cards/chips.

## Open choices (defaults if you don't specify)
- Min interests = 3, max = 10; bio max = 500; min age = 18; photos 2–6.
- Seed a starter set of colleges/departments/interests (India-relevant) that admins can extend later.
