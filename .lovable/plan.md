# Admin Chat Management & Moderation Module (`/admin/chats`)

## Key architectural fact
In Coligo a **chat === a match** (`chatId === matchId`). The `matches`, `messages`, and `match_admin_actions` tables already exist and already carry `conversation_disabled`, `flagged`, `suspicious`, `investigation_status`, `archived_at/by`, `deleted_at/by`, `admin_note`, plus per-message `reactions` (jsonb), `image_path`, `audio_path`, `audio_duration_ms`, `reply_to`, `kind`, `read_at`, `delivered_at`.

So this module does **not** create a parallel chat system. It adds a conversation-centric moderation surface over the existing match/message data, reusing the `/chat` design-system components in read-only mode. This mirrors the already-shipped Matches, Reports, and Users admin modules for consistency.

## What will be built
```text
/admin/chats                  -> conversation moderation dashboard (list + stats + analytics)
/admin/chats/:chatId          -> read-only conversation viewer + moderation panel
```
Both gated by the existing `admin.tsx` layout (admin-role guard + server-side `has_role` on every RPC).

---

## Phase 1 — Database & backend (one migration)
No new chat/message tables (they exist). Additions only:

1. **`messages` moderation columns** (nullable, safe defaults): `flagged boolean default false`, `hidden_at timestamptz`, `hidden_by uuid`.
2. **`chat_admin_actions`** immutable audit table: `id, chat_id (=match_id), admin_id, action, reason, previous_state jsonb, new_state jsonb, metadata jsonb, created_at`. Admin-only RLS + GRANTs + realtime.
3. **`chat_moderator_notes`** table: `id, chat_id, author_id, body, created_at, updated_at` (private, admin-only RLS, realtime, updated_at trigger).
4. **Admin-gated `SECURITY DEFINER` RPCs** (each re-checks `has_role(auth.uid(),'admin')`, raises `Forbidden`):
   - `admin_chat_stats()` — the ~15 dashboard counters (total/active/archived/locked conversations, messages today/week, images, voice notes, reactions, replies, reported, under review, avg length, avg msgs/match, active chatters, chats today).
   - `admin_list_chats(search, filters, sort, limit, offset)` — one row per conversation with participants, colleges, counts (messages/images/voice/replies/reactions), last activity, reports, status, moderation status, `total_count`.
   - `admin_chat_detail(chat_id)` — participants (both profiles), match metadata, timeline events, related reports, aggregate counts.
   - `admin_chat_messages(chat_id, before, limit)` — paginated full history (oldest→newest windowed) incl. reactions, reply refs, media/audio paths, read/delivery, sender.
   - `admin_chat_timeseries(chat_id?)` — messages/images/voice per day for analytics.
   - Moderation mutations, each writing `chat_admin_actions` + `admin_logs` transactionally: `admin_lock_chat`, `admin_unlock_chat`, `admin_archive_chat`, `admin_restore_chat`, `admin_flag_chat`, `admin_escalate_chat`, `admin_delete_chat` (soft), `admin_add_chat_note`, `admin_flag_message`.
   - Lock maps to `matches.conversation_disabled`; archive/restore/flag/investigation reuse existing match columns so state stays consistent with the Matches module.

Duplicate-action guards, integrity checks (chat exists, participants exist), and rollback are handled inside each RPC.

## Phase 2 — Server functions (`src/lib/admin-chats.functions.ts`)
Thin `createServerFn` wrappers + `queryOptions` over the RPCs, following the exact pattern in `admin-matches.functions.ts`. Private image/audio paths signed server-side via `signAdminPaths`/`resolveAdminUrl` (reusing `admin-users.server.ts`), never exposing storage keys. Module stays import-only + server-fn declarations (server-fn split rule).

## Phase 3 — Realtime (`src/lib/use-admin-chats-realtime.ts`)
Hook subscribing to `messages`, `matches`, `reports`, `chat_admin_actions`, `chat_moderator_notes` that invalidates the relevant React Query keys — mirroring `use-admin-matches-realtime.ts`. Proper `useEffect` cleanup with `removeChannel`.

## Phase 4 — Dashboard list view (`/admin/chats`)
Reuse `/ui` + admin DS only (`StatCard`, `Card`, `TopBar`, `SearchBar`, `charts.tsx`, `Badge`, `Skeleton`, empty states):
- Realtime stat cards (Phase 1 counters).
- Analytics: messages-per-day area trend, media/voice bar series, most-active-colleges donut.
- Desktop table / mobile cards: chat id, both users, match id, colleges, started, last activity, message/image/voice/reply/reaction counts, read status, reports, conversation status, moderation status.
- Debounced search; multi-filter (active/archived/locked/reported/has-media/has-voice/has-replies/has-reactions/no-messages/same-vs-different college/date range/high-low activity) with persisted state; sort options.
- Bulk actions (lock/unlock/archive/restore/flag/escalate/export CSV) via in-page confirmation modals (never popups), each requiring a reason.

## Phase 5 — Conversation viewer + moderation (`/admin/chats/:chatId`)
- **Read-only conversation** rendered with the existing `/chat` DS components (`Bubble`, `DayDivider`, `ReactionsRow`, `ReplyQuote`, `VoiceMessage`, `ImageMessage`, `ImageViewer`) — no composer, no reaction/send handlers wired. Incremental/infinite scroll via `admin_chat_messages` pagination.
- Media viewer (fullscreen `ImageViewer` with sender/date/metadata), voice-note playback, reply jump-to-original, emoji-reaction display with counts.
- Participant panel (both profiles: college, department, semester, status, verification) with links to `/admin/users/:id`, `/admin/matches/:id`, `/admin/reports`.
- Conversation timeline (match created, first note, first message, media, voice, reports, blocks, unmatch, archive).
- Related reports section.
- Moderation actions as in-page confirmation flows (lock/unlock, archive/restore, flag, escalate, soft-delete, export, add moderator note) — each captures reason, writes audit log, syncs realtime.
- Private moderator notes (timestamp, author, edit) + audit-log tab from `chat_admin_actions`.

## Phase 6 — Export
Client-side CSV + TXT export of a conversation (participants, messages, media/voice metadata, replies, reactions, timeline, moderator notes, audit history), following the CSV export approach already used in the Matches/Reports modules. PDF deferred unless required (kept export shape extensible).

## Phase 7 — Integration & verification
- Add a "Manage Chats" entry to `/admin/dashboard`.
- Typecheck (`tsgo`), then Playwright end-to-end: admin login → `/admin/chats` → open a real conversation → verify read-only render, a moderation action, and audit log entry against live Supabase data.

## Technical notes / non-goals
- Security: every RPC is `SECURITY DEFINER` + `has_role` admin check; RLS admin-only on new tables; students can never reach these routes or data. Read-only mode is enforced by not rendering any write affordance AND by RLS (admins have no user-scoped write path to messages).
- Future-ready (no redesign needed): AI moderation / toxicity / transcription / assignments / appeals slot into the RPC + `chat_admin_actions` metadata and extra nullable columns.
- Deferred (not in scope now): PDF export, keyword full-text indexing, videos/documents media types, typing history — all left as extension points.
