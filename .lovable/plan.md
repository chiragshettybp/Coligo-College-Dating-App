# Admin Settings Module (`/admin/settings`)

Central configuration center for Coligo. Reuses the exact patterns already shipped in the other admin modules (admin-gated `SECURITY DEFINER` RPCs → thin `createServerFn` wrappers → realtime hook → DS-only UI). No mock data, everything persists to Supabase and propagates live.

## What already exists (reused, not rebuilt)
- `application_settings` (maintenance, support email, min app version) — extend, don't replace.
- `feature_flags` (key/enabled/payload) — becomes the backing store for the Feature Flags section.
- `announcements`, `app_versions`, `admin_logs` (audit trail), `settings` (per-user defaults).
- App-side readers already consume these: `__root.tsx`, `system.maintenance.tsx`, `settings.functions.ts`, `matches.functions.ts`, `profile-full.functions.ts`. New settings must feed the same readers so changes take effect live.

## Phase 1 — Database (single migration)
Normalized per-domain config tables (one row = one live config, not JSON blobs), each with the standard 4-step (CREATE → GRANT → RLS → POLICY) and `updated_at` trigger:
- `platform_settings` (general: app name, description, support phone, copyright, current/min version, force-update).
- `authentication_settings` (mobile/OTP/password login toggles, OTP expiry, max OTP attempts, session duration, auto-logout, password rules, account-lock threshold).
- `onboarding_settings` (min age, min/max photos, max bio, min/max interests, college/department/semester rules, mandatory fields jsonb).
- `discovery_settings` (enabled, match creation, auto-match, ranking algo, same/cross-college, cache refresh).
- `chat_settings` (enabled, image/voice/replies/reactions/read-receipts/typing toggles, max image size, max voice duration, max message length).
- `notification_settings` (in-app, match, message, announcement, system, broadcast toggles).
- `moderation_settings` (auto-block/report/warning thresholds, auto-suspension).
- `storage_settings` (limits/config only; live usage is computed at read time).
- `security_settings` (session timeout, JWT lifetime, rate limits, API limits, admin session duration, device limits, require-reauth flag).
- `settings_audit_log` (immutable: admin_id, category, setting_key, previous_value, new_value, reason, ip, created_at) — insert-only, no update/delete policy.

Maintenance mode + feature flags reuse `application_settings` and `feature_flags`.

RLS: every table `SELECT/UPDATE` gated to `has_role(auth.uid(),'admin')`; audit log `SELECT` admin-only, `INSERT` via RPC only. Public app reads continue through the existing narrow readers / server fns.

Seed one default row per config table so the UI never shows empty state.

Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE` for the config tables + `settings_audit_log`.

RPCs (`SECURITY DEFINER`, each re-checks `has_role`, raises `Forbidden`):
- `admin_settings_overview()` → dashboard cards (platform status, maintenance, active/online users, versions, DB/storage/realtime/auth health, pending-changes count, last update ts).
- `admin_settings_get(_category)` / `admin_settings_update(_category, _values jsonb, _reason)` — validates ranges server-side, writes the row, and writes an audit entry atomically (returns new row).
- `admin_feature_flag_set(_key,_enabled,_payload,_reason)`.
- `admin_settings_history(_category,_limit,_offset)` → audit log page.
- `admin_settings_export()` / `admin_settings_import(_payload jsonb,_reason)` — transactional, rollback on validation failure.
- `admin_storage_stats()` → images/voice/backups/available (from storage metadata).

## Phase 2 — Server functions (`src/lib/admin-settings.functions.ts`)
Thin `createServerFn` wrappers with Zod validators over the RPCs, mirroring `admin.functions.ts`. Export `queryOptions` for each read. `admin-settings` guard reuses the existing `adminGuardQuery` pattern.

## Phase 3 — Realtime (`src/lib/use-admin-settings-realtime.ts`)
One channel subscribing to all config tables + audit log; debounced `queryClient.invalidateQueries` on the settings query keys. Same shape as `use-admin-analytics-realtime.ts`.

## Phase 4 — UI (`src/routes/admin.settings.index.tsx` + `src/components/admin/settings-bits.tsx`)
Mobile-first, DS-only (`ds/glass`, `ds/card`, `ds/navigation`, existing toggles/inputs/tabs). Structure:
- Admin guard + redirect to `/admin/login` (identical to other admin routes).
- Realtime overview cards at top.
- Tabbed / accordioned categories (General, Authentication, Onboarding, Discovery, Chat, Notifications, Moderation, Colleges, Profile, Storage, Security, Maintenance, Feature Flags, Announcements, System Info).
- Per-category form: local dirty state, client-side validation matching server rules, Save/Reset with success/error feedback, preserves input on failure.
- Instant settings search filtering across all sections.
- Config history panel (previous → new value, admin, timestamp, reason).
- Bulk actions (reset category/platform, export/import) → dedicated in-page confirmation views, never popups.
- Storage section shows live usage + maintenance action buttons.
- "Coming Soon" badges for future-flagged items (AI/image/voice moderation, allowed IPs, force-update) — labeled, not faked.

## Phase 5 — Integration
- Add "Settings" entry to `/admin/dashboard` module nav (`admin.dashboard.tsx`).
- Wire new config into existing app readers so changes take effect: maintenance already read in `__root.tsx`/`system.maintenance.tsx`; feature flags gate Discovery/Chat/etc.; onboarding/chat/discovery/security readers pull from the new tables via existing server fns.
- Announcements section reuses the existing `announcements` table.

## Phase 6 — Verification
- `tsgo` typecheck + build.
- Playwright: unauthenticated `/admin/settings` redirects to `/admin/login`; after admin sign-in, save a setting → confirm persistence + audit row + realtime refresh.
- Confirm no secrets/env values ever rendered.

## Technical notes
- Reserved-schema safe: only `public` tables + `supabase_realtime` publication.
- Concurrent-edit safety: `admin_settings_update` compares/stamps `updated_at`; stale writes rejected with a recoverable error.
- Validation triggers (not CHECK constraints) for range rules.
- Zod on both client and server; ranges/limits identical on both sides.
