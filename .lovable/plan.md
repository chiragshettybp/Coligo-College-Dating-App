## Admin Analytics Module — `/admin/analytics`

Business-intelligence center for Coligo. Reuses the existing admin stack — no redesign, no new design system. Built on the same admin-gated `createServerFn` + `SECURITY DEFINER` RPC + Supabase Realtime pattern already used by `/admin/dashboard`, `/admin/matches`, `/admin/chats`, `/admin/reports`.

### Scope guardrails
- Ship what has real backing data today (users, profiles, colleges, departments, swipes, matches, messages, reports, notifications, moderation actions). Metrics with no source table (session length, screen views, notification CTR, device/app-version, revenue) are shown as **future-ready empty states**, not fabricated numbers.
- Reuse `src/components/ds/*`, `src/components/admin/charts.tsx` (`AreaTrend`, `BarSeries`, `Donut`), `StatCard`, `TopBar`, filters, skeletons, empty states. No new visual primitives unless a chart type is genuinely missing (heatmap grid, leaderboard row) — those go in `charts.tsx`.

---

### Phase 1 — Database (single migration)
All aggregation runs server-side in `SECURITY DEFINER` RPCs gated by `has_role(auth.uid(),'admin')`; students can never call them. No new user-data tables; analytics reads existing tables.

RPCs (return JSON, accept `p_start timestamptz, p_end timestamptz`, and optional filter args — college_id, department_id, gender, verification_status):
- `admin_analytics_kpis(...)` → all global KPI counts in one round-trip (users, verified, new-today/week/month, colleges, departments, swipes/likes/passes, matches, match rate, messages, images, voice notes, reports, banned/suspended, active conversations, DAU/WAU/MAU derived from `messages`/`swipes`/`updated_at` activity).
- `admin_analytics_timeseries(p_metric text, p_bucket text, ...)` → daily/hourly series for registrations, swipes, matches, messages (one RPC, metric-switched).
- `admin_analytics_distribution(p_dimension text, ...)` → gender/age/college/department/semester/graduation/completion/verification distributions.
- `admin_analytics_leaderboard(p_kind text, p_limit int)` → top colleges/departments by users, matches, messages, engagement, growth.
- `admin_analytics_heatmap(p_metric text, ...)` → 7×24 day-of-week × hour buckets for activity/messaging/matching.
- `admin_analytics_moderation(...)` → reports by category/status, resolution time, repeat offenders (reads `reports`, `match_admin_actions`, `chat_admin_actions`, `moderation_actions`).
- `admin_analytics_system_health()` → reuse/extend existing `getSystemHealth` source (counts, storage indicators available).

Supporting indexes on `created_at`, `college_id`, `department_id` where missing to keep aggregations fast. No materialized views in v1 (data volume is small); RPCs are written so they can be swapped for MVs later without changing the server-function contract.

### Phase 2 — Server functions — `src/lib/admin-analytics.functions.ts`
Thin `createServerFn({ method: "GET" })` wrappers over the RPCs, each `.inputValidator` (zod) for date range + filters, plus matching `queryOptions` factories (following `admin.functions.ts` exactly). Date-range validation (start ≤ end, max span clamp) lives here. Every fn relies on the admin RPC guard; unauthorized calls return an error the UI renders as an access state.

### Phase 3 — Realtime — `src/lib/use-admin-analytics-realtime.ts`
One hook subscribing to `profiles`, `matches`, `messages`, `swipes`, `reports`, `notifications` inside `useEffect` with `supabase.removeChannel` cleanup (per project realtime rule). On change it `invalidateQueries(["admin","analytics"])` (debounced) so cards/charts/feeds refresh without manual reload. Live Activity Feed reuses the existing `getAdminActivity` source.

### Phase 4 — Page — `src/routes/admin.analytics.index.tsx`
Mobile-first, progressively enhanced to multi-column. Sections, all fed by the RPCs above:
1. Date-range control (Today → Custom) + global filter bar (college, department, gender, verification, age group) with persisted state via URL search params (`validateSearch` + `fallback`).
2. KPI card grid (real counts; unbacked KPIs → labeled "Coming soon" tiles).
3. User / Discovery / Match / Chat / Engagement / College / Department / Moderation / Notification analytics blocks — each a set of `AreaTrend`/`BarSeries`/`Donut`/table cards driven by timeseries/distribution/leaderboard RPCs.
4. Heatmaps (7×24 grid), Leaderboards, Live Activity Feed, System Analytics.
5. Export: client-side CSV + XLSX (via `xlsx`/SheetJS) of the currently filtered dataset; PDF and scheduled/email reports scaffolded as disabled future-ready affordances.

Route is placed to inherit the existing admin auth gate (same as sibling `admin.*` routes); redirects non-admins to `/admin/login`. Loader primes queries via `ensureQueryData`; component reads with `useSuspenseQuery`. `errorComponent` + `notFoundComponent` set; every widget handles empty/loading/error independently so one failed aggregation never blanks the dashboard.

### Phase 5 — Integration & verification
- Add "Analytics" entry to `/admin/dashboard`.
- `tsgo` typecheck; verify admin gating (signed-out → `/admin/login`) with Playwright.
- Confirm realtime invalidation and CSV/XLSX export against real data.

### Technical notes
- New dep: `xlsx` (SheetJS) for XLSX export — added via `bun add` before import.
- Charts run client-side; heatmap/leaderboard row components added to `charts.tsx` if missing.
- All secrets/env untouched; everything goes through existing Supabase clients.
