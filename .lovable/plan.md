# Admin Logs & Observability Module (`/admin/logs`)

## Goal
A single enterprise-grade audit/monitoring surface that reads **real** activity already recorded across Coligo's existing tables — no new mock event streams. It unifies scattered audit sources into one searchable, filterable, exportable, realtime log platform, admin-only.

## What already exists (reuse, don't duplicate)
The DB already logs real events in:
`admin_logs`, `system_logs`, `error_reports`, `settings_audit_log`, `chat_admin_actions`, `match_admin_actions`, `moderation_actions`, `admin_login_attempts`, `device_sessions`.

The build normalizes these into one logical stream rather than inventing fake tables. Admin module patterns (`admin-analytics.functions.ts`, `use-admin-analytics-realtime.ts`, `admin.analytics.index.tsx`, DS components) are the template.

## Phase 1 — Database (migration)
1. **`public.unified_logs` normalizing SQL VIEW** mapping each source table into a common shape:
   `log_id, source, category (auth|user|admin|moderation|security|system|database|storage|api|realtime), severity (info|warning|error|critical), event, description, user_id, admin_id, ip, device, module, status, request_id, related_entity_type, related_entity_id, metadata (jsonb), created_at`.
   - `admin_logs` → admin; `moderation_actions`/`chat_admin_actions`/`match_admin_actions` → moderation; `settings_audit_log` → system; `error_reports` → database/error; `admin_login_attempts` → security/auth (severity by `success`); `system_logs` → user/system by `event_type`; `device_sessions` → auth.
2. **`app_role`-gated `SECURITY DEFINER` RPCs** (all call `has_role(auth.uid(),'admin')`, else raise):
   - `admin_logs_list(filters jsonb, sort text, page int, page_size int)` — server pagination over the view, indexed by `created_at`.
   - `admin_logs_kpis(range)` — the KPI counts (total, today, errors today, critical, security events, failed/successful logins, admin actions, moderation actions, api/storage/realtime errors, active sessions, suspicious).
   - `admin_logs_timeseries(range, bucket)` — logs/errors/auth per hour.
   - `admin_logs_distribution(dimension, range)` — by category/severity.
   - `admin_logs_detail(source, id)` — full record + JSON payload + prev/new state.
   - `admin_logs_investigation(key_type, key_value)` — event chain by user/request/match/chat/report/session id.
3. **Immutability**: view is read-only by construction; keep RLS on all base tables; no write RPCs. Grant `EXECUTE` on RPCs to `authenticated` only.

## Phase 2 — Server functions (`src/lib/admin-logs.functions.ts`)
`createServerFn` wrappers with Zod validation over each RPC (via `context.supabase` from `requireSupabaseAuth`), mirroring `admin-analytics.functions.ts`. Functions: `getLogsKpis`, `listLogs`, `getLogsTimeseries`, `getLogsDistribution`, `getLogDetail`, `getLogInvestigation`.

## Phase 3 — Realtime (`src/lib/use-admin-logs-realtime.ts`)
Subscribe to `postgres_changes` INSERT on the base log tables; on event, `invalidateQueries` for logs keys (debounced). Follows `use-admin-analytics-realtime.ts` exactly, with `removeChannel` cleanup.

## Phase 4 — UI (`/admin/logs`)
Route `src/routes/admin.logs.index.tsx` (registered under existing `admin.tsx` gate), mobile-first, using only DS components + `analytics-bits`/`charts`:
- **KPI cards** grid (realtime).
- **Filter/search bar**: debounced search, severity + category multi-select, date range, admin/user/college/device/status; URL-persisted (like analytics filters).
- **Sort** control (newest/oldest/severity/duration/recent errors).
- **Logs table** → responsive stacked cards on mobile; virtualized/paginated; severity badges; empty + skeleton states.
- **Detail panel/section**: full event, related entities as links (user/match/chat/report/college), expandable JSON viewer, prev/new state.
- **Timeline** and **analytics charts** (logs/hour, error rate, auth activity, etc.).
- **Investigation**: click a linked id → event chain.
- **Export**: CSV/XLSX/JSON via existing `xlsx` util; PDF via print-friendly view. In-page confirm for large exports.
- Robust error/retry states that preserve filters.

## Phase 5 — Integration
Add "Logs" entry to `/admin/dashboard` nav alongside Analytics/Settings.

## Phase 6 — Verification
`tsgo` typecheck; confirm route registration; Playwright: admin sign-in → `/admin/logs` loads real rows, filters/search/export/detail work, non-admin is blocked.

## Technical notes
- Read path only; no fake log generation. Coverage of categories reflects what the app actually records today; empty categories show proper empty states rather than mock rows (honest observability, extensible when new emitters land).
- All aggregation server-side for scale; indexed on `created_at`.
- Security: every RPC re-checks `has_role`; RLS stays enabled; logs are append-only/immutable.
