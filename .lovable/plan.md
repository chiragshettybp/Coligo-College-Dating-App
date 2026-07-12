# Matches Module — Implementation Plan

Builds the full Matches module for Coligo (`/matches`, `/matches/:matchId`, `/matches/:matchId/note`, plus dedicated confirm/report pages), fully wired to Supabase. Reuses the existing `/ui` design system (`src/components/ds/*`, tokens in `src/lib/ds.ts`), the `DiscoverShell` frame, photo-signing, and the auth/RLS patterns already used by Discovery.

## What already exists (reused, not rebuilt)
- `matches` table (`user_a`, `user_b`, `created_at`, `last_message_at`) with owner-only SELECT RLS. Realtime already on.
- `messages` table with `read_at` (drives unread counts — no separate `message_reads` table needed for 1:1 chat). Realtime already on. RLS: participants read/insert, recipients mark read.
- `blocks`, `reports` tables + RLS, and `blockUser` / `reportUser` / `sendMatchNote` server functions in `src/lib/discover.functions.ts`.
- `match_screen` / `match_participants` RPCs, photo `signPaths` helper, presence hooks (`use-presence-set.ts`), `DiscoverShell` with a Matches tab (currently opens a "coming soon" sheet).

## Gaps to close
- No `notifications` table.
- `matches` has no unmatch/archive state or DELETE path.
- `settings` has no sort/filter preference storage.
- No matches-list RPC (list + latest message + unread count in one query).
- Matches tab + home "Matches today" card are not linked to real routes.

---

## Phase 1 — Database (single migration)
1. `matches`: add `status text NOT NULL DEFAULT 'active'` (`active` | `unmatched`), `unmatched_by uuid`, `unmatched_at timestamptz`. Add owner UPDATE policy (participants only) so unmatch can flip status. Keep messages intact (archive, not delete).
2. `notifications` table: `id`, `user_id`, `type` (`match` | `message` | `note` | `system`), `title`, `body`, `data jsonb`, `read_at`, `created_at`. GRANTs (`authenticated`, `service_role`), RLS (users see/update only their own), realtime enabled.
3. `settings`: add `match_sort text DEFAULT 'recent_activity'` and `match_filters jsonb DEFAULT '[]'` for persisted preferences.
4. SECURITY DEFINER RPCs:
   - `my_matches()` → for each active match of `auth.uid()`: other participant (name, age, college, department, primary photo path, last_login_at), match `created_at`/`last_message_at`, latest message body+sender+time, unread count (messages where `sender_id <> me AND read_at IS NULL`). Excludes blocked relationships and unmatched rows.
   - `match_detail(_match_id)` → full participant profile (gallery paths, bio, interests, common interests, semester, grad year, last active) + match meta + conversation-exists flag; validates ownership; returns null for invalid/blocked/removed.
   - `unmatch(_match_id)` → validates ownership, sets `status='unmatched'`, stamps `unmatched_by/at` (transactional).
   - `note_status(_match_id)` → whether the current user already sent a first note (prevents duplicates).
5. Notification triggers: on new `matches` row → insert `match` notifications for both users; on new `messages` row → insert `message`/`note` notification for the recipient.

## Phase 2 — Server functions (`src/lib/matches.functions.ts`)
All `createServerFn` + `requireSupabaseAuth`, returning plain DTOs, with `queryOptions` factories:
- `matchesListQuery()` — calls `my_matches`, signs primary photo paths, returns `MatchListItem[]`.
- `matchDetailQuery(matchId)` — calls `match_detail`, signs gallery paths.
- `sendFirstNote({matchId, body})` — validates (non-empty, max length), checks `note_status`, inserts message, returns conversation target. (Extends existing `sendMatchNote`.)
- `openConversation({matchId})` — ensures/opens conversation (1:1 match already is the conversation; guarantees no duplicate), returns route target.
- `unmatch({matchId})`, and reuse existing `blockUser` / `reportUser`.
- `updateMatchPrefs({sort, filters})` — persists to `settings`.
- Unread total helper for the nav badge.

## Phase 3 — Routes & UI (mobile-first, `/ui` components only)
- `_authenticated/matches.tsx` — layout guard (onboarding complete) + `<Outlet/>`, mirrors `discover.tsx`.
- `_authenticated/matches.index.tsx` — dashboard: skeleton loaders, match cards (photo, name, age, college, department, match timestamp, latest-message preview, unread badge, online dot, Open Chat / View Match / Preview actions), instant local **search** (name/college/department), **sort** menu (recent match, newest messages, unread first, online first, alphabetical), **filter** chips (unread, online, recently matched, same college, same department), empty + error states. Sort/filter persisted via `updateMatchPrefs`. Realtime: subscribe to `matches`, `messages`, `blocks`, `profiles` to update list live.
- `_authenticated/matches.$matchId.tsx` — match details: gallery (reuse `PhotoCarousel`), profile info, common interests, match date, online/last-active, actions (Open Chat, Send Note, View Full Profile → reuse `/discover/profile/:userId`, Unmatch, Block, Report). Realtime online/profile refresh.
- `_authenticated/matches.$matchId.note.tsx` — first-note composer: multiline input, live char counter + max limit, validation, loading button; if a note exists, show it read-only; on send → create message + navigate to chat target. Guards duplicate/deleted/blocked.
- `_authenticated/matches.$matchId.unmatch.tsx`, `.block.tsx`, `.report.tsx` — dedicated full-page confirm/report flows (no popups), each with consequences copy, confirmation, and rollback-safe calls.

## Phase 4 — Wiring & sync
- `DiscoverShell`: Matches tab navigates to `/matches` (remove its coming-soon branch); feed the live unread/matches count into `matchesBadge` across Home/Discover/Matches.
- Home dashboard: "Matches today" card and match-related CTAs navigate to `/matches`.
- Discovery match celebration "Send note" path already writes a real message — confirm it lands the user in the Matches/chat flow consistently.
- Root `onAuthStateChange` already invalidates queries; add match/notification query keys to realtime invalidation so counts stay synced app-wide.

## Phase 5 — Verification
- `tsgo` typecheck clean; no console/runtime errors.
- Playwright pass on `/matches` and detail/note/unmatch/block/report flows against the live preview (with the injected Supabase session), plus realtime sanity (new message updates unread badge).

## Notes / decisions
- Chat module isn't built yet; "Open Chat" targets the conversation for a match (the match *is* the 1:1 conversation). If no `/chat` route exists at build time, Open Chat routes to the note/detail surface and is chat-ready without redesign. I'll confirm the intended chat target before finalizing that link.
- `message_reads` from the spec is intentionally folded into `messages.read_at` (correct for 1:1); a separate table would add no value and I'll note this rather than build dead structure.

Approve and I'll start with the Phase 1 migration.
