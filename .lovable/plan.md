# Admin User Management Module — Implementation Plan

Scope: build `/admin/users` (list) and `/admin/users/:userId` (detail) only, reusing the existing design system, with real Supabase data, server-side admin gating, audit logging, and realtime. No new visual language — everything composes from `src/components/ds/*`, `src/components/ui/*`, and tokens in `src/lib/ds.ts`, matching what already ships on `/ui`, `/admin`, and `/admin/dashboard`.

This is intentionally scoped to what the current schema can back with real data. Items in your prompt that have no backing table today (warnings table, per-device IP/OS/browser, storage-bytes usage, CSV/XLSX export pipeline, tags, appeals, premium) are called out per phase as either (a) derived from existing data, or (b) deferred with a clear note — so nothing ships as fake/mock.

---

## Phase 1 — Backend: admin RPCs + audit + RLS

All reads/writes go through `SECURITY DEFINER` RPCs that re-check `has_role(auth.uid(),'admin')` and raise `Forbidden`, matching the existing admin RPC pattern. No new broad RLS grants to `anon`/`authenticated`.

New migration adds:
- `admin_list_users(_search, _filters jsonb, _sort, _limit, _offset)` → paginated rows with: profile photo (primary), full_name, phone, gender, age (from `date_of_birth`), college name, department name, semester, graduation_year, created_at, last_login_at, account_status, verification_status, discovery (`settings.discovery_enabled`), profile completion %, matches count, chats count, reports-received count, device count, online status (`last_login_at > now()-5min`), plus `total_count` for server pagination.
- `admin_user_detail(_user_id)` → full profile, account info, settings, photos, interests.
- `admin_user_stats(_user_id)` → swipes, likes given/received, passes, matches, messages sent, media uploaded, reports received/submitted, blocks, unmatches, notifications count.
- `admin_user_matches(_user_id)`, `admin_user_reports(_user_id)`, `admin_user_devices(_user_id)` (from `device_sessions`/`device_tokens`), `admin_user_timeline(_user_id)` (derived chronological events from existing tables + `admin_logs`).
- Moderation writes: `admin_set_account_status(_user_id, _status, _reason)` (active/suspended/banned/deleted — soft), `admin_set_verification(_user_id, _status)`, `admin_reset_discovery(_user_id)`, `admin_force_logout(_user_id)` (revoke `device_sessions`), `admin_clear_reports(_user_id)`. Each writes an `admin_logs` row (admin_id, action, target, metadata) inside the same transaction and blocks self-targeting (can't ban yourself) and invalid transitions (e.g. restore an active user).
- Realtime: add `profiles`, `reports` (if not already) to `supabase_realtime` publication so status/verification changes push live.

Indexes: on `profiles(account_status)`, `profiles(created_at)`, `profiles(last_login_at)` to keep list queries fast.

## Phase 2 — Server functions layer

Extend `src/lib/admin.functions.ts` (or a new `src/lib/admin-users.functions.ts`) with `createServerFn` wrappers + `queryOptions` for every RPC above, all under `.middleware([requireSupabaseAuth])`. Typed inputs via zod (search string, filter object, sort enum, pagination, userId uuid). Moderation actions are `POST` fns that invalidate the relevant query keys on the client.

## Phase 3 — Reusable admin table primitives

Small composables under `src/components/admin/` built ONLY from existing `ui`/`ds` pieces:
- `UserTable` (desktop) using `ui/table.tsx`; collapses to stacked cards (`ds/card.tsx`) on mobile.
- `UserFilters` (chips/selects), `UserSearch` (debounced `TextField`), `Pagination` (`ui/pagination.tsx`), `EmptyState` (`ds/empty-state.tsx`), loading `Skeleton`s, bulk-select checkboxes with cross-page persisted selection.

## Phase 4 — `/admin/users` list page

Route `src/routes/admin.users.tsx`. Admin guard via `adminGuardQuery` (same pattern as dashboard; redirect non-admins to `/admin/login`). Server-paginated, debounced search, multi-filter, sorting — all state kept in URL search params so failures/reloads preserve filters/pagination/selection. Realtime subscription invalidates the list on profile/report changes. Bulk actions (suspend/ban/verify/restore/delete) route to a dedicated in-page confirmation step (not a popup) and run transactionally, reporting partial failures.

## Phase 5 — `/admin/users/:userId` detail page

Route `src/routes/admin.users.$userId.tsx` with `errorComponent` + `notFoundComponent` (invalid/deleted user handled gracefully). Tabbed sections (`ui/tabs.tsx`): Profile, Account Info, Statistics (charts via existing `components/admin/charts.tsx`), Activity Timeline, Devices, Photos (gallery → `ds/image-viewer.tsx`), Matches, Reports. An Admin Actions panel with dedicated confirmation screens for each moderation action, each writing an audit log and updating live.

## Phase 6 — Realtime, failure handling, verification

Wire a `useAdminUsersRealtime` hook (mirrors existing `use-admin-realtime.ts`) to invalidate queries on `profiles`/`reports`/`matches` changes. Graceful handling for every failure case (invalid id, missing records, expired session, network/Supabase down, partial bulk failure) with clear messages + retry, preserving admin state. Verify with typecheck and a Playwright pass logged in as the admin account.

---

## Explicitly deferred (no real backing data today — will NOT be faked)

These are noted in the UI as "coming soon"/hidden rather than shown with mock data:
- Username, warnings table, per-device OS/browser/IP, storage-bytes used, CSV/XLSX export generation, tags/labels, announcements, premium/payments, AI moderation, fraud/risk scoring, appeals. Each can be added later without redesign.

If you'd like any deferred item pulled into scope (e.g. a real `warnings` table, or CSV export), tell me and I'll fold it into the relevant phase before building.

## Technical notes
- Every table creation includes GRANTs + RLS per project rules; admin reads go only through `SECURITY DEFINER` RPCs.
- No email auth anywhere; admin identity stays phone+PIN as already set up.
- No changes to student `_authenticated` area; `/admin/*` stays a separate guarded surface.