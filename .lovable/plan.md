# Profile Module — Implementation Plan

## What already exists (reuse, don't rebuild)
- **Design system**: `src/components/ds/*` (card, navigation, settings, image-viewer, swipe, empty-state, glass) + tokens in `src/lib/ds.ts`. The `/ui` route documents them.
- **Bottom nav**: `src/components/discover/shell.tsx` already has a **Profile** tab — it currently fires a "coming soon" toast. It will be wired to `/profile`.
- **Server functions** in `src/lib/onboarding.functions.ts`: `savePhoto`, `deletePhoto`, `reorderPhotos`, `setInterests`, `saveOnboardingStep`, plus public readers `listColleges/listDepartments/listInterests`. These already do RLS-scoped writes and Storage uploads to the `profile-photos` bucket — the Profile module reuses them.
- **Profile card** used in Discovery (`discover.profile.$userId.tsx` / `discover.functions.ts`) — reused verbatim for `/profile/preview`.
- **Tables**: `profiles` (full_name, gender, date_of_birth, college_id, graduation_year, semester, department_id, looking_for, bio, avatar_url...), `photos`, `user_interests`, `interests`, `colleges`, `departments`, `settings` (discovery_enabled, push_enabled...). All already have RLS. **No schema changes are required** for the specified fields.

## Scope note
Everything in the prompt maps to existing columns/tables. I will **not** add speculative columns (profile views, likes, distance, verification). Those are shown as "future-ready" read-only placeholders sourced from real data where it exists (matches/chats counts) and omitted otherwise — no fake numbers.

---

## Phase 1 — Server functions (`src/lib/profile-full.functions.ts`)
New authenticated (`requireSupabaseAuth`) functions + `queryOptions`:
- `getFullProfile` — profile row joined to college & department names, primary photo, computed `age`, `memberSince`.
- `getProfileGallery` — signed URLs for all `photos` rows (reuses onboarding signing logic).
- `getMyInterests` — user_interests joined to interests.
- `getProfileStats` — real counts: total matches (`matches`), total chats (matches with messages), created_at. Future metrics omitted.
- `getProfileCompletion` — server-computed % from photos/bio/interests/department/semester/graduation_year/looking_for.
- `updateCoreProfile` — Zod-validated update of full_name, college_id, graduation_year, semester, department_id, date_of_birth, looking_for.
- `updateBio` — trimmed, max-length validated.
- `getSettings` / `updateSettings` — discovery_enabled + notification/visibility prefs from `settings`.

Interests + photo mutations reuse the existing onboarding functions (already validated, min/max enforced).

## Phase 2 — Layout + Overview (`/profile`)
- `_authenticated/profile.tsx` — layout `<Outlet/>` (shares bottom nav shell).
- `_authenticated/profile.index.tsx` — header (primary photo, name, age, college, department, semester, grad year, completion ring), stats card, swipeable gallery (reuse `image-viewer`), Edit/Preview/Settings buttons. Skeleton loaders + empty states. Loaders use `ensureQueryData`; components use `useSuspenseQuery`.

## Phase 3 — Edit sub-pages
- `profile.edit.tsx` — core fields form (selectors for college/department, validated), save → invalidate queries → back.
- `profile.bio.tsx` — multiline editor, live char counter, trim, validation.
- `profile.interests.tsx` — searchable chips, min/max enforced, reuses `setInterests`.
- `profile.preferences.tsx` — looking_for + discovery_enabled + visibility toggles via `settings`; changes affect Discovery eligibility immediately (Discovery already filters on `settings.discovery_enabled`).

## Phase 4 — Manage Photos (`/profile/photos`)
- Upload (client compression via existing `src/lib/image.ts` if present, else canvas), type/size validation, progress, reorder, set primary, delete — all through existing `savePhoto`/`deletePhoto`/`reorderPhotos`. Min/max photo rules enforced. Optimistic UI + rollback on error.

## Phase 5 — Preview (`/profile/preview`)
- Renders the **exact Discovery profile card** with the current user's data (read-only), instantly reflecting edits via shared query cache.

## Phase 6 — Realtime + integration
- `src/lib/use-profile-realtime.ts` — subscribe (in `useEffect`, cleanup on unmount) to `profiles`, `photos`, `user_interests`, `settings` changes for the current user; invalidate the relevant queries so Home/Discovery/Preview/Matches reflect changes without refresh.
- Wire the bottom-nav **Profile** tab in `shell.tsx` to navigate to `/profile` (remove the "coming soon" toast for that tab).

## Phase 7 — Verify
- `tsgo` typecheck, build check.
- Playwright against localhost with the injected session: load `/profile`, edit bio, confirm persistence + preview reflects it, check gallery and completion ring, screenshot each page.
- Confirm RLS (own-profile only) and no console/network errors.

---

## Technical notes
- New route strings must match filenames exactly (`/_authenticated/profile`, `/_authenticated/profile/edit`, etc.); `routeTree.gen.ts` is regenerated automatically.
- All reads via TanStack Query (`ensureQueryData` + `useSuspenseQuery`); every route with a loader gets `errorComponent` + `notFoundComponent`.
- No new secrets, no schema migration, no mock data.
