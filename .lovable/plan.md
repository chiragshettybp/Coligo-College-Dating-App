# Discovery & Swipe Module — Implementation Plan

Builds `/discover`, `/discover/profile/$userId`, `/discover/match/$matchId`, and `/discover/no-more-profiles` as a fully backed, realtime, mobile-first swipe experience. Every swipe, match, block, and report persists to Supabase; UI is assembled strictly from the `/ui` design system (swipe card/deck/controls/overlays + `MatchCelebration`).

## Scope confirmation
Only the four routes above plus the backend and shared swipe components they require. No Chat UI is built here — but the `messages` table and "Send Note" write are created so a match can seed the first message for the future Chat module.

---

## Phase 1 — Database foundations (migration)

New tables (all with RLS + GRANTs + timestamps):

- **swipes** — `actor_id`, `target_id`, `action` enum `swipe_action('like','pass','super')`, `created_at`. `UNIQUE(actor_id, target_id)`. Enables reciprocal checks + future Undo.
- **messages** — `match_id`→matches, `sender_id`, `body`, `read_at`, `created_at`. Seeds first note; consumed later by Chat.
- **blocks** — `blocker_id`, `blocked_id`, `created_at`, `UNIQUE(blocker_id, blocked_id)`.
- **reports** — `reporter_id`, `reported_id`, `reason`, `details`, `status` default `open`, `created_at`.

Alter existing **matches**: add `last_message_at`, add a canonical-order guard (`CHECK user_a < user_b`) + `UNIQUE(user_a, user_b)` to make duplicate matches impossible.

RLS summary (plain English):
- Swipes: a user reads and creates only their own.
- Matches: a user sees only matches they are part of; inserts happen only through the match RPC.
- Messages: only the two people in a match can read or send in it.
- Blocks/Reports: a user manages only their own rows.

## Phase 2 — Server logic (SECURITY DEFINER RPCs)

- **`discover_candidates(_limit)`** — returns eligible target ids + core card fields (name, dob→age, college, department, semester, grad year, bio). Excludes: self, non-active/`account_status`, incomplete onboarding, `discovery_enabled=false`, already-swiped, blocked either direction, reported-by-me. Enforces mutual gender/`looking_for` preference (viewer wants target AND target wants viewer; 18+). Ordered to support future ranking (shared interests / same college first).
- **`swipe_profile(_target, _action)`** — single transaction: upsert swipe; if `action` in (like,super) AND reciprocal like/super exists, create the match in canonical order (`ON CONFLICT DO NOTHING`) and return `{ matched: true, match_id }`, else `{ matched: false }`. Advisory-lock on the ordered pair to prevent race/duplicate.
- **`match_participants(_match_id)`** — returns both profiles for the celebration screen, only if caller is a participant.

## Phase 3 — Server functions (`src/lib/discover.functions.ts`)

All `createServerFn` + `requireSupabaseAuth`, RLS-scoped:
- `getDiscoveryFeed()` — calls `discover_candidates`, then batch-loads photos + interests, computes mutual interests vs. me, and signs private photo URLs with the RLS-scoped client (storage policy already allows reading active members' photos). Returns ready-to-render cards.
- `getDiscoverProfile(userId)` — full public profile + gallery + interests + mutual interests; guards deleted/blocked/private/self.
- `submitSwipe({ targetId, action })` — calls `swipe_profile`; returns match result.
- `getMatch(matchId)` — celebration data via `match_participants` + signed avatars + shared context (college/semester/interests/compatibility, seeded opener).
- `sendMatchNote({ matchId, body })` / `skipMatch({ matchId })` — insert first message or no-op; update `last_message_at`.
- `blockUser({ userId })`, `reportUser({ userId, reason, details })`.
Query option factories + query keys for cache wiring.

## Phase 4 — Shared swipe components (design-system extraction)

Promote the `/ui` showcase patterns into reusable, data-driven `src/components/ds` components (same tokens/motion, no redesign):
- `SwipeCard` — photo carousel (lazy/progressive/fallback), identity/presence badges, expandable bio, interest chips, mutual-interest badges.
- `SwipeDeck` — card stack with pointer/touch drag physics, LIKE/NOPE/SUPER overlays, mouse-drag on desktop, arrow-key shortcuts, reduced-motion fallback, prefetch of next cards.
- `SwipeControls` — Undo/Pass/Super/Like/Boost buttons wired to the same backend calls as gestures, disabled during in-flight requests to prevent duplicates.
Reuse existing `MatchCelebration`, `EmptyState`/presets, `TopBar`, `BottomSheet`.

## Phase 5 — Routes & flows (under `_authenticated/`)

- **`/discover`** — loads feed (skeletons while fetching), renders `SwipeDeck` + `SwipeControls`. Swipe/like → optimistic card exit → `submitSwipe`; on `matched` navigate to `/discover/match/$matchId`; on empty queue navigate to `/discover/no-more-profiles`. Realtime: subscribe to my new matches, to blocks targeting me (drop card instantly), and to new eligible `profiles` inserts (offer refresh). Onboarding guard inherited from `/home`-style layout loader.
- **`/discover/profile/$userId`** — full profile via shared-element expand; Like/Pass/Back preserve queue order (state via router/query cache); handles invalid/deleted/blocked/private.
- **`/discover/match/$matchId`** — `MatchCelebration`; Send Note (`sendMatchNote`) / Skip (`skipMatch`) / Open Chat (routes to future chat path, guarded). Prevents duplicate match/chat.
- **`/discover/no-more-profiles`** — friendly empty state; Retry re-runs feed; realtime auto-detects new users and offers refresh; Return Home.

## Phase 6 — Realtime, integration & verification

- Enable realtime on `matches`, `messages`, `blocks`; keep RLS so subscribers only get permitted rows.
- Wire Home/BottomNav "Discover" + "Matches" badge to real counts.
- Verify end-to-end with two seeded test profiles (via migration seed): mutual like → single match row → celebration → note persists; pass hides profile; block/report remove from feed; typecheck + lint clean; no console/runtime errors.

---

## Technical notes
- **Photos**: single private `profile-photos` bucket; the existing "members read active member photos" storage policy already lets the RLS-scoped client sign other members' gallery URLs — no service-role key needed.
- **No duplicate matches / race safety**: canonical ordering (`user_a < user_b`) + `UNIQUE` + advisory lock inside `swipe_profile`.
- **Preference matching enum mapping**: `woman→women`, `man→men`, `nonbinary/other→everyone`; match requires mutual want.
- **Extensibility**: `swipes.action` enum + candidate ordering leave room for Super Likes, Boosts, and ranking without schema redesign.
- **Age**: computed from `date_of_birth`, 18+ enforced; numeric range deferred (no range field in `settings` yet).
- **State**: TanStack Query for feed/queue with prefetch; optimistic swipe UI with rollback on failure so swipe state is never lost.

Approve and I'll implement phase by phase, starting with the migration.
