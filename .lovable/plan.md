# Admin College Management Module — Implementation Plan

Builds `/admin/colleges` (list) and `/admin/colleges/:collegeId` (detail), plus create/edit/action sub-pages, following the exact patterns already used by the Users module (`admin.users.index.tsx`, `admin.functions.ts`, `charts.tsx`, `user-bits.tsx`) and gated by the existing admin layout + `has_role('admin')` server checks.

## Reality check against current DB
Your live schema is much smaller than the prompt assumes. To avoid mock data, I'll extend the schema first:

- `colleges` today: `name, city, is_active, logo_url, banner_url, description`. Missing: `code, short_name, website, state, district, country, discovery_enabled, status (active/disabled/archived)`.
- `departments` today: `name, is_active` only — **not linked to any college**. Per-college department management requires adding `college_id`.
- No `likes`/`analytics`/`rankings`/`audit_logs` tables — likes live in `swipes`, rankings are computed by existing RPCs (`college_rankings`, `college_rank`), audit uses the existing `admin_logs` table.

## Phase 1 — Migration (schema + RPCs)
Add to `colleges`: `code text unique`, `short_name text`, `website text`, `state text`, `district text`, `country text default 'India'`, `discovery_enabled boolean default true`, `status text default 'active'` (active|disabled|archived), `archived_at timestamptz`. Keep `is_active` in sync with `status` via trigger. Add indexes on `status`, `created_at`, `name`, `code`.

Add `college_id uuid references colleges(id)` to `departments` (nullable — existing global rows stay global), plus index.

New `SECURITY DEFINER` admin RPCs (each re-checks `has_role`):
- `admin_college_summary()` — the dashboard summary cards (totals by status, students, joined today, added this month, avg completion/matches/messages, discovery activity, verification %).
- `admin_list_colleges(_search, _filters jsonb, _sort, _limit, _offset)` — server-paginated rows with per-college aggregates (students, male/female, departments, active/online, matches, messages, profile completion, status) + `total_count`.
- `admin_college_detail(_id)` — full record + overview.
- `admin_college_stats(_id)` — realtime stats (extends existing `college_stats`).
- `admin_college_timeseries(_id, _days)` — daily registrations/growth/activity.
- `admin_college_students(_id, _search, _limit, _offset)` — enrolled student directory.
- Moderation writes: `admin_set_college_status`, `admin_set_college_discovery`, `admin_upsert_college`, `admin_delete_college` (soft), and department ops `admin_upsert_department`, `admin_set_department_status`, `admin_delete_department` — all writing to `admin_logs`, blocking archive/delete when active students reference the college.

Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE colleges, departments;`

## Phase 2 — Storage
Create private buckets `college-logos` and `college-banners` via the storage tool, with admin-only write RLS on `storage.objects` and signed-URL reads (mirroring how photos are served).

## Phase 3 — Server functions
Extend `src/lib/admin.functions.ts` with `createServerFn` wrappers + `queryOptions` for every RPC above, zod-validated inputs, same style as the existing user functions.

## Phase 4 — List page `/admin/colleges`
`admin.colleges.index.tsx`: summary cards (realtime), debounced search, multi-filter + sort persisted in URL search params, server pagination, bulk enable/disable/archive/restore/discovery with a dedicated confirmation sub-page (never a popup). Desktop table collapses to stacked cards on mobile. Reuses `ds`/`ui` table, card, skeleton, empty-state primitives. New shared bits in `src/components/admin/college-bits.tsx`.

## Phase 5 — Detail page `/admin/colleges/:collegeId`
Tabbed: Overview, Statistics (charts via existing `charts.tsx`), Student Analytics, Departments (create/rename/disable/archive as dedicated pages), Student Directory (searchable, links to `admin.users.$userId`), Discovery Analytics, Media (logo/banner upload/replace/delete), Actions (edit/enable/disable/archive/restore/soft-delete/regenerate rankings) — each action confirms + logs.

## Phase 6 — Create/Edit + realtime + wiring
`admin.colleges.new.tsx` and `admin.colleges.$collegeId.edit.tsx` full-page forms with client+server validation (unique name/code, file type/size, image dims), image upload to storage. `useAdminCollegesRealtime` hook. Add a **Manage Colleges** quick action on the dashboard. Typecheck + Playwright verify as admin.

## Explicitly deferred (no backing data — not faked)
Latitude/longitude, college verification workflow, moderators/regional admins, events/clubs/announcements/ambassadors, AI ranking insights, heatmaps, referral analytics, premium partnerships, branding customization, per-college feature flags, CSV/XLSX export of full nested data (basic CSV of the visible table can be included), profile-views/session-time metrics (not tracked). These can be added later without redesign.

## Technical notes
- Admin RPCs are `SECURITY DEFINER` + `has_role` gated; RLS on `colleges`/`departments` stays intact; no student-facing auth changes.
- Adding `college_id` to `departments` is nullable and backward-compatible; onboarding keeps working with existing global departments and gains per-college scoping where set.
- `status`↔`is_active` kept in sync so Home/Discovery/Onboarding (which read `is_active`) update immediately.
