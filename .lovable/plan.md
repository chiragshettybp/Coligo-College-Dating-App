# Notifications Module — Implementation Plan

## Current state (verified against the live project)

- `public.notifications` already exists: `id, user_id, type, title, body, data(jsonb), read_at, created_at`. RLS = SELECT own + UPDATE own. **No DELETE policy.** Realtime **is** enabled.
- Triggers already insert rows: `notify_on_match` (type `match`), `notify_on_message` (types `note`/`message`). `notify_push` fires web push via `/api/public/push` on every insert.
- Gaps: no `/notifications` routes, no notifications server functions, no unread badge, no DELETE policy, no priority field, no per-type preference respect (push fires regardless of `settings.push_enabled`), and no `notification_preferences` table.
- Entry point already exists: the **Bell** button in the home header (`home.index.tsx`, currently shows a "coming soon" sheet).
- Design system source of truth: `/ui` (`src/routes/ui.tsx`) + `src/components/ds/*` (Card, Badge, Skeleton, EmptyState, navigation). These get reused, nothing redesigned.

---

## Phase 1 — Database & backend foundation (one migration)

1. Add columns to `notifications`:
   - `priority text not null default 'normal'` (values `low|normal|high|urgent`).
   - `deleted_at timestamptz` (soft delete, so realtime DELETE-style updates + "already deleted" handling are clean and reversible).
2. Add missing RLS: keep SELECT/UPDATE own; **no hard DELETE** — deletion is a soft-delete UPDATE (`deleted_at = now()`), already covered by the UPDATE-own policy. All reads filter `deleted_at is null`.
3. Create `notification_preferences` table (per-user, per-category toggles) — future-proof so new types don't need schema changes:
   - `user_id uuid`, `category text`, `in_app boolean default true`, `push boolean default true`, `email boolean default false`, unique(`user_id`,`category`). Full GRANTs + RLS (own-row manage) + `service_role` grant.
4. RPCs (SECURITY DEFINER, `search_path=public`):
   - `unread_notifications_count()` → int.
   - `mark_notification_read(_id)` / `mark_all_notifications_read()` → single-transaction bulk update, returns count.
   - `soft_delete_notification(_id)` → sets `deleted_at`, idempotent.
5. Normalize/extend `type` vocabulary to the spec set (`MATCH_CREATED, NEW_MESSAGE, FIRST_NOTE, SYSTEM_ANNOUNCEMENT, ACCOUNT_NOTICE, COLLEGE_ANNOUNCEMENT, PROFILE_UPDATE, SECURITY_ALERT, ADMIN_MESSAGE, WELCOME`). Keep existing lowercase rows working via a mapping layer in code (no destructive data change). Update `notify_on_match`/`notify_on_message` to emit the new type codes + a `route`/`data` payload for navigation.
6. Preference-aware generation: update `notify_push` (and the insert triggers) to **check `notification_preferences`/`settings` before inserting an in-app row or firing push**, so disabled categories generate nothing.

*(Migration surfaced via the migration tool for your approval before any code.)*

## Phase 2 — Server functions (`src/lib/notifications.functions.ts`)

All via `createServerFn` + `requireSupabaseAuth` (RLS-scoped to the user):
- `listNotifications({ cursor, limit })` — paginated, newest first, joins related profile/match/message metadata for the card (avatar, name) with graceful nulls for deleted references.
- `getNotification({ id })` — full detail + resolved related content; returns a `missing` flag when the target no longer exists.
- `markRead`, `markAllRead`, `deleteNotification`, `unreadCount` — thin wrappers over the RPCs.
- `getNotificationPreferences` / `updateNotificationPreference`.

## Phase 3 — Realtime + shared hook

- `src/lib/use-notifications.ts`: subscribes (inside `useEffect`, cleanup with `removeChannel`) to `postgres_changes` on `notifications` filtered to the current user; keeps a TanStack Query cache of the list + unread count in sync on INSERT/UPDATE, and drives the header badge. Reconnect handling for pull-to-refresh.

## Phase 4 — `/notifications` dashboard route

`src/routes/_authenticated/notifications.index.tsx` inside the existing app shell:
- Notification cards reusing `Card`, type icon, title, body, relative timestamp, unread dot, `Badge` for priority, related avatar.
- Skeleton list on load (reuse `Skeleton`), `EmptyStateFromPreset` "notifications" empty state, `Mark all as read` action.
- Mobile-first: pull-to-refresh, thumb-friendly targets, optimistic mark-read on tap then contextual navigation (match→match page, message/note→chat, announcement/alert→detail).
- `errorComponent` + `notFoundComponent` with retry.

## Phase 5 — `/notifications/$notificationId` detail + delete confirmation

- `notifications.$notificationId.tsx`: full detail, category, related user/content, contextual action buttons (Open Chat / View Match / View Profile / Go Home / Delete). Marks read on open. Handles missing target gracefully.
- `notifications.$notificationId.delete.tsx`: **dedicated confirmation page** (no popup, per spec) → soft-delete → back to list, realtime-synced.

## Phase 6 — Integration & entry points

- Wire the home-header **Bell** to `/notifications` and show a live unread badge on it (replace the "coming soon" sheet).
- Surface unread count wherever the header/badge appears; keep `matchesBadge` behavior intact.
- Add a `/notifications` demo block to `/ui` so the module stays documented in the design source of truth.

## Phase 7 — Verification

- `tsgo` typecheck, RLS/ownership checks, realtime insert→badge→list live test, mark-all transaction, soft-delete idempotency, missing-reference fallback, empty state, and preference-respecting generation (disabled category creates nothing).

---

## Technical notes
- No mock data — every card is a real `notifications` row; badges/counts come from RPCs.
- Soft-delete (not hard delete) keeps realtime + "already deleted" handling simple and matches the "prevent duplicate deletion" requirement.
- Type vocabulary handled through a code-side map so legacy rows and new codes coexist without a destructive migration.
- Everything composes existing `ds/*` components; no visual redesign.

Approve and I'll start with the Phase 1 migration.