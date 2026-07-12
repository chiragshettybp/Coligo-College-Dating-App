
# Coligo — Chat Module (`/chat`) Implementation Plan

## Scope & ground rules
- Build exactly these pages: `/chat`, `/chat/:chatId`, `/chat/:chatId/media`, `/chat/:chatId/info`, `/chat/:chatId/report`. Nothing outside this list.
- `chatId` **is** the existing `matchId` (a conversation = a mutual match). No new conversation table.
- Every screen is real Supabase data via authenticated TanStack server functions — no mock/placeholder/fake realtime.
- All chat visuals come from the `/ui` page components. Today those live **inline in `src/routes/ui.tsx`**, so they are not importable. Phase 0 extracts them verbatim into a shared file; `/ui` then imports from that file (single source of truth preserved, zero visual change).

## Current state (verified)
- `matches.functions.ts` already has `getConversation`, `sendMessage`, `markConversationRead`, `getMatchDetail`, `unmatch`, prefs, plus signed-URL helpers.
- A working thread exists at `/matches/$matchId/chat` — its logic is reused/moved, not duplicated.
- `messages` columns: `id, match_id, sender_id, body, read_at, created_at`. No image or reply columns yet.
- `notify_on_message` / `notify_on_match` triggers already generate notifications. `reports` and `blocks` tables exist. Photos bucket `profile-photos` is private.

---

## Phase 0 — Extract `/ui` chat components (no behavior change)
Create `src/components/ds/chat.tsx` and move these from `ui.tsx` verbatim: `Bubble`, `MetaRow`, `Ticks`, `bubbleRadii`, `DayDivider`, `ChatHeader`, `TypingBubble`, `VoiceMessage`, `ImageMessage`, `Composer`/`ComposerAction`, plus the `GroupPos`/`MsgState` types. Generalize props so they accept real data (text, time, state, avatar, image URL, onSend, value, disabled, onAttach) while keeping identical markup/styles. Update `ui.tsx` to import them so the `/ui` showcase is unchanged.

## Phase 1 — Database & storage (one migration)
- `ALTER TABLE public.messages ADD COLUMN image_path text, ADD COLUMN reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL, ADD COLUMN kind text NOT NULL DEFAULT 'text';` (kind ∈ text/image — future-proof for voice/video).
- Index: `messages(match_id, created_at)` and `messages(reply_to)`.
- Create private storage bucket `chat-media` (via storage tool) with RLS on `storage.objects`: a user may read/insert an object only if its path prefix is a `matchId` they participate in (active match, not blocked). Enforced with a `SECURITY DEFINER` helper `public.is_chat_participant(_match_id uuid)`.
- Add RPC `mark_read(_match_id uuid)` and keep existing message RLS (participants only, active match, not blocked).
- Ensure realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages, public.matches, public.blocks;` (skip if already present).
- Grants per standard (authenticated + service_role) for any new objects.

## Phase 2 — Server functions (`src/lib/chat.functions.ts`)
Authenticated (`requireSupabaseAuth`), RLS-scoped, plain-DTO returns:
- `getChatList()` — reuse `my_matches` RPC → conversation rows (photo signed, last message, unread, other profile). Ordered by last activity.
- `getConversation({chatId, before?, limit})` — paginated (keyset on `created_at`) ascending window for infinite scroll; joins `reply_to` preview; signs `image_path`.
- `sendMessage({chatId, body?, imagePath?, replyTo?})` — validates ownership/active-match/not-blocked, length (`MESSAGE_MAX=2000`), inserts, returns row. (Trigger creates notification.)
- `createChatImageUpload({chatId, ext})` — returns a signed upload URL / path in `chat-media/<chatId>/...`.
- `markConversationRead({chatId})`, `getChatInfo({chatId})` (profile + match date + shared media count), `getSharedMedia({chatId, before?})`, `reportUser`, `blockUser`, `unmatch` (reuse existing where present).
Add matching `queryOptions` factories. Register nothing new in `start.ts` (bearer middleware already wired).

## Phase 3 — Conversation list `/chat` (`_authenticated/chat.index.tsx`)
- Layout route `chat.tsx` renders `<Outlet/>`; `chat.index.tsx` is the inbox.
- Uses `DiscoverShell` + the extracted list/card styling. Shows photo, name, last message, timestamp, unread badge, online dot, live typing indicator.
- Instant client search over name/college/department/last message. Empty-search, no-results, and skeleton states.
- Realtime: subscribe to `messages` INSERT/UPDATE, `matches`, `blocks`, presence set; invalidate list queries. Presence via existing `use-presence-set`.

## Phase 4 — Conversation screen `/chat/:chatId`
- `ChatHeader` (real avatar, name, live presence, back). Message list built from `Bubble`/`ImageMessage`/`DayDivider`/`TypingBubble` with grouping, day separators, unread separator, read receipts (`read_at`), timestamps.
- `Composer` wired: controlled input, auto-resize, char validation, draft persistence (localStorage per chat), send button state, image attach.
- Optimistic send with sending→sent→read states and retry on failure; never lose draft.
- Realtime message stream + typing broadcast (channel `chat:<id>`, ephemeral, expires on inactivity) + presence. Auto-scroll to newest; preserve scroll on older-page load (infinite scroll upward via `before` cursor). Mark read on view; broadcast read.
- Image send: pick → validate type/size → upload to `chat-media` with progress → insert image message → render preview; tap opens fullscreen viewer (reuse `/ui` shared-element viewer). Reply: select message → composer reply preview → send with `reply_to`; tap preview scrolls to original.

## Phase 5 — Info / Media / Report / Unmatch / Block
- `/chat/:chatId/info`: profile pic, name, college, department, match date, shared-media count; buttons View Media, View Profile, Block, Report, Unmatch.
- `/chat/:chatId/media`: responsive lazy grid of shared images, paginated, realtime, fullscreen viewer.
- `/chat/:chatId/report`: dedicated page (no popup) — reason select + optional details, duplicate-report guard, confirmation.
- Unmatch & Block: dedicated confirmation pages (reuse existing `matches.$matchId.unmatch`/`.block` flows) — archive match, remove match/discovery eligibility, block prevents messaging; realtime updates propagate to `/chat`, `/matches`, Discovery.

## Phase 6 — Cross-module sync, navigation, a11y, verification
- Wire chat into bottom nav / matches so unread counts, previews, typing, presence, receipts stay in sync with Matches. First note from Matches remains the first message (already works via shared `messages`).
- Navigation: deep links, back, refresh recovery, scroll restoration, auth guard (under `_authenticated`).
- Accessibility: semantic roles, ARIA labels, focus states, reduced motion, keyboard send, accessible viewer/forms.
- Verify: `tsgo` typecheck, security scan on new RLS/bucket, and a Playwright pass on the live preview for send/receive, read receipts, image upload, report, unmatch.

---

## Technical notes
- Server layer = `createServerFn` only (no edge functions). Admin client not needed; all reads/writes run as the user under RLS.
- Signed URLs (1h TTL) for all private media, matching existing pattern.
- Typing & presence are realtime-broadcast only, never persisted.
- No schema change stores secrets; migration adds columns + one bucket + helper function + realtime publication entries.

## Out of scope (explicitly not built now)
Voice/video messages, calling, reactions, edit/delete, disappearing/pinned messages, stickers/GIFs, translation, push device tokens — data model left extensible but no UI/logic added.
