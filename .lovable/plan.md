# Coligo Admin Module — Implementation Plan

Scope: **only** `/admin/login` and `/admin/dashboard`. Real Supabase data, admin-only access, realtime. Reuses the `/ui` design system (no redesign). Future modules (Users, Reports, etc.) are surfaced as Quick Actions that link to `/admin/dashboard` for now.

## How admin auth works (important)
The app already signs students in with **+91 phone + password** by mapping the phone to an email *alias* (`phoneToAlias`) and calling `signInWithPassword`. No email is ever sent. The admin reuses this exact mechanism:
- **Identity** = admin phone number (+91).
- **6-digit PIN** = the auth password, hashed by Supabase Auth (bcrypt) — never stored in plaintext or in a table.
- **Authorization** = a row in the existing `user_roles` table with `role = 'admin'`, checked by the existing `has_role()` security-definer function.

This satisfies "phone + PIN, no email auth, PIN hashed, admin-only" without a parallel auth system.

After you approve, I will **ask you for the admin phone number and 6-digit PIN**, then create that single admin account (no fake/hardcoded credentials).

---

## Phase 1 — Database & security (migration)
1. **`admin_logs`** audit table: `admin_id`, `action`, `target_table`, `target_id`, `ip`, `metadata jsonb`, `created_at`. RLS: only admins can read; inserts via security-definer logging fn. GRANTs to `authenticated` + `service_role`.
2. **`admin_login_attempts`** table for rate limiting / brute-force protection: `phone`, `success`, `ip`, `created_at`. Admin-read only.
3. **Admin-gated aggregate RPCs** (SQL `SECURITY DEFINER`, each begins with `IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION`):
   - `admin_dashboard_stats()` → all overview counters (total/verified/active/online/new users, gender split, colleges, departments, swipes, likes, passes, matches, matches today, messages today, conversations, photos, reports pending, blocked, deleted accounts) as one `jsonb`.
   - `admin_timeseries(_days int)` → daily signups, matches, messages, active users, storage growth.
   - `admin_distribution()` → gender, department, profile-completion, top colleges, college growth.
   - `admin_recent_activity(_limit int)` → unified latest registrations/matches/messages/reports/blocks/deleted/admin actions.
   - `admin_log_action(...)` → append to `admin_logs`.
4. Enable **realtime** on the tables the dashboard subscribes to (profiles, matches, messages, reports, blocks) via `ALTER PUBLICATION supabase_realtime ADD TABLE ...` (skip any already added).
5. Reuse existing `platform_stats()`, `college_rankings()`, `has_role()`.

## Phase 2 — Admin account creation
- After approval, prompt for **admin phone + 6-digit PIN**.
- Create the auth user (phone alias + PIN as password) and insert `user_roles(admin)` for that id via a one-time secured server action (service role, run once). No other account gets `admin`.

## Phase 3 — Server functions (`src/lib/admin.functions.ts`)
All use `requireSupabaseAuth` + verify `has_role(admin)` server-side (never trust the client):
- `adminDashboardStatsQuery`, `adminTimeseriesQuery`, `adminDistributionQuery`, `adminRecentActivityQuery`, `adminSystemHealthQuery` (pings DB/realtime/storage/auth), `adminSearch({ q })`, `logAdminAction`.
- Public read shape via `queryOptions` + `ensureQueryData` in loaders, `useSuspenseQuery` in components.

## Phase 4 — Routes
- **`src/routes/admin.tsx`** — pathless-style admin layout wrapper (Coligo background, admin top bar). Public parent so `/admin/login` is reachable.
- **`src/routes/admin.login.tsx`** — phone (`PhoneField`) + 6-digit PIN field with show/hide toggle, security notice, submit. Validates Indian mobile + 6-digit PIN with zod. On submit: check client-side rate limit, `signInWithPassword(alias, pin)`, then verify `has_role(admin)`; if not admin → `signOut()` + generic error ("Invalid credentials" — never reveal which field). Records attempt; locks out after N failures in a window. Redirects authed admins to dashboard.
- **`src/routes/admin.dashboard.tsx`** — guarded (redirects to `/admin/login` if not authenticated or not admin), loader prefetches stats. Contains: overview stat-card grid, charts, recent activity feed, quick actions, system status, search, notifications.

Guarding: a `beforeLoad`/component check calling `has_role(admin)`; non-admins and students are redirected to `/admin/login`. Student sessions can authenticate but fail the admin-role check, so they never see admin data (RLS + RPC role checks enforce this even if the UI is bypassed).

## Phase 5 — Dashboard UI (reuse `/ui` primitives)
- **Overview cards**: `StatCard` grid (`src/components/ds/card.tsx`), responsive `grid-cols-2 md:grid-cols-4`, skeletons while loading.
- **Charts**: add `recharts` (client-only) wrapped in small themed components using design tokens — line/bar/area for signups, matches, messages, active users, college growth, storage; donut/bar for gender & department distribution; `ProgressBar` for profile completion. Reduced-motion respected.
- **Recent activity feed**: list using existing card/avatar/badge components.
- **Quick actions**: `SettingsItem`/card links (Users, Colleges, Reports, Chats, Analytics, Settings, Logs) → point to `/admin/dashboard` until those modules exist.
- **System status**: live badges (Supabase, realtime, storage, auth, DB health) from `adminSystemHealthQuery`.
- **Search**: `SearchBar` with debounced instant `adminSearch` across users/colleges/reports.
- **Notifications**: pending reports + system alerts; clicking routes to the relevant (future) module.

## Phase 6 — Realtime
- `src/lib/use-admin-realtime.ts`: one channel subscribing to INSERT/UPDATE on profiles, matches, messages, reports, blocks → invalidates the dashboard queries (throttled) so cards/charts/feed refresh instantly. Presence count for "Users online" via existing presence util. Cleanup on unmount.

## Phase 7 — States, a11y, verify
- Loading skeletons for cards/charts/tables; no layout shift. Error components with retry; offline/realtime-disconnected banners. Keyboard nav, ARIA labels, semantic headings, visible focus, accessible chart summaries.
- Verify: typecheck, run migrations, confirm RLS/role gating (student token cannot read admin RPCs), confirm realtime updates, confirm login lockout + generic errors.

---

## Technical notes
- **No new auth system / no email**: admin = phone-alias auth user + `user_roles.admin`; PIN is the bcrypt auth password.
- **New dependency**: `recharts` (client-side charts). Everything else reuses existing DS + Supabase.
- **New tables**: `admin_logs`, `admin_login_attempts`. **New RPCs**: the `admin_*` functions above. **Realtime**: publication additions.
- **Not building yet** (future modules, per scope): the full Users/Colleges/Reports/Chats/Analytics/Settings/Logs management pages — only their dashboard entry points.
- I will request the admin phone + PIN right after you approve, before creating the account.
