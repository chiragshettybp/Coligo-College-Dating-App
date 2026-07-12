# Coligo — Settings Module Plan

## What already exists (reused, not rebuilt)

- **Design system** (`/ui` = source of truth): `Switch`, `SettingsGroup`, `SettingsItem`, `RadioGroup`, `Checkbox`, `Dropdown`, `Slider`, `CollapsibleGroup`, `DangerZone` in `src/components/ds/settings.tsx`; plus `TopBar`, `EmptyState`, `Skeleton`, `Button`, `DiscoverShell` (bottom nav).
- **Server fns**: `getPreferences/updatePreferences`, `getNotificationPreferences/updateNotificationPreference`, `getFullProfile`, `getAppConfig`, `getFaqs`, `getLegalDocument`, `getCompanyInfo`, `createSupportTicket`, `blockUser`, `registerDeviceSession`.
- **Tables**: `settings` (discovery_enabled, push_enabled, email_enabled, match_sort/filters), `notification_preferences` (category/in_app/push/email), `blocks`, `profiles` (verification_status, account_status enum active|suspended|deleted), `device_sessions`, `faqs`, `legal_documents`, `company_information`, `app_versions`.
- **Realtime** already wired for profile/blocks in Discovery; root handles auth state + sign-out redirect.

Every screen is built by composing the above — no redesign.

## Scope decision on "(future)" items

The prompt marks many controls `(future)`. To honor "no placeholders/fake toggles", I will **build only the controls backed by real data now** and **omit** future-only ones (last active, read receipts, trusted devices, active sessions, 2FA, marketing, licenses). The data model is left extensible so they drop in later. I'll note this in each page's footnote where relevant.

---

## Phase 1 — Schema (one migration)

- `settings`: add `profile_visible boolean not null default true`, `show_online_status boolean not null default true`, `allow_profile_preview boolean not null default true`. (Privacy lives on the existing per-user `settings` row — no new table needed; `handle_new_user` already seeds `settings`.)
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.settings, public.notification_preferences;` (blocks already streamed).
- `blocks`: confirm/add RLS `DELETE` policy for `auth.uid() = blocker_id` (needed for unblock) + `SELECT own blocks`.
- Verify existing GRANTs; add if missing for the new columns' table (already granted).

No changes to reserved schemas. Delete-account uses existing `account_status='deleted'` enum value.

## Phase 2 — Server functions

New file `src/lib/settings.functions.ts` (all `requireSupabaseAuth`, Zod-validated, with `queryOptions`):
- `getAccountInfo` → phone, verification_status, college name, created_at (member since), account id, last_login_at.
- `getPrivacySettings` / `updatePrivacySetting` → the 4 privacy booleans (discovery_enabled + 3 new). Writing `profile_visible`/`discovery_enabled` immediately affects Discovery (RPCs already filter on `discovery_enabled`; add `profile_visible` to `discover_candidates`/`discover_profile`/`match_detail` visibility where profile is shown).
- `getSecurityInfo` → last_login_at, current session (from `device_sessions`), verification_status.
- `listBlockedUsers` → joined profile (avatar signed URL, full_name, college, blocked date).
- `unblockUser({ userId })` → delete from `blocks` where blocker=me.
- `getSettingsOverview` → lightweight aggregate for the dashboard (counts: blocked users, unread prefs summary).

New file `src/lib/settings-account.functions.ts` (privileged): `deleteMyAccount` — `requireSupabaseAuth`, then inside handler `await import("@/integrations/supabase/client.server")`, set `account_status='deleted'`, purge photos from `profile-photos`, remove `device_sessions`/`device_tokens`, then `supabaseAdmin.auth.admin.deleteUser(userId)`. Returns ok; client signs out + navigates to `/`.

Reuse existing fns for notifications, FAQs, legal, company/app version, support tickets.

## Phase 3 — Routes (all under `_authenticated/`)

1. `settings.index.tsx` — `/settings`: grouped `SettingsGroup`/`SettingsItem` list (Account, Privacy, Notifications, Security, Blocked Users, Help, About, then a DangerZone-style group for Logout + Delete Account). Loads overview; each row navigates (no popups).
2. `settings.account.tsx` — read-only account card + "View Profile" (`/profile/preview`) and "Edit Profile" (`/profile/edit`) buttons; "Change Password" → `/auth/forgot-password`.
3. `settings.privacy.tsx` — `Switch` rows for Profile Visibility, Discovery Visibility, Show Online Status, Allow Profile Preview. Optimistic update + rollback + toast, invalidate on success.
4. `settings.notifications.tsx` — per-category `Switch` rows driven by `notification_preferences` (In-App / Match / Message / Announcement / Security). Reuses `updateNotificationPreference`.
5. `settings.security.tsx` — current session + recent login info; "Reset Password" → auth reset flow; static Security Tips group.
6. `settings.blocked-users.tsx` — list with avatar/name/college/blocked date; "View Profile" + "Unblock" (navigates to confirmation). Empty state via `EmptyState`.
7. `settings.blocked-users.$userId.unblock.tsx` — dedicated confirmation page; calls `unblockUser`, invalidates blocks + discovery.
8. `settings.help.tsx` — FAQ (from `getFaqs`, `CollapsibleGroup`), Contact Support (`/contact`), Privacy/Terms/Community links, Report Bug (`createSupportTicket`).
9. `settings.about.tsx` — app name/version/build/release from `getAppConfig`; developer info from `getCompanyInfo`; Privacy/Terms links.
10. `settings.logout.tsx` — confirmation page: cancelQueries → queryClient.clear → `supabase.auth.signOut()` → `navigate('/', replace)`.
11. `settings.delete-account.tsx` — consequences + explicit typed confirmation + optional feedback; calls `deleteMyAccount`, then sign-out + redirect.

Each route: `head()` with title + `robots noindex`, `loader` via `ensureQueryData`, `pendingComponent` (skeleton), `errorComponent`, `notFoundComponent` where dynamic.

## Phase 4 — Realtime sync

`src/lib/use-settings-realtime.ts`: subscribe (inside `useEffect`, cleanup with `removeChannel`) to `settings`, `notification_preferences`, `blocks` for `auth.uid()`; invalidate the matching queries so privacy/notification/block changes reflect instantly across tabs/devices and in Discovery/Matches/Chat.

## Phase 5 — Navigation wiring

- Profile gear icon (`profile.index.tsx`, currently → `/profile/preferences`) and the Settings button → `/settings`.
- Keep `/profile/preferences` reachable from Privacy/Notifications where overlapping (or fold its controls into the new pages and redirect).
- Ensure back navigation returns to `/settings` / `/profile` correctly.

## Phase 6 — Verify

- `tsgo` typecheck + build.
- Confirm migration applied, realtime publication, RLS on `blocks` delete.
- Manual review of redirect/guard flows (external Supabase → no signed-in browser E2E; verify via schema + types + route registration).

---

## Technical notes

- Privacy stored on existing `settings` row; no `privacy_settings` table (avoids duplication). `profiles`/`users`/`sessions`/`system_configuration` from the prompt map to `profiles` + `device_sessions` + `application_settings`/`app_versions`.
- Delete uses soft-delete flag + admin `deleteUser`; all writes RLS-scoped to `auth.uid()`.
- No new secrets required (service role already present).
